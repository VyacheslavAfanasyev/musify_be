# Руководство по очистке Docker и WSL2

## Проблема
Директория `C:\Users\<user>\AppData\Local\Docker\wsl` занимает слишком много места (130 ГБ в вашем случае).

## Причины
1. **WSL2 виртуальный диск не сжимается автоматически** - даже после удаления данных из Docker, виртуальный диск остается того же размера
2. **Накопление неиспользуемых образов, контейнеров и volumes**
3. **Build cache и временные файлы**

## Решение

### ✅ Вариант 1: Ручная очистка через diskpart (ПРОВЕРЕННЫЙ МЕТОД)

#### Шаг 1: Очистка Docker данных
```bash
# Удалите все контейнеры, образы, volumes и build cache
docker system prune -a --volumes -f
```

#### Шаг 2: Остановка WSL
```cmd
wsl --shutdown
```

#### Шаг 3: Сжатие WSL2 диска через diskpart
Откройте **CMD или PowerShell от имени администратора** и выполните:

```cmd
diskpart
```

В интерфейсе diskpart выполните:
```cmd
select vdisk file="C:\Users\<ваш_username>\AppData\Local\Docker\wsl\data\ext4.vhdx"
compact vdisk
exit
```

**Или одной командой** (замените `<ваш_username>` на ваше имя пользователя):
```cmd
echo select vdisk file="C:\Users\<ваш_username>\AppData\Local\Docker\wsl\data\ext4.vhdx" > %TEMP%\compact_disk.txt && echo compact vdisk >> %TEMP%\compact_disk.txt && diskpart /s %TEMP%\compact_disk.txt
```

### Вариант 2: Автоматическая очистка через скрипт

См. файл `cleanup-docker-wsl-diskpart.bat` (запустите от имени администратора)

### Вариант 3: Через PowerShell Optimize-VHD (может не работать)

⚠️ **Примечание:** Этот метод может не работать на некоторых системах. Используйте diskpart (Вариант 1).

В PowerShell от имени администратора:
```powershell
Optimize-VHD -Path "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx" -Mode Full
```

### Вариант 3: Полная переустановка WSL диска (если ничего не помогает)

⚠️ **ВНИМАНИЕ: Это удалит все данные Docker!**

1. Остановите Docker Desktop
2. Выполните:
```cmd
wsl --shutdown
wsl --unregister docker-desktop-data
wsl --unregister docker-desktop
```
3. Перезапустите Docker Desktop (он создаст новые диски)

## Предотвращение проблемы в будущем

### 1. Регулярная очистка
Добавьте в планировщик задач Windows или запускайте периодически:
```bash
# Очистка Docker
docker system prune -a --volumes -f

# Остановка WSL
wsl --shutdown

# Сжатие диска через diskpart (создайте .bat файл с командами из Варианта 1)
```

### 2. Ограничение размера диска Docker
В Docker Desktop:
- Settings → Resources → Advanced
- Установите максимальный размер диска (например, 50-60 ГБ)

### 3. Мониторинг использования
```bash
# Проверка использования места Docker
docker system df

# Детальная информация
docker system df -v
```

### 4. Очистка только неиспользуемых данных
```bash
# Только остановленные контейнеры
docker container prune -f

# Только неиспользуемые образы
docker image prune -a -f

# Только неиспользуемые volumes
docker volume prune -f

# Только build cache
docker builder prune -a -f
```

## Полезные команды

```bash
# Список всех контейнеров (включая остановленные)
docker ps -a

# Список всех образов
docker images

# Список всех volumes
docker volume ls

# Размер каждого образа
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Размер каждого volume
docker system df -v
```

## Дополнительная информация

- WSL2 использует виртуальный диск `ext4.vhdx`, который динамически расширяется, но не сжимается автоматически
- Файл находится в: `%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx`
- После очистки Docker данных обязательно нужно сжать диск через `diskpart` или `Optimize-VHD`
- **Рекомендуемый метод:** использование `diskpart` с командой `compact vdisk` (проверено и работает)

