@echo off
REM Скрипт для удаления пользователя по email (Windows)
REM Использование: scripts\db-delete-user.bat user@example.com

if "%1"=="" (
  echo Использование: %0 ^<email^>
  exit /b 1
)

set EMAIL=%1
docker-compose exec postgres psql -U musician -d music_app -c "DELETE FROM users WHERE email = '%EMAIL%';"
echo Пользователь с email %EMAIL% удален (если существовал)

