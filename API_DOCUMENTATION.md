# API Документация - PET Backend

## Базовый URL
```
http://localhost:3000
```

## Общая информация

Backend использует микросервисную архитектуру с API Gateway. Все запросы к API проходят через Gateway на порту 3000.

### Формат ответов

Все ответы API возвращаются в следующем формате:

**Успешный ответ:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Ошибка:**
```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

### Аутентификация

Большинство эндпоинтов требуют передачи `userId` в теле запроса или параметрах. Токены JWT используются для аутентификации (получаются через `/auth/login`).

---

## 1. Аутентификация (Authentication)

### 1.1 Регистрация пользователя

**POST** `/auth/register`

Создает нового пользователя и его профиль.

**Rate Limit:** 5 запросов в минуту

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "role": "musician" // опционально: "musician" | "listener"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "musician"
  }
}
```

**Response (400/409):**
```json
{
  "success": false,
  "error": "Email already exists"
}
```

---

### 1.2 Вход в систему

**POST** `/auth/login`

Аутентифицирует пользователя и возвращает токены доступа.

**Rate Limit:** 5 запросов в минуту

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "musician"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 1.3 Обновление токенов

**POST** `/auth/refresh`

Обновляет пару access/refresh токенов.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### 1.4 Выход из системы

**POST** `/auth/logout`

Инвалидирует refresh токен.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### 1.5 Смена пароля

**POST** `/auth/change_pass`

Изменяет пароль пользователя.

