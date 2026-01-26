import { Injectable, Inject, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { v4 as uuidv4 } from "uuid";
import { ISagaStep, SagaType, SagaStatus, SagaStepStatus } from "@app/shared";
import type { ISaga } from "@app/shared/types/saga";

/**
 * Saga Service для управления компенсирующими транзакциями
 * Реализует паттерн Saga для обеспечения согласованности данных между сервисами
 */
@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);
  private readonly sagas: Map<string, ISaga> = new Map();

  constructor(
    @Inject("USER_SERVICE") private readonly userClient: ClientProxy,
    @Inject("MEDIA_SERVICE") private readonly mediaClient: ClientProxy,
    @Inject("SOCIAL_SERVICE") private readonly socialClient: ClientProxy,
  ) {}

  /**
   * Создание новой саги
   */
  createSaga(type: SagaType, initialSteps: ISagaStep[]): ISaga {
    const sagaId = uuidv4();
    const saga: ISaga = {
      sagaId,
      type,
      status: SagaStatus.PENDING,
      steps: initialSteps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sagas.set(sagaId, saga);
    this.logger.log(`[SAGA] Created saga: ${sagaId}, type: ${type}`);
    return saga;
  }

  /**
   * Выполнение саги (Choreography Pattern)
   * Каждый шаг выполняется последовательно, при ошибке выполняется компенсация
   */
  async executeSaga(
    sagaId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      return { success: false, error: "Saga not found" };
    }

    saga.status = SagaStatus.IN_PROGRESS;
    saga.updatedAt = new Date();

    this.logger.log(
      `[SAGA] Executing saga: ${sagaId}, steps: ${saga.steps.length}`,
    );

    const completedSteps: ISagaStep[] = [];

    try {
      // Выполняем шаги последовательно
      for (const step of saga.steps) {
        step.status = SagaStepStatus.PENDING;
        saga.updatedAt = new Date();

        this.logger.log(
          `[SAGA] Executing step: ${step.stepId}, service: ${step.service}, action: ${step.action}`,
        );

        try {
          // Выполняем шаг через соответствующий сервис
          // Если service = "auth", это локальная операция, пропускаем
          if (step.service === "auth") {
            // Локальные операции в auth.service выполняются напрямую
            step.status = SagaStepStatus.COMPLETED;
            completedSteps.push(step);
            this.logger.log(`[SAGA] Step completed (local): ${step.stepId}`);
            continue;
          }

          const result = await this.executeStep(step, saga);

          step.status = SagaStepStatus.COMPLETED;
          step.result = result;
          completedSteps.push(step);

          this.logger.log(`[SAGA] Step completed: ${step.stepId}`);
        } catch (error) {
          // Шаг не выполнен - начинаем компенсацию
          step.status = SagaStepStatus.FAILED;
          step.error = error instanceof Error ? error.message : String(error);

          this.logger.error(
            `[SAGA] Step failed: ${step.stepId}, error: ${step.error}`,
          );

          // Выполняем компенсацию для всех выполненных шагов
          await this.compensateSaga(saga, completedSteps);

          saga.status = SagaStatus.FAILED;
          saga.error = step.error;
          saga.updatedAt = new Date();

          return { success: false, error: step.error };
        }
      }

      // Все шаги выполнены успешно
      saga.status = SagaStatus.COMPLETED;
      saga.updatedAt = new Date();

      this.logger.log(`[SAGA] Saga completed successfully: ${sagaId}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`[SAGA] Saga execution error: ${errorMessage}`);

      // Выполняем компенсацию
      await this.compensateSaga(saga, completedSteps);

      saga.status = SagaStatus.FAILED;
      saga.error = errorMessage;
      saga.updatedAt = new Date();

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Выполнение одного шага саги
   */
  private async executeStep(step: ISagaStep, saga: ISaga): Promise<any> {
    const { firstValueFrom, timeout } = await import("rxjs");
    const { catchError, throwError } = await import("rxjs");

    let client: ClientProxy;
    switch (step.service) {
      case "user":
        client = this.userClient;
        break;
      case "media":
        client = this.mediaClient;
        break;
      case "social":
        client = this.socialClient;
        break;
      default:
        throw new Error(`Unknown service: ${step.service}`);
    }

    try {
      const result = await firstValueFrom(
        client
          .send({ cmd: step.action }, { ...step.data, sagaId: saga.sagaId })
          .pipe(
            timeout(30000), // 30 секунд таймаут
            catchError((error) => {
              this.logger.error(
                `[SAGA] Step execution error: ${step.stepId}, error: ${error}`,
              );
              return throwError(() => error);
            }),
          ),
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute step ${step.stepId}: ${errorMessage}`);
    }
  }

  /**
   * Компенсация саги (откат выполненных шагов)
   */
  private async compensateSaga(
    saga: ISaga,
    completedSteps: ISagaStep[],
  ): Promise<void> {
    if (completedSteps.length === 0) {
      return;
    }

    saga.status = SagaStatus.COMPENSATING;
    saga.updatedAt = new Date();

    this.logger.log(
      `[SAGA] Compensating saga: ${saga.sagaId}, steps to compensate: ${completedSteps.length}`,
    );

    // Выполняем компенсацию в обратном порядке
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];

      if (!step.compensation) {
        this.logger.warn(
          `[SAGA] No compensation defined for step: ${step.stepId}`,
        );
        continue;
      }

      try {
        this.logger.log(
          `[SAGA] Compensating step: ${step.stepId}, action: ${step.compensation.action}`,
        );

        await this.executeCompensation(step, saga);

        step.status = SagaStepStatus.COMPENSATED;
        this.logger.log(`[SAGA] Step compensated: ${step.stepId}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[SAGA] Failed to compensate step: ${step.stepId}, error: ${errorMessage}`,
        );
        // Продолжаем компенсацию других шагов даже если один не удался
      }
    }

    saga.status = SagaStatus.COMPENSATED;
    saga.updatedAt = new Date();

    this.logger.log(`[SAGA] Saga compensated: ${saga.sagaId}`);
  }

  /**
   * Выполнение компенсирующего действия
   */
  private async executeCompensation(
    step: ISagaStep,
    saga: ISaga,
  ): Promise<void> {
    // Если service = "auth", компенсация выполняется локально
    if (step.service === "auth") {
      this.logger.log(
        `[SAGA] Compensation for auth service should be handled locally: ${step.stepId}`,
      );
      return;
    }

    const { firstValueFrom, timeout } = await import("rxjs");
    const { catchError, throwError } = await import("rxjs");

    let client: ClientProxy;
    switch (step.service) {
      case "user":
        client = this.userClient;
        break;
      case "media":
        client = this.mediaClient;
        break;
      case "social":
        client = this.socialClient;
        break;
      default:
        throw new Error(`Unknown service: ${step.service}`);
    }

    try {
      await firstValueFrom(
        client
          .send(
            { cmd: step.compensation.action },
            { ...step.compensation.data, sagaId: saga.sagaId },
          )
          .pipe(
            timeout(30000),
            catchError((error) => {
              this.logger.error(
                `[SAGA] Compensation error: ${step.stepId}, error: ${error}`,
              );
              return throwError(() => error);
            }),
          ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to compensate step ${step.stepId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Получение статуса саги
   */
  getSaga(sagaId: string): ISaga | undefined {
    return this.sagas.get(sagaId);
  }

  /**
   * Очистка старых саг (можно вызывать периодически)
   */
  cleanupOldSagas(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sagaId, saga] of this.sagas.entries()) {
      const age = now - saga.createdAt.getTime();
      if (
        age > maxAge &&
        (saga.status === SagaStatus.COMPLETED ||
          saga.status === SagaStatus.COMPENSATED ||
          saga.status === SagaStatus.FAILED)
      ) {
        this.sagas.delete(sagaId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`[SAGA] Cleaned up ${cleaned} old sagas`);
    }
  }
}
