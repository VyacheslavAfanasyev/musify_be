# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем shared папку (контекст сборки - корень проекта)
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Устанавливаем зависимости shared пакета сначала
RUN cd shared && npm install --legacy-peer-deps

# Копируем файлы зависимостей сервиса
COPY microservices/media/package*.json ./
COPY microservices/media/tsconfig*.json ./
COPY microservices/media/nest-cli.json ./

# Устанавливаем зависимости (используем npm install для локальных пакетов)
RUN npm install --legacy-peer-deps

# Копируем исходный код сервиса
COPY microservices/media/src ./src

# Собираем приложение
RUN npm run build

# Development образ
FROM node:20-alpine AS development

WORKDIR /app

# Устанавливаем зависимости для sharp (библиотека для обработки изображений)
RUN apk add --no-cache vips-dev

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Устанавливаем зависимости shared пакета сначала
RUN cd shared && npm install --legacy-peer-deps

# Копируем файлы конфигурации и зависимости
COPY microservices/media/package*.json ./
COPY microservices/media/tsconfig*.json ./
COPY microservices/media/nest-cli.json ./

# Устанавливаем все зависимости (включая devDependencies для HMR)
RUN npm install --legacy-peer-deps

# Создаем директорию для загрузок
RUN mkdir -p /app/uploads/avatars /app/uploads/tracks /app/uploads/covers

# Открываем порт
EXPOSE 3003

# В development режиме используем watch mode для HMR
CMD ["npm", "run", "start:dev"]

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Устанавливаем зависимости для sharp
RUN apk add --no-cache vips-dev

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Копируем package.json сервиса
COPY microservices/media/package*.json ./

# Копируем собранное приложение и все зависимости из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Создаем директорию для загрузок
RUN mkdir -p /app/uploads/avatars /app/uploads/tracks /app/uploads/covers

# Открываем порт
EXPOSE 3003

# Запускаем приложение
CMD ["node", "dist/src/main"]

