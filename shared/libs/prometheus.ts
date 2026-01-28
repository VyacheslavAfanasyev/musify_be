import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
} from 'prom-client';

/**
 * Prometheus метрики для мониторинга микросервисов
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly register: Registry;
  private readonly serviceName: string;

  // HTTP метрики
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestErrors: Counter<string>;

  // Circuit Breaker метрики
  public readonly circuitBreakerState: Gauge<string>;

  // Saga метрики
  public readonly sagaDuration: Histogram<string>;
  public readonly sagaTotal: Counter<string>;
  public readonly sagaErrors: Counter<string>;

  // Бизнес метрики
  public readonly userRegistrations: Counter<string>;
  public readonly userLogins: Counter<string>;
  public readonly fileUploads: Counter<string>;
  public readonly followsCreated: Counter<string>;

  constructor(serviceName: string = 'unknown') {
    this.serviceName = serviceName;
    this.register = new Registry();

    // HTTP метрики
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'service'],
      registers: [this.register],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status', 'service', 'error_type'],
      registers: [this.register],
    });

    // Circuit Breaker метрики
    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['service', 'target_service', 'command'],
      registers: [this.register],
    });

    // Saga метрики
    this.sagaDuration = new Histogram({
      name: 'saga_duration_seconds',
      help: 'Duration of saga execution in seconds',
      labelNames: ['saga_type', 'status', 'service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    this.sagaTotal = new Counter({
      name: 'saga_total',
      help: 'Total number of sagas',
      labelNames: ['saga_type', 'status', 'service'],
      registers: [this.register],
    });

    this.sagaErrors = new Counter({
      name: 'saga_errors_total',
      help: 'Total number of saga errors',
      labelNames: ['saga_type', 'error_type', 'service'],
      registers: [this.register],
    });

    // Бизнес метрики
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.fileUploads = new Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['service', 'file_type'],
      registers: [this.register],
    });

    this.followsCreated = new Counter({
      name: 'follows_created_total',
      help: 'Total number of follows created',
      labelNames: ['service'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Регистрируем метрики по умолчанию
    this.register.setDefaultLabels({ service: this.serviceName });
  }

  /**
   * Получить метрики в формате Prometheus
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Получить регистр метрик
   */
  getRegister(): Registry {
    return this.register;
  }
}

