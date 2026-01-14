# План доработки приложения

## Обзор

Текущее приложение умеет создавать пользователей в системе. Требуется добавить функциональность:
- Загрузка аватарки пользователя
- Загрузка аудиозаписей пользователя для их прослушивания
- Просмотр страниц других пользователей
- Подписка на обновления других пользователей

## Новые микросервисы

### 1. Media Service (микросервис для работы с файлами)

**Назначение:** Обработка загрузки, хранения и выдачи медиафайлов (аватары, аудиозаписи, обложки)

**Технологии:**
- NestJS микросервис
- MongoDB для метаданных файлов
- Локальное хранилище или S3-совместимое хранилище (MinIO) для файлов
- RabbitMQ для коммуникации

**Структура:**
```
microservices/media/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── media.module.ts
│   ├── media.controller.ts
│   ├── media.service.ts
│   ├── storage.service.ts (работа с файловой системой/S3)
│   └── media.entity.ts (MongoDB схема)
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Функциональность:**

1. **Загрузка файлов:**
   - `POST /media/upload/avatar` - загрузка аватарки
   - `POST /media/upload/track` - загрузка аудиозаписи
   - `POST /media/upload/cover` - загрузка обложки трека
   - Валидация типов файлов (изображения: jpg, png, webp; аудио: mp3, wav, flac)
   - Валидация размера файлов
   - Генерация уникальных имен файлов
   - Сохранение метаданных в MongoDB

2. **Получение файлов:**
   - `GET /media/file/:fileId` - получение файла по ID
   - `GET /media/avatar/:userId` - получение аватарки пользователя
   - `GET /media/track/:trackId` - получение аудиозаписи
   - Поддержка range requests для стриминга аудио
   - Кэширование через Redis

3. **Удаление файлов:**
   - `DELETE /media/file/:fileId` - удаление файла
   - Очистка связанных метаданных

**MongoDB схема MediaFile:**
```typescript
{
  fileId: string (UUID)
  userId: string
  type: 'avatar' | 'track' | 'cover' | 'other'
  originalName: string
  fileName: string (уникальное имя в хранилище)
  mimeType: string
  size: number
  path: string (путь в хранилище)
  url: string (публичный URL)
  metadata: {
    duration?: number (для аудио)
    bitrate?: number
    format?: string
    width?: number (для изображений)
    height?: number
  }
  createdAt: Date
  updatedAt: Date
}
```

**RabbitMQ команды:**
- `{ cmd: 'uploadFile' }` - загрузка файла
- `{ cmd: 'getFileById' }` - получение файла по ID
- `{ cmd: 'getUserAvatar' }` - получение аватарки пользователя
- `{ cmd: 'deleteFile' }` - удаление файла
- `{ cmd: 'getUserTracks' }` - получение всех треков пользователя

**Интеграция с User Service:**
- После загрузки аватарки обновлять `avatarUrl` в профиле пользователя
- После загрузки трека обновлять `stats.tracksCount` в профиле

---

### 2. Social Service (микросервис для связей пользователей)

**Назначение:** Управление подписками, фолловерами и социальными связями между пользователями

**Технологии:**
- NestJS микросервис
- MongoDB для хранения связей
- Redis для кэширования списков подписок
- RabbitMQ для коммуникации

**Структура:**
```
microservices/social/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── social.module.ts
│   ├── social.controller.ts
│   ├── social.service.ts
│   ├── follow.entity.ts (MongoDB схема)
│   └── feed.service.ts (лента обновлений)
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Функциональность:**

1. **Управление подписками:**
   - `POST /social/follow/:userId` - подписаться на пользователя
   - `DELETE /social/unfollow/:userId` - отписаться от пользователя
   - `GET /social/followers/:userId` - получить список подписчиков
   - `GET /social/following/:userId` - получить список подписок
   - `GET /social/isFollowing/:followerId/:followingId` - проверить подписку
   - Обновление счетчиков `followersCount` и `followingCount` в User Service

2. **Лента обновлений:**
   - `GET /social/feed/:userId` - получить ленту обновлений пользователя
   - События при публикации нового трека
   - Кэширование ленты в Redis

3. **Публичные страницы:**
   - `GET /social/profile/:username` - получить публичную страницу пользователя
   - Включает: профиль, треки, статистику, подписки/подписчиков
   - Учет настройки `privateProfile`

**MongoDB схема Follow:**
```typescript
{
  _id: ObjectId
  followerId: string (userId подписчика)
  followingId: string (userId на кого подписались)
  createdAt: Date
  // Составной индекс на (followerId, followingId) для уникальности
}
```

