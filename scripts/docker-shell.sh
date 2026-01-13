#!/bin/bash
# Быстрый вход в интерактивную оболочку контейнера

echo "Запущенные контейнеры:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

read -p "Введите имя контейнера (или нажмите Enter для user): " CONTAINER_NAME

if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME="backend-user-1"
fi

echo ""
echo "Вход в контейнер: $CONTAINER_NAME"
echo "Используйте 'exit' для выхода"
echo ""

docker exec -it "$CONTAINER_NAME" sh

