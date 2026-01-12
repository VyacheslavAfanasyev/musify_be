@echo off
REM Скрипт для интерактивного подключения к MongoDB (Windows)

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app

