# Исследование внутренней структуры Docker контейнеров

Это руководство поможет вам понять, как устроены Docker контейнеры и как посмотреть их внутреннюю структуру.

## Как работает Docker контейнер

### Процесс создания образа:

1. **Dockerfile** определяет инструкции для сборки образа
2. Каждая команда `COPY` копирует файлы из вашей локальной файловой системы в образ
3. Команды `RUN` выполняются во время сборки и создают слои образа
4. Финальный образ содержит все скопированные файлы и установленные зависимости

### В вашем проекте:

- **Контекст сборки**: корень проекта (`context: .` в docker-compose.yml)
- **Рабочая директория в контейнере**: `/app` (определена через `WORKDIR /app`)
- **Файлы копируются** из локальных путей в `/app` внутри контейнера

## Способы просмотра структуры контейнера

### 1. Использование готового скрипта

```bash
# Windows
scripts\docker-inspect.bat

# Linux/Mac
chmod +x scripts/docker-inspect.sh
./scripts/docker-inspect.sh
```

### 2. Интерактивная оболочка (самый простой способ)

```bash
# Получить интерактивную оболочку внутри контейнера
docker exec -it backend-user-1 sh

# Теперь вы внутри контейнера, можете выполнять команды:
ls -la /app          # Просмотр содержимого рабочей директории
pwd                  # Текущая директория
find /app -type f    # Найти все файлы
tree /app            # Древовидная структура (если установлен tree)
```

### 3. Выполнение отдельных команд

```bash
# Просмотр структуры директорий
docker exec backend-user-1 ls -lah /app

# Просмотр структуры с поддиректориями
docker exec backend-user-1 find /app -maxdepth 3 -type d

# Просмотр всех файлов
docker exec backend-user-1 find /app -type f

# Размер директорий
docker exec backend-user-1 du -sh /app/*

# Просмотр переменных окружения
docker exec backend-user-1 env

# Просмотр процессов
docker exec backend-user-1 ps aux
```

### 4. Метаданные контейнера

```bash
# Полная информация о контейнере (JSON)
docker inspect backend-user-1

# Конкретные поля
docker inspect backend-user-1 --format='{{.Config.WorkingDir}}'
docker inspect backend-user-1 --format='{{json .Mounts}}' | jq
```

### 5. Просмотр изменений файловой системы

```bash
# Показать все изменения относительно базового образа
docker diff backend-user-1

# A = Added (добавлено)
# C = Changed (изменено)
# D = Deleted (удалено)
```

### 6. Копирование файлов из контейнера

```bash
# Скопировать файл из контейнера на хост
docker cp backend-user-1:/app/package.json ./package-from-container.json

# Скопировать директорию
docker cp backend-user-1:/app/src ./src-from-container

# Скопировать файл в контейнер
docker cp ./local-file.txt backend-user-1:/app/
```

### 7. Просмотр истории образа

```bash
# Показать историю сборки образа (все слои)
docker history backend-user-1

# С более подробной информацией
docker history --human --format "table {{.CreatedBy}}\t{{.Size}}" backend-user-1
```

## Понимание структуры вашего проекта

### В development режиме (текущая конфигурация):

```
Контейнер: /app
├── shared/              # Скопировано из образа (COPY shared ./shared)
├── src/                 # МОНТИРУЕТСЯ (volume) - изменения видны сразу
├── package.json         # МОНТИРУЕТСЯ (volume)
├── tsconfig.json        # МОНТИРУЕТСЯ (volume)
├── node_modules/        # Из образа (НЕ монтируется, volume: /app/node_modules)
└── dist/                # Создается при сборке (если есть)
```

**Важно**: В development режиме файлы из `volumes` **не копируются**, а **монтируются** напрямую. Это означает:
- Изменения в локальных файлах сразу видны в контейнере
- `node_modules` НЕ монтируется (используется из образа)

### В production режиме:

```
Контейнер: /app
├── shared/              # Скопировано из образа
├── dist/                # Скопировано из builder stage
├── node_modules/        # Скопировано из builder stage
└── package.json         # Скопировано из образа
```

## Полезные команды для отладки

```bash
# Просмотр логов контейнера
docker logs backend-user-1
docker logs -f backend-user-1  # Следить за логами в реальном времени

# Просмотр использования ресурсов
docker stats backend-user-1

# Остановка и удаление контейнера
docker stop backend-user-1
docker rm backend-user-1

# Пересборка образа
docker-compose build user

# Пересборка без кэша
docker-compose build --no-cache user
```

## Визуализация структуры

Для лучшего понимания можно использовать:

```bash
# Установить tree внутри контейнера (если нужно)
docker exec backend-user-1 apk add tree  # для alpine
docker exec backend-user-1 tree -L 3 /app

# Или использовать find с форматированием
docker exec backend-user-1 find /app -print | sed 's|[^/]*/| |g'
```

## Примеры исследования

### Проверить, что файлы скопированы правильно:

```bash
docker exec backend-user-1 cat /app/package.json
docker exec backend-user-1 ls -la /app/shared
```

### Проверить переменные окружения:

```bash
docker exec backend-user-1 env | grep -E "(NODE_ENV|DATABASE|REDIS)"
```

### Проверить, какие порты открыты:

```bash
docker inspect backend-user-1 --format='{{json .Config.ExposedPorts}}' | jq
```

