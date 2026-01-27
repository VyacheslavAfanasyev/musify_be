import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";

/**
 * Инициализирует OpenTelemetry для сервиса
 * @param serviceName - Имя сервиса (например, 'api-gateway', 'auth', 'user')
 */
export function initializeTracing(serviceName: string): NodeSDK {
  const jaegerEndpoint =
    process.env.JAEGER_ENDPOINT || "http://localhost:14268/api/traces";
  const jaegerAgentHost = process.env.JAEGER_AGENT_HOST || "localhost";
  const jaegerAgentPort = parseInt(process.env.JAEGER_AGENT_PORT || "6831", 10);

  const jaegerExporter = new JaegerExporter({
    endpoint: jaegerEndpoint,
    // Используем UDP агент для лучшей производительности
    host: jaegerAgentHost,
    port: jaegerAgentPort,
  });

  const sdk = new NodeSDK({
    // OpenTelemetry JS v2: Resource is no longer constructed via `new Resource(...)`
    // (it may be a type-only export). Use the factory helper instead.
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
    }),
    traceExporter: jaegerExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Отключаем некоторые инструментации, которые могут конфликтовать
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  return sdk;
}
