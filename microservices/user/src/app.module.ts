import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { UsersModule } from "./users.module";
import { UserController } from "./user.controller";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";

@Module({
  imports: [UsersModule, TerminusModule],
  controllers: [UserController, HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class AppModule {}
