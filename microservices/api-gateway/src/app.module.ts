import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';
import { HealthController } from './health.controller';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Module({
  imports: [
    TerminusModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 минута
        limit: 10, // 10 запросов в минуту по умолчанию
      },
    ]),
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
              socketOptions: {
                heartbeatIntervalInSeconds: 60,
                reconnectTimeInSeconds: 5,
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
              socketOptions: {
                heartbeatIntervalInSeconds: 60,
                reconnectTimeInSeconds: 5,
              },
            },
          };
        },
      },
      {
        name: 'MEDIA_SERVICE',
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
          const queue = process.env.MEDIA_QUEUE || 'media_queue';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
              socketOptions: {
                heartbeatIntervalInSeconds: 60,
                reconnectTimeInSeconds: 5,
              },
            },
          };
        },
      },
      {
        name: 'SOCIAL_SERVICE',
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
          const queue = process.env.SOCIAL_QUEUE || 'social_queue';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitmqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
              socketOptions: {
                heartbeatIntervalInSeconds: 60,
                reconnectTimeInSeconds: 5,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    CircuitBreakerService,
    RabbitMQHealthIndicator,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
