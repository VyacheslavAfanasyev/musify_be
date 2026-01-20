# Команды для работы с базами данных

## PostgreSQL (Auth Service)

### Подключение
```bash
docker-compose exec postgres_auth psql -U auth_user -d auth_db
```

### Просмотр пользователей
```bash
docker-compose exec postgres_auth psql -U auth_user -d auth_db -c "SELECT * FROM auth_users"
```

### Удаление всех пользователей
```bash
docker-compose exec postgres_auth psql -U auth_user -d auth_db -c "DELETE FROM auth_users;"
```

### Подсчет пользователей
```bash
docker-compose exec postgres_auth psql -U auth_user -d auth_db -c "SELECT COUNT(*) FROM auth_users;"
```

**Параметры подключения:**
- Host: localhost
- Port: 5432
- Database: auth_db
- Username: auth_user
- Password: secret

---

## MongoDB (User Service)

### Подключение
```bash
docker-compose exec mongodb_user mongosh -u root -p secret --authenticationDatabase admin user_db
```

### Просмотр профилей
```bash
docker-compose exec mongodb_user mongosh -u root -p secret --authenticationDatabase admin user_db --eval "db.userprofiles.find().pretty()"
```

### Удаление всех профилей
```bash
docker-compose exec mongodb_user mongosh -u root -p secret --authenticationDatabase admin user_db --eval "db.userprofiles.deleteMany({})"
```

### Подсчет профилей
```bash
docker-compose exec mongodb_user mongosh -u root -p secret --authenticationDatabase admin user_db --eval "db.userprofiles.countDocuments()"
```

**Параметры подключения:**
- Host: localhost
- Port: 27017
- Database: user_db
- Username: root
- Password: secret
- Auth Database: admin

---

## MongoDB (Media Service)

### Подключение
```bash
docker-compose exec mongodb_media mongosh -u root -p secret --authenticationDatabase admin media_db
```

### Просмотр медиафайлов
```bash
docker-compose exec mongodb_media mongosh -u root -p secret --authenticationDatabase admin media_db --eval "db.mediafiles.find().pretty()"
```

### Удаление всех медиафайлов
```bash
docker-compose exec mongodb_media mongosh -u root -p secret --authenticationDatabase admin media_db --eval "db.mediafiles.deleteMany({})"
```

**Параметры подключения:**
- Host: localhost
- Port: 27018
- Database: media_db
- Username: root
- Password: secret
- Auth Database: admin

---

## MongoDB (Social Service)

### Подключение
```bash
docker-compose exec mongodb_social mongosh -u root -p secret --authenticationDatabase admin social_db
```

### Просмотр подписок
```bash
docker-compose exec mongodb_social mongosh -u root -p secret --authenticationDatabase admin social_db --eval "db.follows.find().pretty()"
```

**Параметры подключения:**
- Host: localhost
- Port: 27019
- Database: social_db
- Username: root
- Password: secret
- Auth Database: admin
