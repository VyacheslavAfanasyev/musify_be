# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS builder

WORKDIR /app

# Создаем структуру директорий для соответствия file:../../shared
COPY shared ./shared

# Копируем файлы зависимостей сервиса в правильную структуру
COPY microservices/auth/package*.json ./microservices/auth/
COPY microservices/auth/tsconfig*.json ./microservices/auth/
COPY microservices/auth/nest-cli.json ./microservices/auth/

# Переходим в директорию сервиса и устанавливаем зависимости
WORKDIR /app/microservices/auth
RUN npm install --legacy-peer-deps

# Копируем исходный код сервиса
COPY microservices/auth/src ./src

# Собираем приложение
RUN npm run build || (echo "Build failed!" && exit 1)

# Находим и перемещаем main.js в правильное место
RUN MAIN_FILE=$(find dist -name "main.js" -type f | head -1) && \
    if [ -z "$MAIN_FILE" ]; then \
        echo "ERROR: main.js not found!"; \
        find . -name "main.js" -type f 2>/dev/null; \
        exit 1; \
    fi && \
    echo "Found main.js at: $MAIN_FILE" && \
    if [ "$MAIN_FILE" != "dist/main.js" ]; then \
        echo "Moving files to dist/"; \
        MAIN_DIR=$(dirname "$MAIN_FILE") && \
        cp -r "$MAIN_DIR"/* dist/ 2>/dev/null || true && \
        cp "$MAIN_FILE" dist/main.js; \
    fi && \
    test -f dist/main.js || (echo "ERROR: Failed to setup dist/main.js" && exit 1) && \
    echo "Build successful! main.js is at dist/main.js"

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Создаем структуру директорий
COPY shared ./shared

# Копируем package.json сервиса в правильную структуру
COPY microservices/auth/package*.json ./microservices/auth/

# Переходим в директорию сервиса и устанавливаем только production зависимости
WORKDIR /app/microservices/auth
RUN npm install --omit=dev --legacy-peer-deps

# Копируем собранное приложение из builder
COPY --from=builder /app/microservices/auth/dist ./dist
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found after copy!" && ls -la dist/ && exit 1)

# Открываем порт
EXPOSE 3001

# Запускаем приложение
WORKDIR /app/microservices/auth
CMD ["node", "dist/main"]