**Request Body:**
```json
{
  "userId": "uuid",
  "oldPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## 2. Профили пользователей (User Profiles)

### 2.1 Получить профиль по ID

**GET** `/users/:id/profile`

Получает профиль пользователя по его ID.

**Path Parameters:**
- `id` (string, required) - UUID пользователя

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "mongodb_id",
    "userId": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "bio": "Musician from Moscow",
    "avatarUrl": "http://localhost:3000/media/avatar/userId",
    "coverImageUrl": "http://localhost:3000/media/file/fileId",
    "location": "Moscow, Russia",
    "genres": ["rock", "jazz"],
    "instruments": ["guitar", "piano"],
    "socialLinks": {
      "youtube": "https://youtube.com/@johndoe",
      "vk": "https://vk.com/johndoe",
      "telegram": "@johndoe"
    },
    "stats": {
      "tracksCount": 15,
      "followersCount": 120,
      "followingCount": 45,
      "totalPlays": 1250
    },
    "preferences": {
      "emailNotifications": true,
      "showOnlineStatus": true,
      "privateProfile": false
    },
    "role": "musician",
    "following": ["uuid1", "uuid2"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 2.2 Получить профиль по username

**GET** `/users/username/:username`

Получает профиль пользователя по его username.

**Path Parameters:**
- `username` (string, required) - Username пользователя

**Response:** Аналогично `/users/:id/profile`

---

### 2.3 Получить список всех пользователей

**GET** `/users?excludeUserId=uuid`

Получает список всех пользователей в системе.

**Query Parameters:**
- `excludeUserId` (string, optional) - ID пользователя, которого нужно исключить из списка (обычно ID текущего пользователя)

**Response (200 OK):**
```json
{
  "success": true,
  "profiles": [
    {
      "_id": "mongodb_id",
      "userId": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "bio": "Musician from Moscow",
      "avatarUrl": "http://localhost:3000/media/avatar/userId",
      "coverImageUrl": "http://localhost:3000/media/file/fileId",
      "location": "Moscow, Russia",
      "genres": ["rock", "jazz"],
      "instruments": ["guitar", "piano"],
      "socialLinks": {
        "youtube": "https://youtube.com/@johndoe",
        "vk": "https://vk.com/johndoe",
        "telegram": "@johndoe"
      },
      "stats": {
        "tracksCount": 15,
        "followersCount": 120,
        "followingCount": 45,
        "totalPlays": 1250
      },
      "preferences": {
        "emailNotifications": true,
        "showOnlineStatus": true,
        "privateProfile": false
      },
      "role": "musician",
      "following": ["uuid1", "uuid2"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    },
    {
      "_id": "mongodb_id_2",
      "userId": "uuid_2",
      "username": "janedoe",
      "displayName": "Jane Doe",
      ...
    }
  ]
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "User Service is temporarily unavailable. Please try again later."
}
```

**Примечание:** 
- Если указан параметр `excludeUserId`, пользователь с этим ID будет исключен из списка результатов.
- Рекомендуется использовать для отображения списка пользователей, поиска и навигации по профилям.
- Обычно используется с параметром `excludeUserId`, чтобы исключить текущего пользователя из списка других пользователей.

---

### 2.4 Получить публичный профиль

**GET** `/users/:username/public?viewerId=uuid`

Получает публичный профиль пользователя с дополнительной информацией для просматривающего пользователя.

**Path Parameters:**
- `username` (string, required) - Username пользователя

**Query Parameters:**
- `viewerId` (string, optional) - ID пользователя, который просматривает профиль

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profile": { ... }, // IUserProfile
    "tracks": [ ... ], // IMediaFileResponse[]
    "followersCount": 120,
    "followingCount": 45,
    "isFollowing": true, // для viewerId
    "isOwnProfile": false // для viewerId
  }
}
```

---

### 2.5 Получить треки пользователя

**GET** `/users/:username/tracks`

Получает список всех треков пользователя.

**Path Parameters:**
- `username` (string, required) - Username пользователя

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "fileId": "file_id",
      "userId": "uuid",
      "type": "track",
      "originalName": "my-song.mp3",
      "fileName": "generated_filename.mp3",
      "mimeType": "audio/mpeg",
      "size": 5242880,
      "url": "http://localhost:3000/media/track/trackId",
      "metadata": {
        "duration": 180,
        "bitrate": 320,
        "format": "mp3"
      },
      "createdAt": "2024-01-10T00:00:00.000Z"
    }
  ]
}
```

---

### 2.6 Получить все аудиофайлы пользователя

**GET** `/users/:username/audio-files`

Получает список всех загруженных аудиофайлов пользователя (включая треки и другие аудиофайлы с mimeType, начинающимся с "audio/").

**Path Parameters:**
- `username` (string, required) - Username пользователя

**Response (200 OK):**
```json
{
  "success": true,
  "audioFiles": [
    {
      "fileId": "file_id",
      "userId": "uuid",
      "type": "track",
      "originalName": "my-song.mp3",
      "fileName": "generated_filename.mp3",
      "mimeType": "audio/mpeg",
      "size": 5242880,
      "url": "http://localhost:3000/media/track/trackId",
      "metadata": {
        "duration": 180,
        "bitrate": 320,
        "format": "mp3"
      },
      "createdAt": "2024-01-10T00:00:00.000Z",
      "updatedAt": "2024-01-10T00:00:00.000Z"
    },
    {
      "fileId": "file_id_2",
      "userId": "uuid",
      "type": "other",
      "originalName": "podcast.mp3",
      "fileName": "generated_filename_2.mp3",
      "mimeType": "audio/mpeg",
      "size": 10485760,
      "url": "http://localhost:3000/media/file/fileId",
      "metadata": {
        "duration": 360,
        "bitrate": 128,
        "format": "mp3"
      },
      "createdAt": "2024-01-12T00:00:00.000Z",
      "updatedAt": "2024-01-12T00:00:00.000Z"
    }
  ]
}
```

**Примечание:** В отличие от `/users/:username/tracks`, который возвращает только файлы с типом "track", этот эндпоинт возвращает все файлы пользователя с mimeType, начинающимся с "audio/", независимо от типа файла.

---

### 2.7 Обновить профиль

**PUT** `/users/:id/profile`

Обновляет данные профиля пользователя.

**Path Parameters:**
- `id` (string, required) - UUID пользователя

**Request Body:**
```json
{
  "displayName": "John Doe Updated",
  "bio": "Updated bio",
  "location": "Saint Petersburg, Russia",
  "genres": ["rock", "jazz", "blues"],
  "instruments": ["guitar"],
  "socialLinks": {
    "youtube": "https://youtube.com/@newchannel",
    "vk": "https://vk.com/newprofile"
  },
  "preferences": {
    "emailNotifications": false,
    "showOnlineStatus": true,
    "privateProfile": true
  }
}
```

**Все поля опциональны.** Можно обновлять только нужные поля.

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... } // Обновленный профиль
}
```

---

## 3. Медиа файлы (Media)

### 3.1 Загрузить аватар

**POST** `/media/upload/avatar`

Загружает аватар пользователя.

**Rate Limit:** 10 запросов в минуту

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `file` (File, required) - Изображение (JPG, PNG, WebP)
- `userId` (string, required) - UUID пользователя
- `type` (string, optional) - Тип файла

