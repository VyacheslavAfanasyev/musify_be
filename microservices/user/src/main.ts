import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

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
}
void bootstrap();
