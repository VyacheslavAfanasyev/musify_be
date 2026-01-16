#!/bin/bash
# Скрипт для просмотра всех медиафайлов в MongoDB

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.mediafiles.find().pretty()"