**Response (200 OK):**
```json
{
  "success": true,
  "file": {
    "fileId": "file_id",
    "userId": "uuid",
    "type": "avatar",
    "originalName": "avatar.jpg",
    "fileName": "generated_filename.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "url": "http://localhost:3000/media/avatar/userId",
    "metadata": {
      "width": 500,
      "height": 500,
      "format": "jpeg"
    },
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "File is required"
}
```

---

### 3.2 Загрузить трек

**POST** `/media/upload/track`

Загружает аудио трек.

**Rate Limit:** 5 запросов в минуту

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `file` (File, required) - Аудио файл (MP3, WAV, OGG, M4A)
- `userId` (string, required) - UUID пользователя
- `type` (string, optional) - Тип файла

**Response (200 OK):**
```json
{
  "success": true,
  "file": {
    "fileId": "file_id",
    "userId": "uuid",
    "type": "track",
    "originalName": "my-song.mp3",
    "fileName": "generated_filename.mp3",
    "mimeType": "audio/mpeg",
    "size": 5242880,
    "url": "http://localhost:3000/media/track/trackId",
    "metadata": {
      "duration": 180,
      "bitrate": 320,
      "format": "mp3"
    },
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 3.3 Загрузить обложку трека

**POST** `/media/upload/cover`

Загружает обложку для трека.

**Rate Limit:** 10 запросов в минуту

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `file` (File, required) - Изображение (JPG, PNG, WebP)
- `userId` (string, required) - UUID пользователя
- `type` (string, optional) - Тип файла

**Response:** Аналогично загрузке аватара

---

### 3.4 Получить аватар пользователя

**GET** `/media/avatar/:userId`

Получает аватар пользователя как бинарный файл.

**Path Parameters:**
- `userId` (string, required) - UUID пользователя

**Response (200 OK):**
- Content-Type: `image/jpeg` (или другой тип изображения)
- Binary data (изображение)

**Response (404):**
```json
{
  "success": false,
  "error": "Avatar not found"
}
```

---

### 3.5 Получить трек

**GET** `/media/track/:trackId`

Получает аудио трек с поддержкой стриминга (Range requests).

**Path Parameters:**
- `trackId` (string, required) - ID трека

**Headers (опционально):**
- `Range: bytes=0-1048575` - Для частичного получения файла (1MB chunks)

**Response (200 OK или 206 Partial Content):**
- Content-Type: `audio/mpeg` (или другой тип аудио)
- Accept-Ranges: `bytes`
- Content-Length: размер файла или части
- Binary data (аудио файл)

**Response (206 Partial Content) при Range запросе:**
- Content-Range: `bytes 0-1048575/5242880`
- Частичный контент

**Response (404):**
```json
{
  "success": false,
  "error": "Track not found"
}
```

---

### 3.6 Получить обложку трека

**GET** `/media/cover/:trackId`

Получает обложку трека как бинарный файл.

**Path Parameters:**
- `trackId` (string, required) - ID трека

**Response:** Аналогично `/media/avatar/:userId`

---

### 3.7 Получить файл по ID

**GET** `/media/file/:fileId`

Получает любой медиа файл по его ID.

**Path Parameters:**
- `fileId` (string, required) - ID файла

**Response:** Бинарный файл с соответствующим Content-Type

---

### 3.8 Удалить файл

**DELETE** `/media/file/:fileId`

Удаляет любой медиа файл (изображения, аудио, видео и т.д.).

**Path Parameters:**
- `fileId` (string, required) - ID файла

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "File not found"
}
```

**Примечание:** При удалении трека автоматически обновляется счетчик треков пользователя (`tracksCount`).

---

### 3.9 Удалить трек (аудио файл)

**DELETE** `/media/track/:trackId`

Удаляет аудио трек. Является удобным алиасом для `/media/file/:fileId`, специально предназначенным для удаления треков.

