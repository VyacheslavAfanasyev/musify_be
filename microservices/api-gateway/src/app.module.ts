import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
          const queue = process.env.AUTH_QUEUE || 'auth_queue';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
      {
        name: 'USER_SERVICE',
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
          const queue = process.env.USER_QUEUE || 'user_queue';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
