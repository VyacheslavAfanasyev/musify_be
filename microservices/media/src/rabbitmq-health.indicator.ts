import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import * as amqp from "amqplib";

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const rabbitmqUrl =
      process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

    try {
      const connection = await amqp.connect(rabbitmqUrl);
      await connection.close();

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        "RabbitMQ health check failed",
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
