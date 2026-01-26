import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private rabbitmq: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Проверка RabbitMQ
      () => this.rabbitmq.isHealthy('rabbitmq'),
      // Проверка памяти
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
      () => this.memory.checkRSS('memory_rss', 400 * 1024 * 1024), // 400MB
    ]);
  }
}
