# Мониторинг PET Backend

Этот каталог содержит конфигурацию для полного мониторинга микросервисной архитектуры PET Backend.

## Компоненты

### 1. Loki - Централизованное логирование
- **Порт:** 3100
- **Назначение:** Сбор и хранение логов из всех сервисов
- **Интеграция:** Promtail собирает логи из Docker контейнеров

### 2. Prometheus - Сбор метрик
- **Порт:** 9090
- **Назначение:** Сбор метрик производительности из всех сервисов
- **Эндпоинты метрик:** `/metrics` в каждом сервисе

### 3. Grafana - Визуализация
- **Порт:** 3005
- **URL:** http://localhost:3005
- **Учетные данные по умолчанию:**
  - Username: `admin`
  - Password: `admin`
- **Назначение:** Визуализация логов и метрик

### 4. Promtail - Агент сбора логов
- **Назначение:** Сбор логов из Docker контейнеров и отправка в Loki

## Использование

### Запуск мониторинга

#### Вариант 1: Только сервисы мониторинга

Если микросервисы уже запущены и нужно добавить только мониторинг:

```bash
docker-compose up -d loki promtail prometheus grafana
```

**Примечание:** Флаг `--build` не нужен, так как сервисы мониторинга используют готовые образы из Docker Hub.

#### Вариант 2: Все сервисы (рекомендуется для первого запуска)

Для запуска всего приложения включая мониторинг:

```bash
docker-compose up -d --build
```

Эта команда пересоберет образы микросервисов (если код изменился) и запустит все сервисы, включая мониторинг.

### Доступ к сервисам

- **Grafana:** http://localhost:3005
- **Prometheus:** http://localhost:9090
- **Loki:** http://localhost:3100
- **Jaeger:** http://localhost:16686 (уже был настроен ранее)

### Просмотр метрик

Каждый сервис экспортирует метрики на эндпоинте `/metrics`:
- API Gateway: http://localhost:3000/metrics
- Auth Service: http://localhost:3001/metrics
- User Service: http://localhost:3002/metrics
- Media Service: http://localhost:3003/metrics
- Social Service: http://localhost:3004/metrics

### Просмотр логов в Grafana

1. Откройте Grafana: http://localhost:3005
2. Перейдите в раздел "Explore"
3. Выберите источник данных "Loki"
4. Используйте LogQL для запросов:
   ```
   {service="auth"}
   {service="user"} |= "error"
   {traceId="your-trace-id"}
   ```

### Дашборды

Базовый дашборд "System Overview" автоматически загружается при старте Grafana.

## Метрики

### HTTP метрики
- `http_request_duration_seconds` - Длительность HTTP запросов
- `http_requests_total` - Общее количество HTTP запросов
- `http_request_errors_total` - Количество ошибок HTTP запросов

### Circuit Breaker метрики
- `circuit_breaker_state` - Состояние Circuit Breaker (0=closed, 1=half-open, 2=open)

### Saga метрики
- `saga_duration_seconds` - Длительность выполнения саг
- `saga_total` - Общее количество саг
- `saga_errors_total` - Количество ошибок саг

### Бизнес метрики
- `user_registrations_total` - Количество регистраций пользователей
- `user_logins_total` - Количество входов пользователей
- `file_uploads_total` - Количество загруженных файлов
- `follows_created_total` - Количество созданных подписок

## Структурированное логирование

Все сервисы используют структурированное JSON логирование с автоматической корреляцией по trace ID:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "service": "auth",
  "context": "AuthController",
  "message": "User registered successfully",
  "traceId": "abc123...",
  "spanId": "def456..."
}
```

## Интеграция с Jaeger

Trace ID из OpenTelemetry автоматически добавляется в логи, что позволяет:
1. Найти все логи по trace ID в Loki
2. Перейти от трейса в Jaeger к логам в Grafana
3. Коррелировать метрики с трейсами

## Настройка алертов

Для настройки алертов в Grafana:
1. Перейдите в раздел "Alerting"
2. Создайте правила алертов на основе метрик Prometheus
3. Настройте уведомления (Email, Slack, etc.)

Пример алерта:
- **Название:** High Error Rate
- **Условие:** `rate(http_request_errors_total[5m]) > 0.1`
- **Действие:** Отправить уведомление в Slack

## Масштабирование

При масштабировании сервисов Prometheus автоматически обнаружит новые инстансы через service discovery в docker-compose.

## Troubleshooting

### Логи не появляются в Loki
- Проверьте, что Promtail запущен: `docker ps | grep promtail`
- Проверьте логи Promtail: `docker logs promtail`

### Метрики не собираются
- Проверьте доступность эндпоинта `/metrics` в сервисе
- Проверьте конфигурацию Prometheus: `docker exec prometheus cat /etc/prometheus/prometheus.yml`

### Grafana не подключается к источникам данных
- Проверьте, что все сервисы запущены
- Проверьте конфигурацию в `monitoring/grafana/provisioning/datasources/`

