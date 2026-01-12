#!/bin/bash
# Скрипт для подсчета количества профилей в MongoDB

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.countDocuments()"

