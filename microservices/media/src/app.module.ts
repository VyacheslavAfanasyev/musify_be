import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { MediaModule } from "./media.module";
import { MediaController } from "./media.controller";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";

@Module({
  imports: [MediaModule, TerminusModule],
  controllers: [MediaController, HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class AppModule {}
