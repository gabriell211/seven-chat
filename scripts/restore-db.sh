#!/usr/bin/env bash
set -euo pipefail
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
dump="${1:?usage: restore-db.sh <dump>}"
test -f "$dump"
test -f "$dump.sha256" && sha256sum -c "$dump.sha256"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$dump"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as users from users;"
