#!/bin/bash
# Скрипт для подсчета количества пользователей

docker-compose exec postgres psql -U musician -d music_app -c "SELECT COUNT(*) as total_users FROM users;"

