#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a
. "$project_dir/.env"
set +a
: "${DATABASE_URL:?DATABASE_URL is required}"

for migration in "$project_dir"/backend/migrations/*.sql; do
  [ -f "$migration" ] && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
