import Consul = require('consul');
import { StructuredLogger } from './logger';

export interface ServiceRegistration {
  id: string;
  name: string;
  address: string;
  port: number;
  tags?: string[];
  check?: {
    http?: string;
    interval?: string;
    timeout?: string;
    deregisterCriticalServiceAfter?: string;
  };
}

export interface ServiceInfo {
  ID: string;
  Service: string;
  Tags: string[];
  Address: string;
  Port: number;
  Meta: Record<string, string>;
}

export class ServiceDiscoveryService {
  private consul: Consul;
  private logger: StructuredLogger;
  private serviceId: string | null = null;
  private registeredServices: Map<string, ServiceInfo[]> = new Map();

  constructor(consulHost: string = 'localhost', consulPort: number = 8500) {
    this.consul = new Consul({
      host: consulHost,
      port: consulPort,
      promisify: true,
    } as any);
    this.logger = new StructuredLogger('ServiceDiscovery');
  }

  /**
   * Регистрирует сервис в Consul
   */
  async registerService(registration: ServiceRegistration): Promise<void> {
    try {
      // @ts-ignore - RegisterOptions type may not match exactly but works at runtime
      await this.consul.agent.service.register({
        id: registration.id,
        name: registration.name,
        address: registration.address,
        port: registration.port,
        tags: registration.tags || [],
        check: registration.check ? {
          http: registration.check.http,
          interval: registration.check.interval,
          ttl: registration.check.timeout,
          notes: registration.check.deregisterCriticalServiceAfter,
        } : {
          http: `http://${registration.address}:${registration.port}/health`,
          interval: '10s',
        },
      });

      this.serviceId = registration.id;
      this.logger.log(
        `Service registered: ${registration.name} (${registration.id}) at ${registration.address}:${registration.port}`,
      );
    } catch (error) {
      this.logger.error(`Failed to register service: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Дерегистрирует сервис из Consul
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.logger.log(`Service deregistered: ${serviceId}`);
      if (this.serviceId === serviceId) {
        this.serviceId = null;
      }
    } catch (error) {
      this.logger.error(`Failed to deregister service: ${error.message}`, error.stack);
    }
  }

  /**
   * Дерегистрирует текущий сервис
   */
  async deregisterCurrentService(): Promise<void> {
    if (this.serviceId) {
      await this.deregisterService(this.serviceId);
    }
  }

  /**
   * Находит здоровые инстансы сервиса
   */
  async discoverService(serviceName: string, passing: boolean = true): Promise<ServiceInfo[]> {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: passing,
      });

      const serviceInfos: ServiceInfo[] = services.map((entry: any) => ({
        ID: entry.Service.ID,
        Service: entry.Service.Service,
        Tags: entry.Service.Tags || [],
        Address: entry.Service.Address,
        Port: entry.Service.Port,
        Meta: entry.Service.Meta || {},
      }));

      // Кэшируем результат
      this.registeredServices.set(serviceName, serviceInfos);

      if (serviceInfos.length === 0) {
        this.logger.warn(`No healthy instances found for service: ${serviceName}`);
      } else {
        this.logger.log(
          `Found ${serviceInfos.length} healthy instance(s) for service: ${serviceName}`,
        );
      }

      return serviceInfos;
    } catch (error) {
      this.logger.error(`Failed to discover service ${serviceName}: ${error.message}`, error.stack);
      
      // Возвращаем кэшированные данные, если есть
      const cached = this.registeredServices.get(serviceName);
      if (cached && cached.length > 0) {
        this.logger.warn(`Using cached service info for ${serviceName}`);
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Получает адрес первого здорового инстанса сервиса
   */
  async getServiceAddress(serviceName: string): Promise<string | null> {
    const services = await this.discoverService(serviceName);
    if (services.length === 0) {
      return null;
    }

    // Используем round-robin для балансировки
    const service = services[Math.floor(Math.random() * services.length)];
    return `${service.Address}:${service.Port}`;
  }

  /**
   * Получает URL для HTTP запросов к сервису
   */
  async getServiceUrl(serviceName: string, protocol: 'http' | 'https' = 'http'): Promise<string | null> {
    const address = await this.getServiceAddress(serviceName);
    if (!address) {
      return null;
    }
    return `${protocol}://${address}`;
  }

  /**
   * Получает RabbitMQ URL для сервиса (если сервис использует RabbitMQ)
   */
  async getRabbitMQUrl(serviceName: string): Promise<string> {
    // Для RabbitMQ мы используем имя очереди, а не Service Discovery
    // Но можем использовать Consul для получения адреса RabbitMQ сервера
    const rabbitmqService = await this.discoverService('rabbitmq');
    if (rabbitmqService.length > 0) {
      const service = rabbitmqService[0];
      return `amqp://guest:guest@${service.Address}:${service.Port}`;
    }
    
    // Fallback на переменную окружения
    return process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  }

  /**
   * Получает все зарегистрированные сервисы
   */
  async getAllServices(): Promise<string[]> {
    try {
      const services = await this.consul.agent.service.list();
      return Object.keys(services);
    } catch (error) {
      this.logger.error(`Failed to get all services: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Проверяет доступность Consul
   */
  async healthCheck(): Promise<boolean> {
    try {
      const leader = await this.consul.status.leader();
      return leader !== null && leader !== '';
    } catch (error) {
      this.logger.error(`Consul health check failed: ${error.message}`, error.stack);
      return false;
    }
  }
}

