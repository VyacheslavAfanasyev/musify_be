# Как проверить работу кэширования профилей

## 1. Просмотр логов User Service

Логи Docker контейнера можно смотреть несколькими способами:

### Способ 1: Просмотр последних логов
```bash
docker-compose logs user --tail 50
```

### Способ 2: Следить за логами в реальном времени
```bash
docker-compose logs -f user
```

### Способ 3: Просмотр логов с фильтрацией по кэшу
```bash
docker-compose logs user | grep -i "cache"
```

## 2. Тестирование кэширования

### Шаг 1: Сделайте первый запрос (данные из MongoDB)
```bash
# Получить профиль по userId (замените на реальный userId)
curl http://localhost:3000/users/profile/{userId}
```

В логах вы увидите:
```
[CACHE MISS] Profile not in cache, fetching from MongoDB for userId: ...
[CACHE SET] Saving profile to cache for userId: ...
[CACHE] Profile cached successfully for userId: ..., username: ...
```

### Шаг 2: Сделайте второй запрос (данные из кэша)
```bash
# Тот же запрос через несколько секунд
curl http://localhost:3000/users/profile/{userId}
```

В логах вы увидите:
```
[CACHE HIT] Profile found in cache for userId: ...
```

### Шаг 3: Проверка через Redis CLI (опционально)

Подключитесь к Redis контейнеру:
```bash
docker-compose exec redis redis-cli
```

Проверьте ключи кэша:
```redis
KEYS profile:*
```

Посмотрите значение:
```redis
GET profile:userId:{userId}
```

Проверьте TTL (время жизни):
```redis
TTL profile:userId:{userId}
```

## 3. Что означают метки в логах

- `[CACHE HIT]` - данные найдены в кэше (быстрый ответ)
- `[CACHE MISS]` - данных нет в кэше, запрос идет в MongoDB
- `[CACHE SET]` - данные сохранены в кэш
- `[CACHE]` - успешное кэширование
- `[CACHE INVALIDATE]` - кэш очищен (при обновлении/удалении профиля)
- `[CACHE ERROR]` - ошибка при работе с кэшем

## 4. Проверка производительности

Сравните время ответа:
- Первый запрос (из MongoDB): обычно 50-200ms
- Второй запрос (из кэша): обычно 1-5ms

## 5. Проверка инвалидации кэша

Обновите профиль:
```bash
curl -X PATCH http://localhost:3000/users/profile/{userId} \
  -H "Content-Type: application/json" \
  -d '{"displayName": "New Name"}'
```

В логах вы увидите:
```
[CACHE INVALIDATE] Cache invalidated for userId: ..., username: ...
[CACHE SET] Saving profile to cache for userId: ...
```

