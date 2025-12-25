# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем shared папку (контекст сборки - корень проекта)
COPY shared ./shared


# Копируем файлы зависимостей сервиса
COPY microservices/api-gateway/package*.json ./
COPY microservices/api-gateway/tsconfig*.json ./
COPY microservices/api-gateway/nest-cli.json ./

# Устанавливаем зависимости (используем npm install для локальных пакетов)
RUN npm install

# Копируем исходный код сервиса
COPY microservices/api-gateway/src ./src

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Копируем package.json сервиса
COPY microservices/api-gateway/package*.json ./

# Копируем собранное приложение и все зависимости из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/src/main"]

