import { LoggerService, Logger } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';

/**
 * Структурированное логирование с поддержкой trace ID
 * Логи выводятся в формате JSON для удобной интеграции с Loki
 */
export class StructuredLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: any, ...optionalParams: any[]): string {
    const activeContext = trace.getActiveSpan()?.spanContext();
    const traceId = activeContext?.traceId || 'no-trace';
    const spanId = activeContext?.spanId || 'no-span';

    const logEntry: any = {
      timestamp: new Date().toISOString(),
      level,
      service: process.env.SERVICE_NAME || 'unknown',
      context: this.context || 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      traceId,
      spanId,
    };

    // Добавляем дополнительные параметры
    if (optionalParams.length > 0) {
      logEntry.metadata = optionalParams.map((param) =>
        typeof param === 'object' ? param : { value: param },
      );
    }

    return JSON.stringify(logEntry);
  }

  log(message: any, ...optionalParams: any[]): void {
    console.log(this.formatMessage('log', message, ...optionalParams));
  }

  error(message: any, trace?: string, context?: string): void {
    const errorEntry = this.formatMessage('error', message);
    if (trace) {
      const parsed = JSON.parse(errorEntry);
      parsed.stack = trace;
      console.error(JSON.stringify(parsed));
    } else {
      console.error(errorEntry);
    }
  }

  warn(message: any, ...optionalParams: any[]): void {
    console.warn(this.formatMessage('warn', message, ...optionalParams));
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, ...optionalParams));
    }
  }

  verbose(message: any, ...optionalParams: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('verbose', message, ...optionalParams));
    }
  }

  setContext(context: string): void {
    this.context = context;
  }
}

/**
 * Создает структурированный логгер для использования в сервисах
 */
export function createStructuredLogger(context?: string): LoggerService {
  return new StructuredLogger(context);
}

