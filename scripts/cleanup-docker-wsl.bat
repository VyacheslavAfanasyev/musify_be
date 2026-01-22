@echo off
REM Скрипт для очистки Docker и сжатия WSL2 диска через diskpart
REM Запустите от имени администратора

echo === Очистка Docker и WSL2 ===
echo.

echo 1. Очистка Docker данных...
echo    Удаление остановленных контейнеров, неиспользуемых сетей, образов и build cache...
docker system prune -a --volumes -f
if errorlevel 1 (
    echo    Предупреждение: Docker может быть не запущен, продолжаем...
)

echo.
echo 2. Остановка WSL...
wsl --shutdown
timeout /t 3 /nobreak >nul

echo.
echo 3. Сжатие WSL2 виртуального диска через diskpart...
set "DISK_PATH=%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx"

if not exist "%DISK_PATH%" (
    echo    ОШИБКА: Файл ext4.vhdx не найден по пути: %DISK_PATH%
    echo    Проверьте путь и попробуйте снова.
    pause
    exit /b 1
)

echo    Найден файл: %DISK_PATH%
echo    Размер до сжатия:
for %%A in ("%DISK_PATH%") do echo    %%~zA bytes (%%~zA / 1073741824 GB)

echo.
echo    Выполняется сжатие диска (это может занять несколько минут)...
echo    Пожалуйста, подождите...

REM Создаем временный скрипт для diskpart
set "TEMP_SCRIPT=%TEMP%\compact_wsl_disk.txt"
(
    echo select vdisk file="%DISK_PATH%"
    echo compact vdisk
    echo exit
) > "%TEMP_SCRIPT%"

REM Запускаем diskpart с нашим скриптом
diskpart /s "%TEMP_SCRIPT%" >nul 2>&1

REM Удаляем временный скрипт
del "%TEMP_SCRIPT%" >nul 2>&1

if errorlevel 1 (
    echo    ОШИБКА: Не удалось сжать диск. Убедитесь, что:
    echo    - WSL полностью остановлен (wsl --shutdown)
    echo    - Docker Desktop закрыт
    echo    - Скрипт запущен от имени администратора
    pause
    exit /b 1
)

echo    Размер после сжатия:
for %%A in ("%DISK_PATH%") do echo    %%~zA bytes (%%~zA / 1073741824 GB)

echo.
echo === Готово! ===
echo Перезапустите Docker Desktop для применения изменений.
pause

