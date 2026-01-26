import { Controller, Get, Inject } from "@nestjs/common";
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { RabbitMQHealthIndicator } from "./rabbitmq-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private rabbitmq: RabbitMQHealthIndicator,
    @InjectConnection()
    private connection: Connection,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Проверка MongoDB
      () =>
        this.mongoose.pingCheck("mongodb", {
          connection: this.connection,
        }),
      // Проверка Redis через cache-manager
      async () => {
        try {
          await this.cacheManager.get("health-check");
          return {
            redis: {
              status: "up",
            },
          };
        } catch (error) {
          // Если get не работает, пробуем set
          try {
            await this.cacheManager.set("health-check", "ok", 1000);
            await this.cacheManager.del("health-check");
            return {
              redis: {
                status: "up",
              },
            };
          } catch (setError) {
            return {
              redis: {
                status: "down",
                message: setError.message || error.message,
              },
            };
          }
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
