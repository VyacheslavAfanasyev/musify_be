#!/bin/bash
# Скрипт для удаления пользователя по email
# Использование: ./scripts/db-delete-user.sh user@example.com

if [ -z "$1" ]; then
  echo "Использование: $0 <email>"
  exit 1
fi

EMAIL=$1
docker-compose exec postgres psql -U musician -d music_app -c "DELETE FROM users WHERE email = '$EMAIL';"
echo "Пользователь с email $EMAIL удален (если существовал)"

