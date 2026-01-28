# Быстрый старт мониторинга

## Установка зависимостей

Перед запуском мониторинга необходимо установить зависимости в shared библиотеке:

```bash
cd shared
npm install
```

Это установит:
- `prom-client` - для Prometheus метрик
- `@opentelemetry/api` - для работы с trace ID в логах

## Запуск мониторинга

### Вариант 1: Только сервисы мониторинга (без пересборки)

Если вы уже запускали приложение ранее и хотите добавить только мониторинг:

```bash
docker-compose up -d loki promtail prometheus grafana
```

**Почему без `--build`?** Сервисы мониторинга (Loki, Promtail, Prometheus, Grafana) используют готовые образы из Docker Hub, их не нужно собирать.

### Вариант 2: Все сервисы включая мониторинг (с пересборкой)

Если вы запускаете приложение впервые или изменили код микросервисов:

```bash
docker-compose up -d --build
```

Эта команда:
- Пересоберет образы всех микросервисов (auth, user, media, social, api-gateway)
- Запустит все сервисы, включая мониторинг
- Использует готовые образы для сервисов мониторинга (без пересборки)

### Вариант 3: Только микросервисы с пересборкой

Если вы изменили код и хотите пересобрать только микросервисы:

```bash
docker-compose up -d --build auth user media social api-gateway
```

2. Проверьте, что все сервисы запущены:
```bash
docker-compose ps
```

3. Откройте Grafana: http://localhost:3005
   - Username: `admin`
   - Password: `admin`

## Проверка работы

### Проверка метрик

Проверьте, что метрики доступны:
- API Gateway: http://localhost:3000/metrics
- Auth Service: http://localhost:3001/metrics
- User Service: http://localhost:3002/metrics
- Media Service: http://localhost:3003/metrics
- Social Service: http://localhost:3004/metrics

### Проверка Prometheus

1. Откройте Prometheus: http://localhost:9090
2. Перейдите в раздел "Status" → "Targets"
3. Убедитесь, что все сервисы показывают статус "UP"

### Проверка логов в Grafana

1. Откройте Grafana: http://localhost:3005
2. Перейдите в "Explore"
3. Выберите источник данных "Loki"
4. Выполните запрос: `{service="auth"}`

## Настройка Promtail (опционально)

Если логи не собираются автоматически, можно настроить Promtail для сбора логов из конкретных контейнеров. Отредактируйте `monitoring/promtail-config.yml` и укажите нужные фильтры.

## Следующие шаги

1. Настройте алерты в Grafana на основе метрик
2. Создайте дополнительные дашборды для специфичных метрик
3. Настройте уведомления (Email, Slack) для критичных алертов

