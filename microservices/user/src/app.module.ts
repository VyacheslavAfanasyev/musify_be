import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { UsersModule } from "./users.module";
import { UserController } from "./user.controller";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";
import { PrometheusService } from "@app/shared";

@Module({
  imports: [UsersModule, TerminusModule],
  controllers: [UserController, HealthController, MetricsController],
  providers: [
    RabbitMQHealthIndicator,
    {
      provide: PrometheusService,
      useFactory: () => {
        return new PrometheusService(process.env.SERVICE_NAME || "user");
      },
    },
  ],
})
export class AppModule {}