**Path Parameters:**
- `trackId` (string, required) - ID трека (fileId)

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "File not found"
}
```

**Примечание:** 
- При удалении трека автоматически отправляется событие `media.track.deleted`, которое обновляет счетчик треков пользователя (`tracksCount`) в профиле.
- Удаляется как файл с диска, так и запись из базы данных.
- Инвалидируется кэш, связанный с этим треком.

---

## 4. Социальные функции (Social)

### 4.1 Подписаться на пользователя

**POST** `/social/follow/:userId`

Подписывается на пользователя.

**Path Parameters:**
- `userId` (string, required) - ID пользователя, на которого подписываются

**Request Body:**
```json
{
  "followerId": "uuid" // ID пользователя, который подписывается
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "mongodb_id",
    "followerId": "uuid",
    "followingId": "uuid",
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 4.2 Отписаться от пользователя

**POST** `/social/unfollow/:userId`  
**DELETE** `/social/unfollow/:userId`

Отписывается от пользователя. Оба метода работают одинаково.

**Path Parameters:**
- `userId` (string, required) - ID пользователя, от которого отписываются

**Request Body:**
```json
{
  "followerId": "uuid" // ID пользователя, который отписывается
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### 4.3 Получить подписчиков

**GET** `/social/followers/:userId`

Получает список подписчиков пользователя.

**Path Parameters:**
- `userId` (string, required) - ID пользователя

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "mongodb_id",
      "followerId": "uuid",
      "followingId": "uuid",
      "createdAt": "2024-01-10T00:00:00.000Z"
    }
  ]
}
```

---

### 4.4 Получить подписки

**GET** `/social/following/:userId`

Получает список пользователей, на которых подписан данный пользователь.

**Path Parameters:**
- `userId` (string, required) - ID пользователя

**Response:** Аналогично `/social/followers/:userId`

---

### 4.5 Проверить подписку

**GET** `/social/isFollowing/:followerId/:followingId`

Проверяет, подписан ли один пользователь на другого.

**Path Parameters:**
- `followerId` (string, required) - ID пользователя, который может быть подписан
- `followingId` (string, required) - ID пользователя, на которого может быть подписка

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isFollowing": true
  }
}
```

---

### 4.6 Получить публичный профиль (Social)

**GET** `/social/profile/:username?viewerId=uuid`

Получает публичный профиль пользователя с социальной информацией.

**Path Parameters:**
- `username` (string, required) - Username пользователя

**Query Parameters:**
- `viewerId` (string, optional) - ID пользователя, который просматривает профиль

**Response:** Аналогично `/users/:username/public`

---

### 4.7 Получить ленту пользователя

**GET** `/social/feed?userId=uuid`

Получает ленту активности пользователей, на которых подписан текущий пользователь.

**Query Parameters:**
- `userId` (string, required) - ID пользователя, для которого получается лента

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "avatarUrl": "http://localhost:3000/media/avatar/userId",
      "action": "track_published",
      "trackId": "track_id",
      "trackTitle": "My New Song",
      "createdAt": "2024-01-15T00:00:00.000Z"
    },
    {
      "userId": "uuid",
      "username": "janedoe",
      "avatarUrl": "http://localhost:3000/media/avatar/userId",
      "action": "profile_updated",
      "createdAt": "2024-01-14T00:00:00.000Z"
    }
  ]
}
```

---

## 5. Типы данных

### IUserProfile
```typescript
{
  _id?: string;
  userId: string; // UUID из PostgreSQL
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  genres: string[];
  instruments: string[];
  socialLinks: {
    youtube?: string;
    vk?: string;
    telegram?: string;
  };
  stats: {
    tracksCount: number;
    followersCount: number;
    followingCount: number;
    totalPlays: number;
  };
  preferences: {
    emailNotifications: boolean;
    showOnlineStatus: boolean;
    privateProfile: boolean;
  };
  role: "musician" | "listener" | "admin";
  following: string[]; // Массив userId пользователей, на которых подписан
  createdAt?: Date;
  updatedAt?: Date;
}
```

### IMediaFileResponse
```typescript
{
  fileId: string;
  userId: string;
  type: "avatar" | "track" | "cover" | "other";
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  metadata?: {
    duration?: number; // для треков (секунды)
    bitrate?: number;
    format?: string;
    width?: number; // для изображений
    height?: number; // для изображений
  };
  createdAt?: Date;
  updatedAt?: Date;
}
```

### IPublicProfile
```typescript
{
  profile: IUserProfile;
  tracks: IMediaFileResponse[];
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean; // для текущего пользователя
  isOwnProfile?: boolean;
}
```

---

## 6. Коды ошибок

- **200 OK** - Успешный запрос
- **206 Partial Content** - Частичный контент (для стриминга)
- **400 Bad Request** - Неверный запрос (отсутствуют обязательные поля)
- **401 Unauthorized** - Не авторизован
- **404 Not Found** - Ресурс не найден
- **409 Conflict** - Конфликт (например, email уже существует)
- **429 Too Many Requests** - Превышен лимит запросов

