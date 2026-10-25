#!/bin/bash
# Backup MariaDB + uploads + project files для DonatePlatform
# Добавить в cron: 0 3 * * * /opt/donatesystem/scripts/backup-db.sh
# Авторизация MySQL через ~/.my.cnf

set -e

# Требуется ~/.my.cnf с доступом к MySQL:
# [client]
# user=donate
# password=<ваш-пароль>

DB_NAME="donate_platform"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"

# Дамп БД с сжатием
mysqldump "$DB_NAME" --single-transaction --routines --triggers | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Бэкап uploads
if [ -d "$PROJECT_DIR/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$PROJECT_DIR" uploads
fi

# Бэкап project files (api + web) без node_modules, dist, .nuxt, .git
tar -czf "$BACKUP_DIR/project_${TIMESTAMP}.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.nuxt' \
  --exclude='.git' \
  --exclude='.env' \
  -C "$PROJECT_DIR" \
  packages/api packages/web

# Удалить старые бекапы
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "project_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup created:"
echo "  DB: ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
echo "  Uploads: ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
echo "  Project: ${BACKUP_DIR}/project_${TIMESTAMP}.tar.gz"
