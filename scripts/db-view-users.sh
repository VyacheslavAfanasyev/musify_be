#!/bin/bash
# Скрипт для просмотра всех пользователей в базе данных

docker-compose exec postgres psql -U musician -d music_app -c "SELECT id, email, username, role FROM users ORDER BY id DESC;"

