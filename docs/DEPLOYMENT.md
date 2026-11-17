# Production deployment on Ubuntu 24.04

This runbook deploys the web app, admin app, Spring Boot API, PostgreSQL, private presentation renderer, and Caddy to the Ubuntu VDS. GitHub Actions builds and publishes immutable images to GHCR, then deploys them over SSH. The live VDS rollout still requires operator access and has not been run from this repository.

## Production layout

| Hostname | Destination |
|---|---|
| `eduslides.encode.uz` | Public web app |
| `www.eduslides.encode.uz` | HTTPS redirect to the public web app |
| `admin-eduslides.encode.uz` | Admin app |
| `www.admin-eduslides.encode.uz` | HTTPS redirect to the admin app |
| `api-eduslides.encode.uz` | Spring Boot API |
| `www.api-eduslides.encode.uz` | HTTPS redirect to the API |

All six DNS names must resolve to `176.96.243.45` before the first deployment. PostgreSQL and the renderer are internal Compose services and are not published to the Internet. Flutter is a client application, not a VDS service; its release build is described below.

## 1. Point DNS to the VDS

At the DNS provider, create these records. Use a short TTL while bringing the service up, then raise it after verification.

| Type | Name | Value |
|---|---|---|
| A | `eduslides` | `176.96.243.45` |
| CNAME | `www.eduslides` | `eduslides.encode.uz` |
| A | `admin-eduslides` | `176.96.243.45` |
| CNAME | `www.admin-eduslides` | `admin-eduslides.encode.uz` |
| A | `api-eduslides` | `176.96.243.45` |
| CNAME | `www.api-eduslides` | `api-eduslides.encode.uz` |

Provider dashboards may display the record names without the zone suffix. Remove any conflicting A/AAAA/CNAME records first. Do not publish AAAA records unless this VDS has a working IPv6 address and its firewall is configured for it.

Check resolution from your computer:

```bash
dig +short eduslides.encode.uz
dig +short admin-eduslides.encode.uz
dig +short api-eduslides.encode.uz
dig +short www.eduslides.encode.uz
```

Each canonical A record must return `176.96.243.45`; each `www` name should resolve through its CNAME to the corresponding canonical name.

## 2. Install Docker on a fresh Ubuntu VDS

Connect through the VDS provider console or SSH as a sudo-capable administrator. Keep the provider console available until SSH and firewall access are confirmed.

Update Ubuntu and install Docker Engine and the Compose plugin from Docker's official apt repository:

```bash
sudo apt-get update
sudo apt-get full-upgrade -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

docker --version
docker compose version
sudo systemctl status docker --no-pager
```

Create the deployment account if it does not already exist. The workflow below connects as `encode` and stores its files in `/home/encode/eduslides`:

```bash
if ! id encode >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" encode
fi
sudo usermod -aG docker encode
sudo install -d -o encode -g encode -m 700 /home/encode/eduslides
```

Membership in the `docker` group grants root-equivalent control of the host. Only trusted deployment operators should be members. Log out and reconnect as `encode` before checking `docker compose version` without `sudo`.

### SSH and firewall

Install an SSH public key for the `encode` account and confirm that a new SSH session works before restricting access. Generate a dedicated deploy key on a trusted operator machine; store the private key only in the GitHub `production` environment secret described below. The deployment workflow expects an Ed25519 key without a passphrase.

