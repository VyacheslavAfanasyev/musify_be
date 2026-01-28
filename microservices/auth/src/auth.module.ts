import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { TerminusModule } from "@nestjs/terminus";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisTokenService } from "./redis-token.service";
import { SagaService } from "./saga.service";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";
import { AuthUser, PrometheusService } from "@app/shared";

@Module({
  imports: [
    TerminusModule,
    // Подключение к PostgreSQL для Auth Service
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ||
        "postgresql://auth_user:secret@localhost:5432/auth_db",
      entities: [AuthUser],
      synchronize: process.env.NODE_ENV !== "production",
      logging: process.env.NODE_ENV === "development",
    }),
    TypeOrmModule.forFeature([AuthUser]),
    // Клиенты для отправки событий в другие сервисы
    ClientsModule.registerAsync([
      {
        name: "USER_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.USER_QUEUE || "user_queue";

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
        name: "MEDIA_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.MEDIA_QUEUE || "media_queue";

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
        name: "SOCIAL_SERVICE",
        useFactory: () => {
          const rabbitmqUrl =
            process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
          const queue = process.env.SOCIAL_QUEUE || "social_queue";

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
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      signOptions: {
        expiresIn: "15m",
      },
    }),
  ],
  controllers: [AuthController, HealthController, MetricsController],
  providers: [
    AuthService,
    RedisTokenService,
    SagaService,
    RabbitMQHealthIndicator,
    {
      provide: PrometheusService,
      useFactory: () => {
        return new PrometheusService(process.env.SERVICE_NAME || "auth");
      },
    },
  ],
})
export class AuthModule {}
