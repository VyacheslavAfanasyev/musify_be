#!/bin/bash
# Скрипт для инспектирования Docker контейнеров
# Показывает внутреннюю структуру файловой системы контейнера

echo "========================================"
echo "Docker Container Inspector"
echo "========================================"
echo ""

# Получаем список запущенных контейнеров
echo "Запущенные контейнеры:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

read -p "Введите имя контейнера (например: backend-user-1): " CONTAINER_NAME

if [ -z "$CONTAINER_NAME" ]; then
    echo "Ошибка: имя контейнера не указано"
    exit 1
fi

echo ""
echo "========================================"
echo "Информация о контейнере: $CONTAINER_NAME"
echo "========================================"
echo ""

echo "[1] Просмотр структуры файловой системы:"
echo ""
docker exec "$CONTAINER_NAME" sh -c "find /app -type f -o -type d | head -50"
echo ""

echo "[2] Детальная структура директории /app:"
echo ""
docker exec "$CONTAINER_NAME" sh -c "ls -lah /app"
echo ""

echo "[3] Структура с поддиректориями (первые 3 уровня):"
echo ""
docker exec "$CONTAINER_NAME" sh -c "tree -L 3 /app 2>/dev/null || find /app -maxdepth 3 -print | sed 's|[^/]*/| |g'"
echo ""

echo "[4] Размер директорий:"
echo ""
docker exec "$CONTAINER_NAME" sh -c "du -sh /app/* 2>/dev/null | sort -h"
echo ""

echo "[5] Метаданные контейнера (JSON):"
echo ""
docker inspect "$CONTAINER_NAME" | grep -E "(WorkingDir|Image|Mounts)"
echo ""

echo "========================================"
echo "Полезные команды для дальнейшего исследования:"
echo "========================================"
echo ""
echo "Интерактивная оболочка:"
echo "  docker exec -it $CONTAINER_NAME sh"
echo ""
echo "Просмотр переменных окружения:"
echo "  docker exec $CONTAINER_NAME env"
echo ""
echo "Просмотр процессов:"
echo "  docker exec $CONTAINER_NAME ps aux"
echo ""
echo "Копирование файла из контейнера:"
echo "  docker cp $CONTAINER_NAME:/app/package.json ./package.json"
echo ""
echo "Просмотр изменений в файловой системе:"
echo "  docker diff $CONTAINER_NAME"
echo ""