Before enabling UFW, allow the actual SSH port. For the default OpenSSH port:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status verbose
```

If SSH uses a non-default port, allow that port before enabling UFW. Also configure the VDS provider firewall to allow the SSH port and inbound TCP 80/443; UDP 443 is optional HTTP/3. Do not open PostgreSQL, API, renderer, or frontend container ports.

## 3. HTTPS certificates

This deployment uses Caddy as the only public reverse proxy. After all six DNS names point to the VDS and inbound ports 80/443 are open, Caddy automatically obtains and renews publicly trusted certificates using ACME. Certificate state is kept in the persistent `caddy_data` Docker volume.

Certbot is not installed or required for this configuration. Do not run Certbot in standalone mode alongside Caddy: both need to bind port 80 (and the HTTPS proxy binds port 443). Using Caddy's built-in ACME management provides automatic issuance and renewal for the six configured hostnames. If an operational policy specifically requires Certbot, change the TLS proxy design rather than running two certificate managers against the same ports.

## 4. Configure GitHub Actions

In the repository settings, create a protected GitHub Environment named `production`. Restrict it to the `main` branch and require an approval reviewer if available. Add the following **environment secrets**:

| Secret | Value or purpose |
|---|---|
| `VDS_HOST` | `176.96.243.45` |
| `VDS_USER` | `encode` |
| `VDS_SSH_PRIVATE_KEY` | Private half of the dedicated Ed25519 deploy key |
| `VDS_SSH_KNOWN_HOSTS` | Verified SSH host-key line for `176.96.243.45` |
| `GHCR_PULL_USERNAME` | GitHub username allowed to pull the repository's container packages |
| `GHCR_PULL_TOKEN` | Fine-grained deployment token with `read:packages` for the GHCR images |
| `PROD_POSTGRES_PASSWORD` | Unique random database password |
| `PROD_JWT_SECRET` | Unique random API signing secret |
| `PROD_BOOTSTRAP_ADMIN_EMAIL` | Email for the first verified administrator |
| `PROD_BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64` | Base64-encoded Spring BCrypt hash, including the `{bcrypt}` prefix before encoding |
| `PROD_SMTP_HOST` | Production SMTP hostname |
| `PROD_SMTP_USERNAME` | SMTP username |
| `PROD_SMTP_PASSWORD` | SMTP password |
| `PROD_MAIL_FROM` | Verified sender address |

Create this **environment variable**:

| Variable | Value |
|---|---|
| `VDS_DEPLOY_PATH` | `/home/encode/eduslides` |

The workflow requires the secrets above. It accepts optional `PROD_AI_PROVIDER_BASE_URL`, `PROD_AI_PROVIDER_MODEL`, and `PROD_AI_PROVIDER_API_KEY` secrets; configure them only for the selected OpenAI-compatible provider. Leave them unset to keep generation unavailable.

Generate separate high-entropy values for the database and JWT secrets on a trusted machine:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Paste each result directly into its GitHub secret. Do not commit the values or place them in tickets, chat, shell scripts, or the README.

### Pin the VDS SSH host key

Get the Ed25519 host-key fingerprint from the VDS console:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

From the trusted operator machine, fetch and fingerprint the key:

```bash
ssh-keyscan -t ed25519 176.96.243.45 2>/dev/null | ssh-keygen -lf -
```

Compare the fingerprints out-of-band. Only after they match, set `VDS_SSH_KNOWN_HOSTS` to the output of:

```bash
ssh-keyscan -t ed25519 176.96.243.45 2>/dev/null
```

Do not treat an unverified `ssh-keyscan` result as trusted.

### Create the bootstrap administrator hash

Run this command from an interactive terminal in the repository. Enter a unique administrator password when prompted and store only the emitted Base64 hash as the GitHub secret:

```powershell
Push-Location backend\api
mvn -q -DskipTests compile exec:java
Pop-Location
```

Set `PROD_BOOTSTRAP_ADMIN_EMAIL` to the matching email address. The hash is consumed by one-time Flyway migrations; changing the secret after those migrations have run does not rotate or recreate the account. Use password recovery for later rotation. Never put a plaintext password in GitHub or source control.

The workflow runs after successful CI for a push to `main`, or by manual dispatch from `main`. It builds the API, renderer, web, and admin images with the source commit SHA, publishes them to GHCR, transfers the production Compose/Caddy files and a permission-restricted environment file, and runs Compose on the VDS.

### Android/mobile release signing

The Flutter app is not hosted by this VDS. A release build connects to `https://api-eduslides.encode.uz`. To produce a signed Android App Bundle, add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` to the protected `production` environment. Keep the upload keystore backed up offline. Pushing a `vX.Y.Z` tag runs the signed AAB workflow and publishes a 30-day downloadable artifact; app-store submission remains an operator action.

## 5. Deploy

Before the first deployment, confirm that DNS, firewall access, SSH host-key pinning, GitHub environment secrets, environment protection, SMTP, and the bootstrap administrator hash are configured.

Then either:

1. Push or merge a reviewed change to `main`, wait for the `CI` workflow to pass, and allow `Deploy production` to run; or
2. Select **Actions → Deploy production → Run workflow** on the `main` branch.

The workflow builds immutable images, deploys to `/home/encode/eduslides`, and checks the public web/admin sites and API health. It attempts to restore the immediately previous Compose configuration and images if deployment or health checks fail. Database migrations are not rolled back; migrations must remain additive and compatible with the application version used for rollback.

The current deployment endpoints are:

- `https://eduslides.encode.uz/`
- `https://www.eduslides.encode.uz/` (redirects to the canonical web hostname)
- `https://admin-eduslides.encode.uz/`
- `https://www.admin-eduslides.encode.uz/` (redirects to the canonical admin hostname)
- `https://api-eduslides.encode.uz/actuator/health` (must report `UP`)
- `https://www.api-eduslides.encode.uz/actuator/health` (redirects to the canonical API hostname)

