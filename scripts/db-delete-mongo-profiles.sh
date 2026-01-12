#!/bin/bash
# Скрипт для удаления всех профилей из MongoDB
# Использование: ./scripts/db-delete-mongo-profiles.sh

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.deleteMany({})"
echo "Все профили удалены из MongoDB (если существовали)"

