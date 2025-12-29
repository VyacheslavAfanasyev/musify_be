import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Создаем микросервис с RabbitMQ транспортом
  const rabbitmqUrl =
    process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  const queue = process.env.AUTH_QUEUE || 'auth_queue';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await app.listen();
  console.log(`Auth service is listening on RabbitMQ queue: ${queue}`);
}
void bootstrap();
