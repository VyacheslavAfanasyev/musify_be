#!/bin/bash
# Скрипт для интерактивного подключения к базе данных

docker-compose exec postgres psql -U musician -d music_app

