#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/app/WA-Scrum-project"
FRONT_DIR="$APP_DIR/frontend"
BACK_DIR="$APP_DIR/forum-api-app"
WEB_DIR="/var/www/html"

export GIT_PAGER=cat
export PAGER=cat
export SYSTEMD_PAGER=
export GIT_TERMINAL_PROMPT=0

echo "== Deploy started: $(date) =="

echo "[1/7] Fetching latest code..."
cd "$APP_DIR"
git fetch --all --prune >/dev/null 2>&1 || { echo "ERROR: git fetch failed"; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [[ -z "${BRANCH}" || "${BRANCH}" == "HEAD" ]]; then
  BRANCH="main"
fi

echo "[2/7] Resetting working tree to origin/$BRANCH (discarding local changes)..."
git reset --hard "origin/$BRANCH" >/dev/null 2>&1 || { echo "ERROR: git reset failed (origin/$BRANCH not found?)"; exit 1; }

# IMPORTANT: keep deploy scripts even if they are untracked
git clean -fd \
  -e deploy.sh \
  -e deploy.local.sh \
  >/dev/null 2>&1 || true

echo "[3/7] Deploying frontend (preserving /reports)..."
sudo rsync -a --delete \
  --exclude 'reports/' \
  "$FRONT_DIR"/ "$WEB_DIR"/ >/dev/null 2>&1

echo "[4/7] Fixing frontend permissions..."
sudo chown -R www-data:www-data "$WEB_DIR" >/dev/null 2>&1
sudo find "$WEB_DIR" -type d -exec chmod 755 {} \; >/dev/null 2>&1
sudo find "$WEB_DIR" -type f -exec chmod 644 {} \; >/dev/null 2>&1

echo "[5/7] Installing backend dependencies..."
cd "$BACK_DIR"
composer install --no-dev --optimize-autoloader --no-interaction --quiet >/dev/null 2>&1 \
  || composer update --no-dev --optimize-autoloader --no-interaction --quiet >/dev/null 2>&1

echo "[6/7] Running migrations + clearing caches..."
php artisan migrate --force --no-interaction >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

echo "[7/7] Reloading services..."
sudo systemctl restart php8.3-fpm >/dev/null 2>&1
sudo systemctl reload nginx >/dev/null 2>&1

echo "== Deploy finished OK: $(date) =="
