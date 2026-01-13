@echo off
REM Быстрый вход в интерактивную оболочку контейнера

echo Запущенные контейнеры:
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo.

set /p CONTAINER_NAME="Введите имя контейнера (или нажмите Enter для user): "

if "%CONTAINER_NAME%"=="" (
    set CONTAINER_NAME=backend-user-1
)

echo.
echo Вход в контейнер: %CONTAINER_NAME%
echo Используйте 'exit' для выхода
echo.

docker exec -it %CONTAINER_NAME% sh

