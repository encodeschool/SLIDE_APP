#!/usr/bin/env bash
set -euo pipefail

mode="${1:?Usage: deploy-remote.sh deploy|rollback DEPLOY_PATH GHCR_USERNAME}"
deploy_path="${2:?Missing deployment path}"
ghcr_username="${3:?Missing GHCR username}"

IFS= read -r ghcr_token
if [[ -z "$ghcr_token" ]]; then
  echo "Missing GHCR pull token on stdin." >&2
  exit 1
fi

docker_config="$(mktemp -d)"
chmod 700 "$docker_config"
export DOCKER_CONFIG="$docker_config"
cleanup() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf "$docker_config"
}
trap cleanup EXIT

printf '%s' "$ghcr_token" | docker login ghcr.io --username "$ghcr_username" --password-stdin
unset ghcr_token

cd "$deploy_path"
case "$mode" in
  deploy)
    chmod 600 slideforge.production.env.next
    for file in compose.production.yml Caddyfile; do
      if [[ -f "$file" ]]; then
        cp "$file" "$file.previous"
      else
        rm -f "$file.previous"
      fi
    done
    if [[ -f slideforge.production.env ]]; then
      cp slideforge.production.env slideforge.production.env.previous
      chmod 600 slideforge.production.env.previous
    else
      rm -f slideforge.production.env.previous
    fi
    mv slideforge.production.env.next slideforge.production.env
    mv compose.production.yml.next compose.production.yml
    mv Caddyfile.next Caddyfile
    docker compose --env-file slideforge.production.env -f compose.production.yml pull
    docker compose --env-file slideforge.production.env -f compose.production.yml up -d --remove-orphans
    ;;
  rollback)
    if [[ -f slideforge.production.env.previous ]]; then
      if [[ -f compose.production.yml.previous ]]; then
        mv compose.production.yml.previous compose.production.yml
      fi
      if [[ -f Caddyfile.previous ]]; then
        mv Caddyfile.previous Caddyfile
      fi
      cp slideforge.production.env.previous slideforge.production.env
      chmod 600 slideforge.production.env
      docker compose --env-file slideforge.production.env -f compose.production.yml pull
      docker compose --env-file slideforge.production.env -f compose.production.yml up -d --remove-orphans
      rm -f slideforge.production.env.previous compose.production.yml.previous Caddyfile.previous
    elif [[ -f slideforge.production.env ]]; then
      docker compose --env-file slideforge.production.env -f compose.production.yml down
    else
      echo "No previous deployment state is available to roll back." >&2
      exit 1
    fi
    ;;
  *)
    echo "Mode must be 'deploy' or 'rollback'." >&2
    exit 2
    ;;
esac
