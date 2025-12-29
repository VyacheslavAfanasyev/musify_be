@echo off
REM Скрипт для интерактивного подключения к базе данных (Windows)

docker-compose exec postgres psql -U musician -d music_app

