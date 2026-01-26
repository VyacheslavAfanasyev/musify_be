import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { ClientProxy } from '@nestjs/microservices';
import {
  firstValueFrom,
  Observable,
  timeout,
  catchError,
  throwError,
} from 'rxjs';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  enabled?: boolean;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Создает или возвращает существующий Circuit Breaker для сервиса и команды
   */
  private getOrCreateCircuitBreaker(
    serviceName: string,
    cmd: string,
    client: ClientProxy,
    options: CircuitBreakerOptions = {},
  ): CircuitBreaker {
    // Используем комбинацию serviceName:cmd как ключ для уникальности
    const key = `${serviceName}:${cmd}`;

    if (this.circuitBreakers.has(key)) {
      return this.circuitBreakers.get(key);
    }

    const defaultOptions: CircuitBreakerOptions = {
      timeout: options.timeout || 10000, // 10 секунд по умолчанию
      errorThresholdPercentage: options.errorThresholdPercentage || 50, // 50% ошибок
      resetTimeout: options.resetTimeout || 30000, // 30 секунд до попытки восстановления
      enabled: options.enabled !== false,
    };

    // CircuitBreaker создается с функцией, которая принимает payload как параметр
    const circuitBreaker = new CircuitBreaker(
      async (payload: any): Promise<any> => {
        this.logger.debug(
          `Отправка запроса к ${serviceName}:${cmd} с payload: ${JSON.stringify(payload)}`,
        );
        const observable = client.send<any, any>(
          { cmd },
          payload,
        ) as unknown as Observable<any>;

        return await firstValueFrom(
          observable.pipe(
            timeout(defaultOptions.timeout || 10000),
            catchError((error) => {
              this.logger.error(
                `Ошибка при запросе к ${serviceName}:${cmd}: ${error.message}`,
              );
              if (error.name === 'TimeoutError') {
                return throwError(
                  () => new Error(`${serviceName} timeout: ${cmd}`),
                );
              }
              return throwError(() => error);
            }),
          ),
        );
      },
      {
        timeout: defaultOptions.timeout,
        errorThresholdPercentage: defaultOptions.errorThresholdPercentage,
        resetTimeout: defaultOptions.resetTimeout,
        enabled: defaultOptions.enabled,
      },
    );

    // Логирование событий Circuit Breaker
    circuitBreaker.on('open', () => {
      this.logger.warn(
        `Circuit Breaker для ${serviceName}:${cmd} открыт (сервис недоступен)`,
      );
    });

    circuitBreaker.on('halfOpen', () => {
      this.logger.log(
        `Circuit Breaker для ${serviceName}:${cmd} в состоянии half-open (попытка восстановления)`,
      );
    });

    circuitBreaker.on('close', () => {
      this.logger.log(
        `Circuit Breaker для ${serviceName}:${cmd} закрыт (сервис работает нормально)`,
      );
    });

    circuitBreaker.on('failure', (error: Error) => {
      this.logger.error(
        `Circuit Breaker для ${serviceName}:${cmd} - ошибка: ${error.message}`,
      );
    });

    this.circuitBreakers.set(key, circuitBreaker);
    return circuitBreaker;
  }

  /**
   * Выполняет запрос к сервису через Circuit Breaker
   */
  async executeWithCircuitBreaker<TResponse, TInput = unknown>(
    serviceName: string,
    client: ClientProxy,
    cmd: string,
    payload: TInput,
    options: CircuitBreakerOptions = {},
    fallback?: () => Promise<TResponse> | TResponse,
  ): Promise<TResponse> {
    // Получаем или создаем CircuitBreaker для этой комбинации service+cmd
    const circuitBreaker = this.getOrCreateCircuitBreaker(
      serviceName,
      cmd,
      client,
      options,
    );

    try {
      // Если есть fallback, устанавливаем его для этого CircuitBreaker
      if (fallback) {
        circuitBreaker.fallback(fallback);
      }

      // Вызываем fire() с payload как аргументом
      const result = await circuitBreaker.fire(payload);
      return result as TResponse;
    } catch (error) {
      // Если Circuit Breaker открыт и есть fallback, используем его
      const status = (circuitBreaker.status as unknown as string) || '';
      if (status === 'open' && fallback) {
        this.logger.warn(
          `Circuit Breaker для ${serviceName}:${cmd} открыт, используется fallback`,
        );
        try {
          return await Promise.resolve(fallback());
        } catch (fallbackError) {
          this.logger.error(
            `Fallback для ${serviceName}:${cmd} также завершился ошибкой`,
          );
          throw fallbackError;
        }
      }

      // Если fallback не был вызван автоматически, пробрасываем ошибку
      throw error;
    }
  }

  /**
   * Получает состояние Circuit Breaker для сервиса и команды
   */
  getCircuitBreakerState(
    serviceName: string,
    cmd?: string,
  ): {
    enabled: boolean;
    state: string;
    failures: number;
    fires: number;
    cacheHits: number;
    cacheMisses: number;
  } | null {
    const key = cmd ? `${serviceName}:${cmd}` : serviceName;
    const circuitBreaker = this.circuitBreakers.get(key);
    if (!circuitBreaker) {
      return null;
    }

    const status = (circuitBreaker.status as unknown as string) || '';

    return {
      enabled: circuitBreaker.enabled,
      state: status,
      failures: circuitBreaker.stats.failures,
      fires: circuitBreaker.stats.fires,
      cacheHits: circuitBreaker.stats.cacheHits,
      cacheMisses: circuitBreaker.stats.cacheMisses,
    };
  }

  /**
   * Получает состояние всех Circuit Breakers
   */
  getAllCircuitBreakerStates(): Record<
    string,
    {
      enabled: boolean;
      state: string;
      failures: number;
      fires: number;
      cacheHits: number;
      cacheMisses: number;
    }
  > {
    const states: Record<string, any> = {};
    for (const [key, circuitBreaker] of this.circuitBreakers) {
      const status = (circuitBreaker.status as unknown as string) || '';

      states[key] = {
        enabled: circuitBreaker.enabled,
        state: status,
        failures: circuitBreaker.stats.failures,
        fires: circuitBreaker.stats.fires,
        cacheHits: circuitBreaker.stats.cacheHits,
        cacheMisses: circuitBreaker.stats.cacheMisses,
      };
    }
    return states;
  }
}
