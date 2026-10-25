#!/bin/bash
set -e

# Production start — запускает собранные артефакты без tsx/nuxt dev
# Вызывается из systemd или вручную

cd "$(dirname "$0")/.."

echo "[prod] Starting API from dist..."
node packages/api/dist/index.js &
API_PID=$!

echo "[prod] Starting Nuxt from .output..."
node packages/web/.output/server/index.mjs &
WEB_PID=$!

trap 'kill $API_PID $WEB_PID 2>/dev/null; exit' SIGTERM SIGINT
wait
