#!/bin/bash
# deploy.sh — сборка на текущем сервере и копирование на продакшен
# Использование: ./scripts/deploy.sh <prod_user>@<prod_host>
# Пример: ./scripts/deploy.sh donate@example.com

set -e

PROD_TARGET="${1:-donate@example.com}"
PROD_DIR="/home/donate"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1. Сборка ==="
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build

echo ""
echo "=== 2. Сборка артефактов ==="
BUILD_DIR=$(mktemp -d)
echo "  Временная директория: $BUILD_DIR"

# API: dist + package.json + prisma + node_modules (prod only)
mkdir -p "$BUILD_DIR/packages/api"
cp -r packages/api/dist "$BUILD_DIR/packages/api/dist"
cp packages/api/package.json "$BUILD_DIR/packages/api/package.json"
cp -r packages/api/prisma "$BUILD_DIR/packages/api/prisma"

# Web: .output + package.json
mkdir -p "$BUILD_DIR/packages/web"
cp -r packages/web/.output "$BUILD_DIR/packages/web/.output"
cp packages/web/package.json "$BUILD_DIR/packages/web/package.json"

# Root: package.json + node_modules (prod only) + scripts
cp package.json "$BUILD_DIR/package.json"
mkdir -p "$BUILD_DIR/scripts"
cp scripts/prod-start.sh "$BUILD_DIR/scripts/prod-start.sh"
chmod +x "$BUILD_DIR/scripts/prod-start.sh"

# pnpm — нужен для prisma
cp pnpm-lock.yaml "$BUILD_DIR/pnpm-lock.yaml" 2>/dev/null || true
cp .npmrc "$BUILD_DIR/.npmrc" 2>/dev/null || true

# Prisma CLI для db:push/db:generate
PNPM_STORE=$(dirname "$(which pnpm)")/..
mkdir -p "$BUILD_DIR/node_modules/.pnpm"
# Копируем только prisma CLI и @prisma/client
# (полный node_modules лучше установить на проде)

echo ""
echo "=== 3. Копирование на $PROD_TARGET ==="
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.ts' \
  --exclude='src/' \
  "$BUILD_DIR/" "$PROD_TARGET:$PROD_DIR/"

echo ""
echo "=== 4. Установка зависимостей на проде ==="
ssh "$PROD_TARGET" << 'REMOTE'
  set -e
  cd /home/donate
  echo "  Установка production-зависимостей..."
  pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod
  echo "  Prisma generate..."
  npx prisma generate
  echo "  Prisma push..."
  npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push
  echo "  Перезапуск сервиса..."
  sudo systemctl restart donate-platform || echo "  !!! service not found, start manually: node scripts/prod-start.sh"
  echo "  Готово!"
REMOTE

rm -rf "$BUILD_DIR"
echo ""
echo "=== Deploy complete ==="
