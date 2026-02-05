import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { SocialModule } from "./social.module";
import { SocialController } from "./social.controller";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";
import { PrometheusService } from "@app/shared";

@Module({
  imports: [SocialModule, TerminusModule],
  controllers: [SocialController, HealthController, MetricsController],
  providers: [
    RabbitMQHealthIndicator,
    {
      provide: PrometheusService,
      useFactory: () => {
        return new PrometheusService(process.env.SERVICE_NAME || "social");
      },
    },
  ],
})
export class AppModule {}
