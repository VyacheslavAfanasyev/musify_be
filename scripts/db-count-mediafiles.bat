@echo off
REM Скрипт для подсчета медиафайлов в MongoDB (Windows)

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.mediafiles.countDocuments()"

