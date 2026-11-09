#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-slideforge.production.env}"
backup_dir="${2:?Usage: backup-production.sh [env-file] BACKUP_DIR}"
compose_file="${COMPOSE_FILE:-compose.production.yml}"

for command in docker age rclone; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Required backup command is missing: $command" >&2
    exit 1
  }
done

if [[ ! -f "$env_file" || ! -f "$compose_file" ]]; then
  echo "Run this script from the deployment directory with its env and Compose files." >&2
  exit 1
fi

: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to an age public recipient}"
: "${BACKUP_RCLONE_DESTINATION:?Set BACKUP_RCLONE_DESTINATION to an off-host rclone destination}"

umask 077
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

compose=(docker compose --env-file "$env_file" -f "$compose_file")
api_container="$("${compose[@]}" ps -q api)"
if [[ -z "$api_container" ]]; then
  echo "The API container is not running; cannot identify its export volume." >&2
  exit 1
fi

exports_volume="$(docker inspect "$api_container" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/slideforge/exports"}}{{.Name}}{{end}}{{end}}')"
if [[ -z "$exports_volume" ]]; then
  echo "Could not identify the persistent export volume mounted by the API." >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_file="$backup_dir/slideforge-database-$timestamp.dump.age"
exports_file="$backup_dir/slideforge-exports-$timestamp.tar.gz.age"
database_partial="$database_file.partial"
exports_partial="$exports_file.partial"
cleanup() {
  rm -f "$database_partial" "$exports_partial"
}
trap cleanup EXIT

"${compose[@]}" exec -T postgres pg_dump -U slideforge -d slideforge -Fc \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$database_partial"
docker run --rm --volume "$exports_volume:/source:ro" alpine:3.20 \
  tar -C /source -czf - . \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$exports_partial"

test -s "$database_partial"
test -s "$exports_partial"
mv "$database_partial" "$database_file"
mv "$exports_partial" "$exports_file"

rclone copy "$database_file" "$BACKUP_RCLONE_DESTINATION"
rclone copy "$exports_file" "$BACKUP_RCLONE_DESTINATION"

printf 'Encrypted database and exports backups copied to %s\n' "$BACKUP_RCLONE_DESTINATION"
