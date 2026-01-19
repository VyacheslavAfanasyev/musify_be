# Анализ архитектуры проекта PET Backend

## Текущее состояние

### ✅ Что соответствует микросервисной архитектуре:

1. **Разделение на независимые сервисы:**
   - `api-gateway` - единая точка входа
   - `auth` - сервис аутентификации
   - `user` - сервис управления пользователями
   - `media` - сервис медиа-файлов
   - `social` - сервис социальных функций

2. **Асинхронная коммуникация:**
   - Используется RabbitMQ для межсервисного взаимодействия
   - Сервисы общаются через очереди сообщений

3. **Независимое развертывание:**
   - Каждый сервис имеет свой Dockerfile
   - Сервисы могут быть запущены отдельно

4. **API Gateway:**
   - Единая точка входа для клиентов
   - Маршрутизация запросов к соответствующим сервисам

### ❌ Проблемы, нарушающие принципы микросервисной архитектуры:

#### 1. **Общая база данных (Database per Service Anti-pattern)**

**Проблема:**
- `user`, `media`, `social` используют **одну и ту же MongoDB базу данных** (`music_app`)
- Это создает тесную связанность между сервисами
- Нарушает принцип "Database per Service"

**Текущая ситуация:**
```
PostgreSQL (music_app) → auth service
MongoDB (music_app)   → user service
MongoDB (music_app)   → media service  ❌
MongoDB (music_app)   → social service ❌
```

**Последствия:**
- Изменение схемы в одном сервисе может сломать другие
- Невозможно масштабировать базы данных независимо
- Сложно обеспечить изоляцию данных
- Нарушение принципа независимости сервисов

#### 2. **Общий Redis инстанс**

**Проблема:**
- Все сервисы используют один Redis инстанс
- Нет изоляции кэша между сервисами
- Потенциальные конфликты ключей

#### 3. **Прямые зависимости между сервисами**

**Проблема:**
- `social` и `media` напрямую зависят от `user` service
- `api-gateway` агрегирует данные из нескольких сервисов синхронно
- Создает каскадные зависимости

**Примеры:**
- `getUserProfile` в API Gateway вызывает `auth` и `user` сервисы синхронно
- `social` service вызывает `user` service для обновления счетчиков
- `media` service вызывает `user` service для валидации пользователя

#### 4. **Общая библиотека (shared)**

**Проблема:**
- Все сервисы используют общую папку `shared` с типами, схемами, утилитами
- Изменения в `shared` требуют пересборки всех сервисов
- Нарушает принцип независимой разработки

#### 5. **API Gateway содержит бизнес-логику**

**Проблема:**
- API Gateway агрегирует данные из разных сервисов
- Содержит логику объединения данных (например, `getUserProfile`)
- Должен быть только маршрутизатором, а не агрегатором

## Что такое микрофронтенд?

**Важно:** Микрофронтенд (Micro Frontend) - это архитектурный подход для **фронтенда**, где разные части UI разрабатываются и развертываются независимо. Это **НЕ** то же самое, что микросервисы.

Ваш проект - это **бэкенд** с микросервисной архитектурой, а не микрофронтенд.

## Рекомендации по исправлению

### 1. Разделение баз данных (Database per Service)

**Решение:** Каждый сервис должен иметь свою собственную базу данных

```yaml
# docker-compose.yml
services:
  # Базы данных для каждого сервиса
  postgres_auth:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: auth_user
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_auth_data:/var/lib/postgresql/data

  mongodb_user:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: user_db
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes:
      - mongodb_user_data:/data/db

  mongodb_media:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: media_db
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes:
      - mongodb_media_data:/data/db

  mongodb_social:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: social_db
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes:
      - mongodb_social_data:/data/db

  redis_auth:
    image: redis:7-alpine
    volumes:
      - redis_auth_data:/data

  redis_user:
    image: redis:7-alpine
    volumes:
      - redis_user_data:/data

  redis_media:
    image: redis:7-alpine
    volumes:
      - redis_media_data:/data

  redis_social:
    image: redis:7-alpine
    volumes:
      - redis_social_data:/data
```

**Изменения в сервисах:**
- `user` service: `MONGODB_URL=mongodb://root:secret@mongodb_user:27017/user_db`
- `media` service: `MONGODB_URL=mongodb://root:secret@mongodb_media:27017/media_db`
- `social` service: `MONGODB_URL=mongodb://root:secret@mongodb_social:27017/social_db`

### 2. Устранение прямых зависимостей

**Решение:** Использовать Event-Driven Architecture

**Вместо синхронных вызовов:**
```typescript
// ❌ Плохо: синхронный вызов
const profile = await this.userClient.send('getProfile', { userId });
```

