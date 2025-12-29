# Команды для работы с PostgreSQL в Docker контейнере

## Подключение к базе данных

### Способ 1: Интерактивный режим через psql
```bash
docker-compose exec postgres psql -U musician -d music_app
```

### Способ 2: Выполнение одной команды
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT * FROM users;"
```

## Полезные SQL команды

### Просмотр всех таблиц
```sql
\dt
```

### Просмотр структуры таблицы users
```sql
\d users
```

### Просмотр всех пользователей
```sql
SELECT * FROM users;
```

### Просмотр пользователей с ограничением
```sql
SELECT id, email, username, role, "createdAt" FROM users LIMIT 10;
```

### Подсчет пользователей
```sql
SELECT COUNT(*) FROM users;
```

### Удаление пользователя по email
```sql
DELETE FROM users WHERE email = 'kek2@mail.com';
```

### Удаление пользователя по id
```sql
DELETE FROM users WHERE id = 'uuid-здесь';
```

### Удаление всех пользователей (осторожно!)
```sql
DELETE FROM users;
```

### Поиск пользователя по email
```sql
SELECT * FROM users WHERE email = 'kek2@mail.com';
```

### Обновление роли пользователя
```sql
UPDATE users SET role = 'admin' WHERE email = 'kek2@mail.com';
```

### Выход из psql
```sql
\q
```

## Прямые команды через docker-compose

### Просмотр всех пользователей
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT id, email, username, role, \"createdAt\" FROM users;"
```

### Удаление пользователя
```bash
docker-compose exec postgres psql -U musician -d music_app -c "DELETE FROM users WHERE email = 'kek2@mail.com';"
```

### Подсчет записей
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT COUNT(*) FROM users;"
```

## Подключение через внешний клиент

### Параметры подключения:
- **Host:** localhost
- **Port:** 5432
- **Database:** music_app
- **Username:** musician
- **Password:** secret

### Популярные клиенты:
- **pgAdmin** (веб-интерфейс): https://www.pgadmin.org/
- **DBeaver** (десктоп): https://dbeaver.io/
- **TablePlus** (десктоп): https://tableplus.com/
- **DataGrip** (JetBrains): https://www.jetbrains.com/datagrip/

## Полезные команды Docker

### Просмотр логов PostgreSQL
```bash
docker-compose logs postgres
```

### Остановка базы данных
```bash
docker-compose stop postgres
```

### Удаление базы данных (осторожно! удалит все данные)
```bash
docker-compose down -v
```

### Резервное копирование базы данных
```bash
docker-compose exec postgres pg_dump -U musician music_app > backup.sql
```

### Восстановление из резервной копии
```bash
docker-compose exec -T postgres psql -U musician -d music_app < backup.sql
```

