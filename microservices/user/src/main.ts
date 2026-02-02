import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { initializeTracing, ServiceDiscoveryService } from "@app/shared";

// Инициализируем трейсинг ДО создания приложения
const sdk = initializeTracing("user");
sdk.start();

let serviceDiscovery: ServiceDiscoveryService | null = null;

async function bootstrap() {
  // Создаем гибридное приложение: HTTP для health checks + RabbitMQ для микросервисов
  const rabbitmqUrl =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  const queue = process.env.USER_QUEUE || "user_queue";
  const port = parseInt(process.env.PORT || "3002", 10);

  const app = await NestFactory.create(AppModule);

  // Подключаем RabbitMQ микросервис
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue,
      queueOptions: {
        durable: true,
      },
    },
  });

  // Запускаем HTTP сервер для health checks
  await app.listen(port);
  console.log(`User Service is listening on HTTP port ${port}`);

  // Запускаем микросервис
  await app.startAllMicroservices();
  console.log(`User Service is listening on RabbitMQ queue: ${queue}`);

  // Регистрация в Service Discovery (Consul)
  const consulHost = process.env.CONSUL_HOST || "consul";
  const consulPort = parseInt(process.env.CONSUL_PORT || "8500", 10);
  const serviceName = process.env.SERVICE_NAME || "user";
  const serviceAddress = process.env.SERVICE_ADDRESS || "localhost";
  const serviceId = `${serviceName}-${Date.now()}`;

  try {
    serviceDiscovery = new ServiceDiscoveryService(consulHost, consulPort);
    await serviceDiscovery.registerService({
      id: serviceId,
      name: serviceName,
      address: serviceAddress,
      port: port,
      tags: ["user", "microservice", "rabbitmq"],
      check: {
        http: `http://${serviceAddress}:${port}/health`,
        interval: "10s",
        timeout: "5s",
        deregisterCriticalServiceAfter: "30s",
      },
    });
    console.log(`Service registered in Consul: ${serviceName} (${serviceId})`);
  } catch (error) {
    console.warn(`Failed to register service in Consul: ${error.message}`);
    console.warn("Continuing without Service Discovery...");
  }
}

// Обработка завершения приложения
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");

  if (serviceDiscovery) {
    try {
      await serviceDiscovery.deregisterCurrentService();
      console.log("Service deregistered from Consul");
    } catch (error) {
      console.error(`Error deregistering service: ${error.message}`);
    }
  }

  try {
    await sdk.shutdown();
    console.log("Tracing terminated");
  } catch (error) {
    console.log("Error terminating tracing", error);
  }

  process.exit(0);
}

process.on("SIGTERM", () => {
  void gracefulShutdown();
});
process.on("SIGINT", () => {
  void gracefulShutdown();
});

void bootstrap();
