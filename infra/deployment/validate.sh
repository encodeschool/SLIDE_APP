#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env.production}"
compose_file="infra/deployment/compose.production.yml"

if [[ ! -f "$env_file" ]]; then
  echo "Missing deployment environment file: $env_file" >&2
  exit 1
fi

for name in POSTGRES_PASSWORD JWT_SECRET; do
  value="$(sed -n "s/^${name}=//p" "$env_file" | tail -n 1)"
  if [[ ${#value} -lt 32 || ! "$value" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "$name must be at least 32 characters and contain only letters, digits, _ or -" >&2
    exit 1
  fi
done

if ! grep -Eq '^IMAGE_PREFIX=ghcr\.io/[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9._-]*$' "$env_file"; then
  echo "IMAGE_PREFIX must be a lowercase ghcr.io/owner/repository path" >&2
  exit 1
fi

if ! grep -Eq '^IMAGE_TAG=[a-f0-9]{40}$' "$env_file"; then
  echo "IMAGE_TAG must be a 40-character lowercase Git commit SHA" >&2
  exit 1
fi

docker compose --env-file "$env_file" -f "$compose_file" config --quiet
echo "Production Compose configuration is valid."
