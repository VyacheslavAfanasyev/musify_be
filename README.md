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

## Исследование Docker контейнеров

Для лучшего понимания внутренней структуры Docker контейнеров используйте скрипты из папки `scripts/`:

```bash
# Windows
scripts\docker-inspect.bat      # Детальная информация о структуре контейнера
scripts\docker-shell.bat        # Быстрый вход в интерактивную оболочку

# Linux/Mac
chmod +x scripts/docker-inspect.sh scripts/docker-shell.sh
./scripts/docker-inspect.sh     # Детальная информация о структуре контейнера
./scripts/docker-shell.sh       # Быстрый вход в интерактивную оболочку
```

**Быстрый способ посмотреть структуру:**

```bash
# Получить интерактивную оболочку внутри контейнера
docker exec -it backend-user-1 sh

# Внутри контейнера:
ls -la /app          # Просмотр содержимого
find /app -type f    # Найти все файлы
tree /app            # Древовидная структура (если установлен)
```

Подробная документация: [scripts/docker-explore.md](scripts/docker-explore.md)

## Git структура

Проект использует **monorepo** подход - один Git репозиторий для всего проекта. Это позволяет:

- Отслеживать изменения в `docker-compose.yml` и общих конфигурациях
- Координировать изменения между сервисами
- Упростить CI/CD пайплайны
