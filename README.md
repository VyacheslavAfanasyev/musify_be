# PET Backend - Микросервисная архитектура

## Структура проекта

```
backend/
├── docker-compose.yml          # Оркестрация всех сервисов
├── microservices/
│   ├── api-gateway/           # API Gateway сервис
│   ├── auth/                  # Сервис аутентификации
│   ├── user/                  # Сервис управления пользователями
│   └── media-service/         # Сервис медиа
└── shared/                     # Общие библиотеки и типы
    ├── configs/
    ├── libs/
    └── types/
```

## Запуск проекта

### Через Docker Compose (рекомендуется)

**Требования:** Docker и Docker Compose должны быть установлены.

```bash
# Запуск всех сервисов (включая базы данных)
docker-compose up -d

# Запуск с пересборкой образов
docker-compose up -d --build

# Просмотр логов всех сервисов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f api-gateway
docker-compose logs -f auth
docker-compose logs -f user

# Остановка всех сервисов
docker-compose down

# Остановка с удалением volumes (очистка данных)
docker-compose down -v
```

**Доступные сервисы:**

- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001 (RabbitMQ queue: auth_queue)
- User Service: http://localhost:3002 (RabbitMQ queue: user_queue)
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379
- RabbitMQ Management UI: http://localhost:15672 (guest/guest)

## Разработка

Каждый микросервис - это независимое NestJS приложение, которое может быть запущено отдельно для разработки.

## Git структура

Проект использует **monorepo** подход - один Git репозиторий для всего проекта. Это позволяет:

- Отслеживать изменения в `docker-compose.yml` и общих конфигурациях
- Координировать изменения между сервисами
- Упростить CI/CD пайплайны
