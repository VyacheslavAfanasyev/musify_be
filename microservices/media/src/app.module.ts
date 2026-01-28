import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { MediaModule } from "./media.module";
import { MediaController } from "./media.controller";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";
import { PrometheusService } from "@app/shared";

@Module({
  imports: [MediaModule, TerminusModule],
  controllers: [MediaController, HealthController, MetricsController],
  providers: [
    RabbitMQHealthIndicator,
    {
      provide: PrometheusService,
      useFactory: () => {
        return new PrometheusService(process.env.SERVICE_NAME || "media");
      },
    },
  ],
})
export class AppModule {}
