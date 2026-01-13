# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем shared папку (контекст сборки - корень проекта)
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Копируем файлы зависимостей сервиса
COPY microservices/user/package*.json ./
COPY microservices/user/tsconfig*.json ./
COPY microservices/user/nest-cli.json ./

# Устанавливаем зависимости (используем npm install для локальных пакетов)
RUN npm install --legacy-peer-deps

# Копируем исходный код сервиса
COPY microservices/user/src ./src

# Собираем приложение
RUN npm run build

# Development образ
FROM node:20-alpine AS development

WORKDIR /app

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Копируем файлы конфигурации и зависимости
COPY microservices/user/package*.json ./
COPY microservices/user/tsconfig*.json ./
COPY microservices/user/nest-cli.json ./

# Устанавливаем все зависимости (включая devDependencies для HMR)
RUN npm install --legacy-peer-deps

# Открываем порт
EXPOSE 3002

# В development режиме используем watch mode для HMR
CMD ["npm", "run", "start:dev"]

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Создаем структуру директорий для правильного разрешения пути file:../../shared
RUN mkdir -p ../.. && ln -sf /app/shared ../../shared || true

# Копируем package.json сервиса
COPY microservices/user/package*.json ./

# Копируем собранное приложение и все зависимости из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Открываем порт
EXPOSE 3002

# Запускаем приложение
CMD ["node", "dist/src/main"]