**Использовать события:**
```typescript
// ✅ Хорошо: асинхронные события
// При создании пользователя
this.authClient.emit('user.created', { userId, email, username });

// User service слушает событие
@EventPattern('user.created')
async handleUserCreated(data: { userId: string; email: string; username: string }) {
  // Создать профиль
}
```

**Примеры событий:**
- `user.created` - когда создан пользователь
- `user.updated` - когда обновлен профиль
- `user.deleted` - когда удален пользователь
- `media.uploaded` - когда загружен файл
- `follow.created` - когда создана подписка

### 3. Рефакторинг API Gateway

**Решение:** Убрать бизнес-логику из Gateway

**Текущая проблема:**
```typescript
// ❌ API Gateway агрегирует данные
async getUserProfile(userId: string) {
  const authResult = await this.sendToAuthService(...);
  const profileResult = await this.sendToUserService(...);
  return { ...authResult, ...profileResult }; // Агрегация в Gateway
}
```

**Правильный подход:**
```typescript
// ✅ API Gateway только маршрутизирует
@Get('users/:id/profile')
getUserProfile(@Param('id') id: string) {
  // Просто перенаправляем в User Service
  return this.appService.forwardToUserService('getUserProfile', { id });
}

// User Service сам агрегирует данные из других сервисов
// или использует кэш/репликацию данных
```

**Альтернатива:** Использовать GraphQL Gateway (Apollo Federation) для агрегации

### 4. Управление общими типами

**Решение:** Версионирование и независимые пакеты

**Вариант 1: NPM пакеты**
```json
// shared/package.json
{
  "name": "@pet/shared-types",
  "version": "1.0.0"
}

// В каждом сервисе
{
  "dependencies": {
    "@pet/shared-types": "^1.0.0"
  }
}
```

**Вариант 2: API Contracts (OpenAPI/Schema Registry)**
- Определить контракты через OpenAPI
- Генерировать типы из контрактов
- Использовать Schema Registry для версионирования

### 5. Добавить Service Discovery

**Решение:** Использовать Consul, Eureka или Kubernetes Service Discovery

```typescript
// Вместо жестко заданных URL
const rabbitmqUrl = process.env.RABBITMQ_URL;

// Использовать Service Discovery
const serviceUrl = await serviceDiscovery.getServiceUrl('user-service');
```

### 6. Добавить Circuit Breaker

**Решение:** Использовать библиотеку для Circuit Breaker (например, `@nestjs/terminus`)

```typescript
import { CircuitBreaker } from '@nestjs/terminus';

@Injectable()
export class AppService {
  private circuitBreaker = new CircuitBreaker({
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  });

  async sendToUserService(cmd: string, payload: any) {
    return this.circuitBreaker.fire(() => 
      this.userClient.send({ cmd }, payload)
    );
  }
}
```

### 7. Добавить Distributed Tracing

**Решение:** Использовать OpenTelemetry или Jaeger

```typescript
import { TraceService } from '@nestjs/opentelemetry';

@Injectable()
export class AppService {
  constructor(private traceService: TraceService) {}

  async getUserProfile(userId: string) {
    const span = this.traceService.startSpan('getUserProfile');
    try {
      // логика
    } finally {
      span.end();
    }
  }
}
```

## План миграции

### Этап 1: Разделение баз данных (Критично)
1. Создать отдельные базы данных для каждого сервиса
2. Мигрировать данные из общей базы
3. Обновить конфигурацию сервисов
4. Протестировать изоляцию

### Этап 2: Устранение прямых зависимостей
1. Определить события для межсервисного взаимодействия
2. Реализовать Event Handlers в сервисах
3. Заменить синхронные вызовы на события
4. Добавить компенсирующие транзакции (Saga Pattern)

### Этап 3: Рефакторинг API Gateway
1. Убрать бизнес-логику из Gateway
2. Перенести агрегацию в соответствующие сервисы
3. Или внедрить GraphQL Gateway

### Этап 4: Управление зависимостями
1. Вынести shared в NPM пакет
2. Настроить версионирование
3. Обновить все сервисы

### Этап 5: Улучшение инфраструктуры
1. Добавить Service Discovery
2. Добавить Circuit Breaker
3. Добавить Distributed Tracing
4. Настроить мониторинг и логирование

## Заключение

**Текущее состояние:** Проект имеет **гибридную архитектуру** - частично микросервисную, но с элементами монолита (общие БД, прямые зависимости).

**Для полноценной микросервисной архитектуры необходимо:**
1. ✅ Разделить базы данных (Database per Service)
2. ✅ Устранить прямые зависимости (Event-Driven)
3. ✅ Упростить API Gateway (только маршрутизация)
4. ✅ Управлять общими зависимостями (версионирование)
5. ✅ Добавить инфраструктурные компоненты (Service Discovery, Circuit Breaker, Tracing)

**Приоритет:** Начать с разделения баз данных, так как это критично для независимости сервисов.
