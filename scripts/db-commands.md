docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.dropDatabase()"
docker-compose exec postgres psql -U musician -d music_app -c "delete from auth_users;"
docker-compose exec postgres psql -U musician -d music_app -c "SELECT * FROM auth_users"

# Команды для работы с PostgreSQL в Docker контейнере

## Подключение к базе данных

### Способ 1: Интерактивный режим через psql
```bash
docker-compose exec postgres psql -U musician -d music_app
```

### Способ 2: Выполнение одной команды
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT * FROM auth_users;"
```

## Полезные SQL команды

### Просмотр всех таблиц
```sql
\dt
```

### Просмотр структуры таблицы auth_users
```sql
\d users
```

### Просмотр всех пользователей
```sql
SELECT * FROM auth_users;
```

### Просмотр пользователей с ограничением
```sql
SELECT id, email, username, role, "createdAt" FROM auth_users LIMIT 10;
```

### Подсчет пользователей
```sql
SELECT COUNT(*) FROM auth_users;
```

### Удаление пользователя по email
```sql
DELETE FROM auth_users WHERE email = 'kek3@mail.com';
```

### Удаление пользователя по id
```sql
DELETE FROM auth_users WHERE id = 'uuid-здесь';
```

### Удаление всех пользователей (осторожно!)
```sql
DELETE FROM auth_users;
```

### Поиск пользователя по email
```sql
SELECT * FROM auth_users WHERE email = 'kek2@mail.com';
```

### Обновление роли пользователя
```sql
UPDATE auth_users SET role = 'admin' WHERE email = 'kek2@mail.com';
```

### Выход из psql
```sql
\q
```

## Прямые команды через docker-compose

### Просмотр всех пользователей
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT id, email, username, role, \"createdAt\" FROM auth_users;"
```

### Удаление пользователя
```bash
docker-compose exec postgres psql -U musician -d music_app -c "DELETE FROM auth_users WHERE email = 'kek2@mail.com';"
```

### Подсчет записей
```bash
docker-compose exec postgres psql -U musician -d music_app -c "SELECT COUNT(*) FROM auth_users;"
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

---

# Команды для работы с MongoDB в Docker контейнере

## Подключение к базе данных

### Способ 1: Интерактивный режим через mongosh
```bash
docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app
```

### Способ 2: Выполнение одной команды
```bash
docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.find().pretty()"
```

## Полезные MongoDB команды

### Просмотр всех коллекций
```javascript
show collections
```

### Просмотр всех профилей
```javascript
db.userprofiles.find().pretty()
```

### Просмотр профилей с ограничением
```javascript
db.userprofiles.find().limit(10).pretty()
```

### Подсчет профилей
```javascript
db.userprofiles.countDocuments()
```

### Поиск профиля по userId
```javascript
db.userprofiles.findOne({ userId: "uuid-здесь" })
```

### Поиск профиля по username
```javascript
db.userprofiles.findOne({ username: "username" })
```

### Удаление профиля по userId
```javascript
db.userprofiles.deleteOne({ userId: "uuid-здесь" })
```

### Удаление профиля по username
```javascript
db.userprofiles.deleteOne({ username: "username" })
```

### Удаление всех профилей (осторожно!)
```javascript
db.userprofiles.deleteMany({})
```

### Обновление профиля
```javascript
db.userprofiles.updateOne(
  { userId: "uuid-здесь" },
  { $set: { role: "admin" } }
)
```

### Выход из mongosh
```javascript
exit
```

## Прямые команды через docker-compose

### Просмотр всех профилей
```bash
docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.find().pretty()"
```

### Удаление всех профилей
```bash
docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.deleteMany({})"
```

### Подсчет записей
```bash
docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app --eval "db.userprofiles.countDocuments()"
```

## Готовые скрипты

### Удаление всех профилей
**Linux/Mac:**
```bash
./scripts/db-delete-mongo-profiles.sh
```

**Windows:**
```cmd
scripts\db-delete-mongo-profiles.bat
```

### Просмотр всех профилей
**Linux/Mac:**
```bash
./scripts/db-view-mongo-profiles.sh
```

**Windows:**
```cmd
scripts\db-view-mongo-profiles.bat
```

### Подсчет профилей
**Linux/Mac:**
```bash
./scripts/db-count-mongo-profiles.sh
```

**Windows:**
```cmd
scripts\db-count-mongo-profiles.bat
```

### Интерактивное подключение
**Linux/Mac:**
```bash
./scripts/db-connect-mongo.sh
```

**Windows:**
```cmd
scripts\db-connect-mongo.bat
```

## Подключение через внешний клиент

### Параметры подключения:
- **Host:** localhost
- **Port:** 27017
- **Database:** music_app
- **Username:** root
- **Password:** secret
- **Authentication Database:** admin

### Популярные клиенты:
- **MongoDB Compass** (официальный GUI): https://www.mongodb.com/products/compass
- **Studio 3T** (десктоп): https://studio3t.com/
- **NoSQLBooster** (десктоп): https://www.nosqlbooster.com/
- **TablePlus** (десктоп): https://tableplus.com/

## Полезные команды Docker

### Просмотр логов MongoDB
```bash
docker-compose logs mongodb
```

### Остановка базы данных
```bash
docker-compose stop mongodb
```

### Резервное копирование базы данных
```bash
docker-compose exec mongodb mongodump -u root -p secret --authenticationDatabase admin --db music_app --out /backup
docker cp $(docker-compose ps -q mongodb):/backup ./mongodb-backup
```

### Восстановление из резервной копии
```bash
docker cp ./mongodb-backup $(docker-compose ps -q mongodb):/backup
docker-compose exec mongodb mongorestore -u root -p secret --authenticationDatabase admin --db music_app /backup/music_app
```

