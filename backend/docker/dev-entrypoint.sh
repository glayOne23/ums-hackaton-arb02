#!/bin/sh
# First-run setup for the all-in-Docker local setup (compose.yaml at the repo root).
# Safe to run on every start: each step only does work when it is still needed.
set -e
cd /app

# .env from the example; the DB_* values come from compose.yaml (they win over .env)
[ -f .env ] || cp .env.example .env

# Dependencies live in a Docker volume, not in the backend folder
[ -f vendor/autoload.php ] || composer install --no-interaction --no-progress --prefer-dist

grep -q '^APP_KEY=base64:' .env || php artisan key:generate --no-interaction
# Keys for push notifications to devices (made once; keep them afterwards)
grep -q '^VAPID_PUBLIC_KEY=.' .env || php artisan webpush:vapid --no-interaction || true

# Wait for MySQL (PDO, like Laravel itself), then create or update the tables
DSN="mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}"
until php -r 'new PDO($argv[1], $argv[2], $argv[3]);' "$DSN" "$DB_USERNAME" "$DB_PASSWORD" 2>/dev/null; do
  echo "Menunggu MySQL…"
  sleep 2
done
php artisan migrate --force --no-interaction

# Roles, permissions, and sample data only while the database has no users yet
users=$(php -r 'echo (new PDO($argv[1], $argv[2], $argv[3]))->query("SELECT COUNT(*) FROM auth_users")->fetchColumn();' "$DSN" "$DB_USERNAME" "$DB_PASSWORD")
if [ "$users" = "0" ]; then
  php artisan db:seed --force --no-interaction
fi

exec "$@"
