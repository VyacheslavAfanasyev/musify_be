import { NestFactory } from "@nestjs/core";
import { AuthModule } from "./auth.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { initializeTracing } from "@app/shared";

// Инициализируем трейсинг ДО создания приложения
const sdk = initializeTracing("auth");
sdk.start();

async function bootstrap() {
  // Создаем гибридное приложение: HTTP для health checks + RabbitMQ для микросервисов
  const rabbitmqUrl =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  const queue = process.env.AUTH_QUEUE || "auth_queue";
  const port = parseInt(process.env.PORT || "3001", 10);

  const app = await NestFactory.create(AuthModule);

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
  console.log(`Auth Service is listening on HTTP port ${port}`);

  // Запускаем микросервис
  await app.startAllMicroservices();
  console.log(`Auth Service is listening on RabbitMQ queue: ${queue}`);
}

// Обработка завершения приложения
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.log("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

void bootstrap();
