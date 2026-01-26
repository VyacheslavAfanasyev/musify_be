/**
 * Типы для Saga Pattern (компенсирующие транзакции)
 */

export enum SagaStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  COMPENSATING = "compensating",
  COMPENSATED = "compensated",
}

export enum SagaStepStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  COMPENSATED = "compensated",
}

export enum SagaType {
  USER_CREATION = "user_creation",
  USER_DELETION = "user_deletion",
  MEDIA_UPLOAD = "media_upload",
  MEDIA_DELETION = "media_deletion",
  FOLLOW_CREATION = "follow_creation",
  FOLLOW_DELETION = "follow_deletion",
}

export interface ISagaStep {
  stepId: string;
  service: string; // Название сервиса (auth, user, media, social)
  action: string; // Название действия (createUser, createProfile, uploadFile, etc.)
  status: SagaStepStatus;
  data?: any; // Данные для выполнения шага
  result?: any; // Результат выполнения шага
  error?: string; // Ошибка, если шаг не выполнен
  compensation?: {
    action: string; // Название компенсирующего действия
    data?: any; // Данные для компенсации
  };
}

export interface ISaga {
  sagaId: string;
  type: SagaType; // Тип саги
  status: SagaStatus;
  steps: ISagaStep[];
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface ISagaContext {
  sagaId: string;
  sagaType: SagaType;
  userId?: string;
  [key: string]: any; // Дополнительные данные контекста
}

