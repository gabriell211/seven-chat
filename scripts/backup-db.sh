#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump "$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file="backups/seven-chat-$stamp.dump"
sha256sum "backups/seven-chat-$stamp.dump" > "backups/seven-chat-$stamp.dump.sha256"
echo "backups/seven-chat-$stamp.dump"
