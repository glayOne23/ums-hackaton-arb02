# Local development image: PHP 8.5 + the extensions SIGAP needs + Composer.
# The code is NOT copied in; compose.yaml mounts the backend folder, so code
# changes are live. Rebuild only when this file changes:
#   docker compose build
FROM php:8.5-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libicu-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql zip intl gd bcmath pcntl exif \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# Composer cache and home live in /tmp so any host UID can run the container
ENV COMPOSER_HOME=/tmp/composer \
    HOME=/tmp

WORKDIR /app
