# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем shared папку (контекст сборки - корень проекта)
COPY shared ./shared


# Копируем файлы зависимостей сервиса
COPY microservices/auth-service/package*.json ./
COPY microservices/auth-service/tsconfig*.json ./
COPY microservices/auth-service/nest-cli.json ./

# Устанавливаем зависимости (используем npm install для локальных пакетов)
RUN npm install

# Копируем исходный код сервиса
COPY microservices/auth-service/src ./src

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Копируем shared папку для локальных зависимостей
COPY shared ./shared

# Копируем package.json сервиса для production зависимостей
COPY microservices/auth-service/package*.json ./

# Устанавливаем только production зависимости (используем npm install для локальных пакетов)
RUN npm install --only=production && npm cache clean --force

# Копируем собранное приложение из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Открываем порт
EXPOSE 3001

# Запускаем приложение
CMD ["node", "dist/src/main"]

