@echo off
REM Скрипт для удаления всех медиафайлов в MongoDB (Windows)
REM ВНИМАНИЕ: Эта команда удалит ВСЕ медиафайлы!

echo ВНИМАНИЕ: Эта команда удалит ВСЕ медиафайлы из базы данных!
echo Нажмите Ctrl+C для отмены или любую клавишу для продолжения...
pause

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.mediafiles.deleteMany({})"