---

## 7. Примеры использования

### Пример: Регистрация и получение профиля

```javascript
// 1. Регистрация
const registerResponse = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'password123',
    role: 'musician'
  })
});

const { user, accessToken, refreshToken } = await registerResponse.json();

// 2. Сохранение токенов
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
localStorage.setItem('userId', user.id);

// 3. Получение профиля
const profileResponse = await fetch(`http://localhost:3000/users/${user.id}/profile`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const profile = await profileResponse.json();
```

### Пример: Загрузка аватара

```javascript
const formData = new FormData();
formData.append('file', avatarFile); // File объект
formData.append('userId', userId);

const response = await fetch('http://localhost:3000/media/upload/avatar', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Avatar uploaded:', result.file.url);
}
```

### Пример: Стриминг трека

```javascript
// Полный файл
const response = await fetch('http://localhost:3000/media/track/trackId');
const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);

// Частичный запрос (Range)
const partialResponse = await fetch('http://localhost:3000/media/track/trackId', {
  headers: {
    'Range': 'bytes=0-1048575' // первые 1MB
  }
});
```

### Пример: Получение всех аудиофайлов пользователя

```javascript
const response = await fetch('http://localhost:3000/users/johndoe/audio-files', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const result = await response.json();
if (result.success) {
  console.log('Audio files:', result.audioFiles);
  result.audioFiles.forEach(file => {
    console.log(`- ${file.originalName} (${file.mimeType})`);
  });
}
```

### Пример: Получение списка всех пользователей

```javascript
// Получить список всех пользователей, исключая текущего
const currentUserId = localStorage.getItem('userId');
const response = await fetch(`http://localhost:3000/users?excludeUserId=${currentUserId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const result = await response.json();
if (result.success) {
  console.log('Total users:', result.profiles.length);
  result.profiles.forEach(user => {
    console.log(`- ${user.username} (${user.displayName || user.username})`);
  });
}

// Получить список всех пользователей (включая текущего)
const responseAll = await fetch('http://localhost:3000/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Пример: Подписка на пользователя

```javascript
const response = await fetch(`http://localhost:3000/social/follow/${targetUserId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    followerId: currentUserId
  })
});

const result = await response.json();
if (result.success) {
  console.log('Successfully followed user');
}
```

### Пример: Удаление трека

```javascript
// Удаление трека через специальный эндпоинт
const response = await fetch(`http://localhost:3000/media/track/${trackId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const result = await response.json();
if (result.success) {
  console.log('Track deleted successfully');
  // Счетчик tracksCount в профиле пользователя автоматически обновится
} else {
  console.error('Error:', result.error);
}

// Альтернативный способ: удаление через общий эндпоинт
const response2 = await fetch(`http://localhost:3000/media/file/${fileId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 8. Rate Limiting

Некоторые эндпоинты имеют ограничения на количество запросов:

- **Регистрация** (`/auth/register`): 5 запросов в минуту
- **Вход** (`/auth/login`): 5 запросов в минуту
- **Загрузка аватара** (`/media/upload/avatar`): 10 запросов в минуту
- **Загрузка трека** (`/media/upload/track`): 5 запросов в минуту
- **Загрузка обложки** (`/media/upload/cover`): 10 запросов в минуту

При превышении лимита возвращается статус **429 Too Many Requests**.

---

## 9. Примечания для разработчиков

1. **Микросервисная архитектура**: Backend использует микросервисы (Auth, User, Media, Social), которые общаются через RabbitMQ. Все HTTP запросы проходят через API Gateway.

2. **Базы данных**:
   - PostgreSQL - для данных аутентификации
   - MongoDB - для профилей пользователей и медиа метаданных
   - Redis - для токенов и кэширования

3. **Файлы хранятся локально** на сервере. URL файлов указывают на эндпоинты API Gateway.

4. **Стриминг треков**: Треки поддерживают Range requests для эффективной загрузки больших файлов.

5. **События**: Backend использует Event-Driven архитектуру. События (например, создание пользователя, загрузка трека) автоматически обновляют связанные данные.

6. **Обновление счетчиков**: Счетчики (followersCount, tracksCount и т.д.) обновляются автоматически через события, не требуют ручного обновления.

---

## 10. Контакты и поддержка

Для вопросов и предложений обращайтесь к команде разработки бэкенда.

**Версия документации:** 1.1  
**Дата обновления:** 2024-01-20

