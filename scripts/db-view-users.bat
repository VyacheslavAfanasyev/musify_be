@echo off
REM Скрипт для просмотра всех пользователей в базе данных (Windows)

docker-compose exec postgres psql -U musician -d music_app -c "SELECT id, email, username, role FROM users ORDER BY id DESC;"

