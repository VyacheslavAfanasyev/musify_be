import { Controller, Get } from "@nestjs/common";
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection } from "typeorm";
import { RedisTokenService } from "./redis-token.service";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private rabbitmq: RabbitMQHealthIndicator,
    @InjectConnection()
    private connection: Connection,
    private redisService: RedisTokenService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Проверка PostgreSQL
      () =>
        this.db.pingCheck("postgres", {
          connection: this.connection,
        }),
      // Проверка Redis через ping
      async () => {
        try {
          const isHealthy = await this.redisService.ping();
          if (isHealthy) {
            return {
              redis: {
                status: "up",
              },
            };
          }
          throw new Error("Redis ping failed");
        } catch (error) {
          return {
            redis: {
              status: "down",
              message: error.message,
            },
          };
        }
      },
      // Проверка RabbitMQ
      () => this.rabbitmq.isHealthy("rabbitmq"),
      // Проверка памяти
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024), // 300MB
    ]);
  }
}
