# SIGAP production images (FP-09, NF-05). Build from the repository root:
#
#   docker compose -f infra/docker/compose.yaml build
#
# Targets:
#   app  PHP-FPM 8.5 with the Laravel API (also runs the queue worker and the scheduler)
#   web  Caddy: serves the PWA and passes /api to app, with automatic HTTPS

# ---------- PHP base: the extensions SIGAP needs (same list as backend/docker/dev.Dockerfile) ----------
FROM php:8.5-fpm AS php-base

# default-mysql-client: mysqldump for the daily backup (NF-06, spatie/laravel-backup)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        unzip libzip-dev libicu-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        default-mysql-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql zip intl gd bcmath pcntl exif opcache \
    && rm -rf /var/lib/apt/lists/*

COPY infra/docker/php.ini /usr/local/etc/php/conf.d/zz-sigap.ini
WORKDIR /app

# ---------- Composer dependencies, without dev packages ----------
FROM php-base AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && php artisan package:discover --ansi

# ---------- PWA build ----------
FROM node:26-alpine AS frontend

WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
# Playwright browsers are for tests only
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- API image ----------
FROM php-base AS app

COPY --from=vendor /app /app
COPY infra/docker/app-entrypoint.sh /usr/local/bin/sigap-entrypoint
RUN chmod +x /usr/local/bin/sigap-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data
ENTRYPOINT ["sigap-entrypoint"]
CMD ["php-fpm"]

# ---------- Web server ----------
FROM caddy:2 AS web

COPY infra/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend /web/dist /srv/frontend
# php_fastcgi checks that index.php exists before passing /api to PHP-FPM
COPY backend/public /app/public
