import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTracing, ServiceDiscoveryService } from '@app/shared';

const sdk = initializeTracing('api-gateway');
sdk.start();

let serviceDiscovery: ServiceDiscoveryService | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Настройка для правильного определения IP за прокси/nginx
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`API Gateway is listening on port ${port}`);

  // Регистрация в Service Discovery (Consul)
  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = parseInt(process.env.CONSUL_PORT || '8500', 10);
  const serviceName = process.env.SERVICE_NAME || 'api-gateway';
  const serviceAddress = process.env.SERVICE_ADDRESS || 'localhost';
  const serviceId = `${serviceName}-${Date.now()}`;

  try {
    serviceDiscovery = new ServiceDiscoveryService(consulHost, consulPort);
    await serviceDiscovery.registerService({
      id: serviceId,
      name: serviceName,
      address: serviceAddress,
      port: port,
      tags: ['gateway', 'http'],
      check: {
        http: `http://${serviceAddress}:${port}/health`,
        interval: '10s',
        timeout: '5s',
        deregisterCriticalServiceAfter: '30s',
      },
    });
    console.log(`Service registered in Consul: ${serviceName} (${serviceId})`);
  } catch (error) {
    console.warn(`Failed to register service in Consul: ${error.message}`);
    console.warn('Continuing without Service Discovery...');
  }
}

// Обработка завершения приложения
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');

  if (serviceDiscovery) {
    try {
      await serviceDiscovery.deregisterCurrentService();
      console.log('Service deregistered from Consul');
    } catch (error) {
      console.error(`Error deregistering service: ${error.message}`);
    }
  }

  try {
    await sdk.shutdown();
    console.log('Tracing terminated');
  } catch (error) {
    console.log('Error terminating tracing', error);
  }

  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown();
});
process.on('SIGINT', () => {
  void gracefulShutdown();
});

void bootstrap();
