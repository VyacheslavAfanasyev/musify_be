import { Module } from "@nestjs/common";
import { SocialModule } from "./social.module";
import { SocialController } from "./social.controller";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";

@Module({
  imports: [SocialModule],
  controllers: [SocialController, HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class AppModule {}