## 6. First-deployment verification

After Actions reports success:

1. Open the canonical web and admin domains and confirm that each `www` alias redirects to its canonical hostname over HTTPS.
2. Confirm that the API health response reports `UP`:

   ```bash
   curl --fail --show-error https://api-eduslides.encode.uz/actuator/health
   ```

3. Sign in to the admin app with the configured bootstrap email/password.
4. Verify registration and email verification with a real test mailbox; verify password recovery and the admin invitation flow.
5. Create, edit, save, and export a test presentation; confirm PPTX and PDF downloads.
6. If AI generation is enabled, verify it against the configured provider and review usage limits.
7. Confirm that the only public service ports are SSH, 80, and 443. PostgreSQL and the renderer must remain private.

No live VDS deployment, SMTP delivery test, or production AI-provider test has been performed by this repository change. Complete these operator-controlled checks before accepting real user data.

## 7. Operate the deployment

Connect as `encode` and inspect the services:

```bash
cd /home/encode/eduslides
docker compose --env-file slideforge.production.env -f compose.production.yml ps
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 api
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 caddy
```

Deploy releases through GitHub Actions so image tags and the matching production environment file remain aligned. Do not run `docker compose down -v` on production; it deletes persistent PostgreSQL, export/marketplace-file, and certificate data. Marketplace uploads live in the `exports_data` volume at `/var/lib/slideforge/exports/marketplace`. Keep the `caddy_data` volume and the owner-only permissions on `slideforge.production.env`.

If a deployment fails, inspect the Actions log and service health first. The workflow attempts rollback automatically. For a recovery after a successful release, deploy a reviewed revert through the normal CI/release path. Never manually roll back the database volume or delete Flyway history.

### Backups and recovery

Compose does not configure off-host backups. Before production use, install `age` and `rclone` on the VDS, create an age recipient/private key off-host, configure an rclone destination with restricted credentials, and schedule the backup helper. Keep the age private key separate from the VDS so a server compromise cannot decrypt the backups.

From `/home/encode/eduslides`, after configuring the remote destination and `BACKUP_AGE_RECIPIENT`:

```bash
BACKUP_AGE_RECIPIENT='age1...' \
BACKUP_RCLONE_DESTINATION='offsite:eduslides' \
  bash ./backup-production.sh slideforge.production.env "$HOME/eduslides-backups"
```

Schedule the command with systemd or cron only after testing the remote destination and restore procedure. Periodically decrypt a backup on a separate trusted machine, restore the database to an isolated PostgreSQL instance, and verify export artifacts and marketplace uploads from the volume backup. Decide and configure retention/deletion on the off-host storage; the helper intentionally does not delete prior backups.

## 8. Build and test locally

Run the relevant checks before release. On Windows PowerShell:

```powershell
Push-Location backend\api; mvn test; Pop-Location
Push-Location apps\web; npm.cmd ci; npm.cmd run build; Pop-Location
Push-Location apps\admin; npm.cmd ci; npm.cmd run build; Pop-Location
Push-Location packages\shared-types; npm.cmd ci; npm.cmd run typecheck; npm.cmd test; Pop-Location
Push-Location services\presentation-renderer; npm.cmd ci; npm.cmd test; Pop-Location
Push-Location apps\mobile; flutter pub get; flutter analyze; flutter test; Pop-Location
```

On Ubuntu/Linux:

```bash
(cd backend/api && mvn -B test)
(cd apps/web && npm ci && npm run build)
(cd apps/admin && npm ci && npm run build)
(cd packages/shared-types && npm ci && npm run typecheck && npm test)
(cd services/presentation-renderer && npm ci && npm test)
(cd apps/mobile && flutter pub get && flutter analyze && flutter test)
```

Backend integration tests need a fresh disposable PostgreSQL 16 database; never point them at production or a shared database. Renderer PDF tests additionally require LibreOffice and Python `python-pptx`; CI installs both. Validate the production Compose file on Linux with:

```bash
bash infra/deployment/validate.sh /path/to/slideforge.production.env
```

Keep application builds and server-only credentials separate: `VITE_API_URL` and `API_BASE_URL` are public client endpoints, never secrets. Real Payme, Click, and Uzum processing is not enabled; obtain current merchant specifications and credentials before implementing or activating provider adapters. See [payment notes](PAYMENTS.md).
