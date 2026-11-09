# Production deployment

This runbook deploys the web app, admin app, API, and private renderer to an Ubuntu 24.04 VDS with Docker Compose and Caddy. GitHub Actions builds and publishes immutable GHCR images, deploys them over SSH, and checks public health endpoints. No live VDS deployment has been performed yet.

## 1. Prepare the VDS

Provision a server with a supported Docker Engine and Docker Compose plugin. Create a non-root deployment user with permission to run Docker and accept SSH connections from GitHub Actions. Use an Ed25519 SSH key, pin the VDS host key in `VDS_SSH_KNOWN_HOSTS`, and keep SSH access restricted to trusted sources where possible.

Point these DNS records to the VDS public address:

| Name | Service |
|---|---|
| `slides.encode.uz` | Web app |
| `slides-admin.encode.uz` | Admin app |
| `api-slides.encode.uz` | API |

Allow inbound TCP ports 80 and 443 for Caddy and the configured SSH port for deployment. Do not expose PostgreSQL, the renderer, or application container ports publicly; Compose keeps them on its private network. Caddy obtains and renews TLS certificates, so DNS must resolve correctly and ports 80/443 must be reachable.

Choose a private absolute deployment directory, such as `/opt/slideforge`, and configure it as the GitHub variable `VDS_DEPLOY_PATH`. The deployment user must be able to create and modify files there.

## 2. Configure GitHub

Create a protected GitHub Environment named `production`. Add the following environment secrets:

| Secret | Purpose |
|---|---|
| `PROD_POSTGRES_PASSWORD` | Database password; at least 32 characters using letters, digits, `_` or `-` |
| `PROD_JWT_SECRET` | API signing secret; same length and character requirements |
| `PROD_BOOTSTRAP_ADMIN_EMAIL` | First verified administrator email |
| `PROD_BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64` | Base64-encoded Spring BCrypt hash, including the `{bcrypt}` prefix |
| `PROD_SMTP_HOST` | SMTP server |
| `PROD_SMTP_USERNAME` / `PROD_SMTP_PASSWORD` | SMTP credentials |
| `PROD_MAIL_FROM` | Verified sender address |
| `VDS_HOST` / `VDS_USER` | SSH destination |
| `VDS_SSH_PRIVATE_KEY` | Deployment SSH private key |
| `VDS_SSH_KNOWN_HOSTS` | Pinned host-key entry for the VDS |
| `GHCR_PULL_USERNAME` / `GHCR_PULL_TOKEN` | VDS credentials with permission to pull private GHCR packages |

Add the GitHub Environment variable `VDS_DEPLOY_PATH`. The workflow also accepts optional `PROD_AI_PROVIDER_BASE_URL`, `PROD_AI_PROVIDER_MODEL`, and `PROD_AI_PROVIDER_API_KEY` secrets. Configure them only for the selected OpenAI-compatible provider; generation is unavailable without them.

For Android releases, add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` to the same protected environment. Keep the upload keystore backed up offline. Pushing a `vX.Y.Z` tag runs the signed App Bundle workflow and publishes a 30-day downloadable build artifact; store submission is a separate operator action.

The workflow runs after successful CI for a push to the repository's `main` branch, or by manually dispatching it from `main`. Configure environment reviewers and branch restrictions to match the release process. The workflow validates required settings before publishing images.

## 3. Bootstrap the administrator

Generate a password hash from an interactive terminal; do not place a plaintext password in GitHub or in this repository:

```powershell
Push-Location backend\api
mvn -q -DskipTests compile exec:java
Pop-Location
```

Enter a unique administrator password and store only the emitted Base64 hash in `PROD_BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64`. Set the matching email in `PROD_BOOTSTRAP_ADMIN_EMAIL`.

The bootstrap is a one-time Flyway migration. These values must be present before the first production database migration runs. Changing them after migration V8 has completed does not rotate or recreate the account; use the normal password-recovery flow to change its password. Do not put a reusable or shared default password in source control.

## 4. Deploy

Before deploying, verify the DNS, firewall, GitHub Environment secrets, environment protection, and VDS SSH host key. Then either push the release to `main` and wait for CI, or run **Deploy production** manually from `main`.

The workflow builds API, renderer, web, and admin images tagged with the source commit SHA, publishes them to GHCR, transfers the production Compose/Caddy files and a permission-restricted environment file, and runs Compose on the VDS. Production configuration disables public Springdoc endpoints; API health remains available for automated checks. It then checks:

- `https://slides.encode.uz/`
- `https://slides-admin.encode.uz/`
- `https://api-slides.encode.uz/actuator/health` reports `UP`