**RabbitMQ команды:**
- `{ cmd: 'followUser' }` - подписаться
- `{ cmd: 'unfollowUser' }` - отписаться
- `{ cmd: 'getFollowers' }` - получить подписчиков
- `{ cmd: 'getFollowing' }` - получить подписки
- `{ cmd: 'checkFollowStatus' }` - проверить статус подписки
- `{ cmd: 'getUserFeed' }` - получить ленту
- `{ cmd: 'getPublicProfile' }` - получить публичный профиль

**События (EventPattern):**
- `user.track.published` - при публикации нового трека (для обновления ленты)
- `user.profile.updated` - при обновлении профиля

**Интеграция с User Service:**
- Обновление счетчиков `followersCount` и `followingCount`
- Получение данных профиля для публичных страниц

---

## Изменения в существующих сервисах

### User Service

**Дополнительные методы:**

1. **Обновление счетчиков:**
   - `updateFollowersCount(userId: string, delta: number)` - обновить счетчик подписчиков
   - `updateFollowingCount(userId: string, delta: number)` - обновить счетчик подписок
   - `updateTracksCount(userId: string, delta: number)` - обновить счетчик треков
   - `updateTotalPlays(userId: string, delta: number)` - обновить счетчик прослушиваний

2. **RabbitMQ команды:**
   - `{ cmd: 'updateFollowersCount' }`
   - `{ cmd: 'updateFollowingCount' }`
   - `{ cmd: 'updateTracksCount' }`
   - `{ cmd: 'updateTotalPlays' }`

3. **Публичные методы:**
   - `getPublicProfile(username: string, viewerId?: string)` - получить публичный профиль с учетом приватности

### API Gateway

**Новые эндпоинты:**

1. **Media:**
   - `POST /media/upload/avatar` - загрузка аватарки (multipart/form-data)
   - `POST /media/upload/track` - загрузка трека (multipart/form-data)
   - `GET /media/avatar/:userId` - получение аватарки
   - `GET /media/track/:trackId` - стриминг аудио (с поддержкой range requests)
   - `GET /media/file/:fileId` - получение файла
   - `DELETE /media/file/:fileId` - удаление файла

2. **Social:**
   - `POST /social/follow/:userId` - подписаться
   - `DELETE /social/unfollow/:userId` - отписаться
   - `GET /social/followers/:userId` - список подписчиков
   - `GET /social/following/:userId` - список подписок
   - `GET /social/profile/:username` - публичная страница пользователя
   - `GET /social/feed` - лента обновлений текущего пользователя

3. **User (расширение):**
   - `GET /users/:username/tracks` - получить треки пользователя
   - `GET /users/:username/public` - публичная страница (альтернативный путь)

**Обновление AppModule:**
- Добавить клиент `MEDIA_SERVICE` для RabbitMQ
- Добавить клиент `SOCIAL_SERVICE` для RabbitMQ

**Обновление AppService:**
- Методы для проксирования запросов к Media и Social сервисам

---

## Обновление shared типов

### Новые типы в `shared/types/`

**media.ts:**
```typescript
export interface IMediaFile {
  fileId: string;
  userId: string;
  type: 'avatar' | 'track' | 'cover' | 'other';
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    width?: number;
    height?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUploadFileDto {
  userId: string;
  type: 'avatar' | 'track' | 'cover';
  file: Express.Multer.File;
}

export interface IGetFileDto {
  fileId: string;
}
```

**social.ts:**
```typescript
export interface IFollow {
  _id?: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
}

export interface IFollowDto {
  followerId: string;
  followingId: string;
}

export interface IPublicProfile {
  profile: IUserProfile;
  tracks: IMediaFile[];
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean; // для текущего пользователя
  isOwnProfile?: boolean;
}

export interface IFeedItem {
  userId: string;
  username: string;
  avatarUrl?: string;
  action: 'track_published' | 'profile_updated';
  trackId?: string;
  trackTitle?: string;
  createdAt: Date;
}
```

---

## Обновление docker-compose.yml

**Добавить сервисы:**

