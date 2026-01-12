@echo off
REM Скрипт для подсчета количества профилей в MongoDB (Windows)

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.countDocuments()"

