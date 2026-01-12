@echo off
REM Скрипт для удаления всех профилей из MongoDB (Windows)
REM Использование: scripts\db-delete-mongo-profiles.bat

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.deleteMany({})"
echo Все профили удалены из MongoDB (если существовали)

