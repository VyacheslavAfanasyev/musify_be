#!/bin/bash
# Скрипт для удаления всех медиафайлов в MongoDB
# ВНИМАНИЕ: Эта команда удалит ВСЕ медиафайлы!

echo "ВНИМАНИЕ: Эта команда удалит ВСЕ медиафайлы из базы данных!"
read -p "Нажмите Enter для продолжения или Ctrl+C для отмены..."

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.mediafiles.deleteMany({})"