```yaml
media:
  build:
    context: .
    dockerfile: ./microservices/media/Dockerfile
    target: development
  ports:
    - "3003:3003"
  volumes:
    - ./microservices/media/src:/app/src
    - ./microservices/media/package.json:/app/package.json
    - ./microservices/media/tsconfig.json:/app/tsconfig.json
    - ./microservices/media/tsconfig.build.json:/app/tsconfig.build.json
    - ./microservices/media/nest-cli.json:/app/nest-cli.json
    - ./microservices/media/nodemon.json:/app/nodemon.json
    - ./shared:/app/shared
    - /app/node_modules
    - uploads_volume:/app/uploads  # для хранения файлов
  depends_on:
    mongodb:
      condition: service_healthy
    redis:
      condition: service_started
    rabbitmq:
      condition: service_healthy
  environment:
    - NODE_ENV=development
    - MONGODB_URL=mongodb://root:secret@mongodb:27017/music_app?authSource=admin
    - REDIS_URL=redis://redis:6379
    - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    - MEDIA_QUEUE=media_queue
    - UPLOAD_DIR=/app/uploads
  restart: unless-stopped

social:
  build:
    context: .
    dockerfile: ./microservices/social/Dockerfile
    target: development
  ports:
    - "3004:3004"
  volumes:
    - ./microservices/social/src:/app/src
    - ./microservices/social/package.json:/app/package.json
    - ./microservices/social/tsconfig.json:/app/tsconfig.json
    - ./microservices/social/tsconfig.build.json:/app/tsconfig.build.json
    - ./microservices/social/nest-cli.json:/app/nest-cli.json
    - ./microservices/social/nodemon.json:/app/nodemon.json
    - ./shared:/app/shared
    - /app/node_modules
  depends_on:
    mongodb:
      condition: service_healthy
    redis:
      condition: service_started
    rabbitmq:
      condition: service_healthy
    user:
      condition: service_started
  environment:
    - NODE_ENV=development
    - MONGODB_URL=mongodb://root:secret@mongodb:27017/music_app?authSource=admin
    - REDIS_URL=redis://redis:6379
    - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    - SOCIAL_QUEUE=social_queue
    - USER_QUEUE=user_queue
  restart: unless-stopped
```

**Обновить api-gateway:**
- Добавить зависимости от `media` и `social`
- Добавить переменные окружения `MEDIA_QUEUE` и `SOCIAL_QUEUE`

---

## MongoDB схемы (shared/schemas/)

**media-file.schema.ts:**
```typescript
@Schema({ timestamps: true })
export class MediaFile {
  @Prop({ required: true, unique: true, index: true })
  fileId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['avatar', 'track', 'cover', 'other'] })
  type: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true, unique: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  url: string;

  @Prop({
    type: {
      duration: Number,
      bitrate: Number,
      format: String,
      width: Number,
      height: Number,
    },
  })
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
    width?: number;
    height?: number;
  };
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
```

**follow.schema.ts:**
```typescript
@Schema({ timestamps: true })
export class Follow {
  @Prop({ required: true, index: true })
  followerId: string;

  @Prop({ required: true, index: true })
  followingId: string;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// Составной индекс для уникальности пары (followerId, followingId)
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
```

---

## Порядок реализации

### Этап 1: Media Service
1. Создать структуру микросервиса media
2. Реализовать загрузку файлов (аватары)
3. Реализовать получение файлов
4. Интегрировать с User Service для обновления avatarUrl
5. Добавить загрузку треков
6. Реализовать стриминг аудио с range requests

### Этап 2: Social Service
1. Создать структуру микросервиса social
2. Реализовать подписки/отписки
3. Обновить счетчики в User Service
4. Реализовать получение списков подписчиков/подписок
5. Реализовать публичные страницы пользователей
6. Реализовать ленту обновлений

### Этап 3: Интеграция
1. Обновить API Gateway с новыми эндпоинтами
2. Добавить аутентификацию для защищенных эндпоинтов
3. Обновить docker-compose.yml
4. Тестирование всей системы

---

## Дополнительные улучшения (опционально)

1. **CDN для медиафайлов:** Интеграция с CloudFlare/S3 для раздачи файлов
2. **Обработка изображений:** Автоматическое создание thumbnails для аватарок
3. **Транскодирование аудио:** Конвертация в разные форматы/битрейты
4. **Уведомления:** Сервис уведомлений о новых подписчиках/треках
5. **Поиск:** Elasticsearch для поиска пользователей и треков
6. **Аналитика:** Отслеживание прослушиваний треков

---

## Примечания

- Все файлы должны валидироваться на тип и размер
- Необходимо реализовать rate limiting для загрузки файлов
- Для аудиофайлов требуется поддержка range requests для стриминга
- Кэширование через Redis для часто запрашиваемых данных
- Логирование всех операций с файлами
- Обработка ошибок и откат транзакций при сбоях

