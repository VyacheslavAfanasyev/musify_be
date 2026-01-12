#!/bin/bash
# Скрипт для интерактивного подключения к MongoDB

docker-compose exec mongodb mongosh -u root -p secret --authenticationDatabase admin music_app