If deployment or health checks fail, the workflow attempts to restore the immediately previous deployment state. Database migrations are not rolled back by Compose; migrations must remain additive and compatible with the application version used for rollback. For recovery after a successful deployment, deploy a reviewed revert through the normal CI/release path.

## 5. Verify and operate

After the first successful deployment:

1. Sign in to the admin app with the configured bootstrap email and password.
2. Verify registration and email verification using a real test mailbox.
3. Verify password recovery and the public API health endpoint.
4. Create, edit, save, and export a test presentation; confirm both PPTX and PDF downloads.
5. If AI generation is enabled, verify it against the configured provider and review usage limits.
6. Confirm all three domains use valid TLS and that no database or internal service port is publicly reachable.

Inspect service status and logs from the deployment directory:

```bash
docker compose --env-file slideforge.production.env -f compose.production.yml ps
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 api
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 caddy
```

Compose does not configure an off-host backup service. Before production use, install `age` and `rclone` on the VDS, create an age recipient/private key off-host, configure an rclone destination with restricted credentials, and schedule the backup helper. Keep the age private key separate from the VDS so a server compromise cannot decrypt the backups. The helper dumps PostgreSQL and archives the persistent exports volume, encrypts both to the age public recipient, then copies the encrypted files to the configured off-host rclone destination; it fails if the destination is missing.

```bash
BACKUP_AGE_RECIPIENT='age1...' \
BACKUP_RCLONE_DESTINATION='offsite:slideforge' \
  bash ./backup-production.sh slideforge.production.env "$HOME/slideforge-backups"
```

Schedule the command with a systemd timer or cron only after testing the remote destination and restore procedure. Periodically decrypt a backup on a separate trusted machine, restore the database to an isolated PostgreSQL instance, and verify export files. Decide and configure retention/deletion on the off-host storage; the helper intentionally does not delete prior backups. Do not use `docker compose down -v` on production because it removes persistent data.

## 6. Build and test locally

Run the application checks before release:

```powershell
Push-Location backend\api; mvn test; Pop-Location
Push-Location apps\web; npm.cmd ci; npm.cmd run build; Pop-Location
Push-Location apps\admin; npm.cmd ci; npm.cmd run build; Pop-Location
Push-Location packages\shared-types; npm.cmd ci; npm.cmd run typecheck; npm.cmd test; Pop-Location
Push-Location apps\mobile; flutter pub get; flutter analyze; flutter test; Pop-Location
```

Renderer tests additionally require LibreOffice and Python `python-pptx`; CI installs both. Validate the production Compose file on a Linux host with `bash infra/deployment/validate.sh <env-file>`. Never use production secrets in a local test environment.

The mobile app is not part of this VDS stack. Its Android package ID is `com.slideforge.slideforge_mobile`; confirm this before store submission. A signed production bundle cannot be built until the operator configures and tests the upload-key secrets.

## Known release gates

- Real Payme, Click, and Uzum processing is not enabled. Obtain current merchant specifications and credentials before implementing or activating provider adapters; see [payment notes](PAYMENTS.md).
- No live deployment, production email delivery test, or production AI-provider test has been performed. These require the operator's VDS, DNS, SMTP, and provider credentials.
- Configure and test backups, monitoring/alerting, and an incident recovery procedure before accepting production data.
