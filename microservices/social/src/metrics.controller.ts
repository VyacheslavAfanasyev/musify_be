import { Controller, Get, Header } from "@nestjs/common";
import { PrometheusService } from "@app/shared";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4")
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}
