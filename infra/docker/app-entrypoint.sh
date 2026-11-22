#!/bin/sh
# Prepares Laravel for the new image, then runs the container command
# (php-fpm, queue:work, or schedule:work). Migrations are NOT run here: run
#   docker compose -f infra/docker/compose.yaml run --rm app php artisan migrate --force
# yourself after checking the backup, so a bad migration never runs by surprise.
set -e

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app

# Cache config, routes, and views for speed; they are rebuilt on every start
php artisan optimize --no-interaction >/dev/null

exec "$@"
