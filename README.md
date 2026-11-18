# EDU Slides

EDU Slides is an AI-assisted presentation platform with a Spring Boot API, PostgreSQL, React web and admin clients, a Flutter mobile client, and a private PPTX/PDF renderer. The production web deployment uses Docker Compose, GHCR, Caddy, and GitHub Actions on Ubuntu 24.04.

The app and API are built and deployed from this repository. A live VDS deployment still requires operator-managed DNS, SSH access, GitHub secrets, SMTP credentials, and production smoke tests. Real Payme, Click, and Uzum processing is not implemented or enabled.

## Production hostnames

All records point to the VDS at `176.96.243.45`. Caddy serves the canonical names and redirects the `www` aliases.

| URL | Service |
|---|---|
| `https://eduslides.encode.uz` | Public web app and landing page |
| `https://www.eduslides.encode.uz` | Redirects to the public web app |
| `https://admin-eduslides.encode.uz` | Admin app |
| `https://www.admin-eduslides.encode.uz` | Redirects to the admin app |
| `https://api-eduslides.encode.uz` | Spring Boot API |
| `https://www.api-eduslides.encode.uz` | Redirects to the API |

The VDS deployment directory is `/home/encode/eduslides`. The Flutter app is not hosted on the VDS; it connects to the API hostname above.

## Applications and services

| Component | Source | Build / role |
|---|---|---|
| Web | `apps/web/` | Vite/React landing page, workspace, storefront with typed file publishing and buyer downloads, and a responsive slide editor contained in the workspace main panel |
| Admin | `apps/admin/` | Vite/React role-protected admin console |
| API | `backend/api/` | Java 21 / Spring Boot REST API and Flyway migrations |
| Renderer | `services/presentation-renderer/` | Node.js service for editable PPTX and PDF generation |
| Shared types | `packages/shared-types/` | Canonical deck model and editor operations |
| Mobile | `apps/mobile/` | Flutter Android/iOS client with marketplace file publishing, previews, and a persistent cart summary; released separately from VDS |
| Production proxy | `infra/deployment/Caddyfile` | Caddy HTTPS reverse proxy and `www` redirects |
| Production stack | `infra/deployment/compose.production.yml` | Web, admin, API, renderer, PostgreSQL and Caddy |

Production containers do not expose PostgreSQL, API, or renderer ports publicly. Only Caddy publishes ports 80/443. The API and renderer communicate on the private Compose network.

## Requirements

### Local development

- Docker Desktop with the Compose plugin, or Docker Engine + Compose plugin on Linux.
- Node.js 22+ and npm.
- Java 21 and Maven 3.9+.
- Flutter stable and Android SDK for mobile builds.
- LibreOffice and Python `python-pptx` for the full renderer tests.

### VDS deployment

- Ubuntu 24.04 VDS with public IP `176.96.243.45`.
- DNS control for `encode.uz`.
- An SSH-enabled deployment account named `encode`.
- Inbound SSH plus TCP 80/443; optional UDP 443 for HTTP/3.
- GitHub Actions access to publish/pull GHCR packages and connect to the VDS.

The VDS does not need Java, Node.js, Maven, or Flutter installed: GitHub Actions builds the container images. Install Docker Engine and the Compose plugin on the VDS as described in [the deployment runbook](docs/DEPLOYMENT.md).

## Run locally with Docker

The root `docker-compose.yml` is for development only. It starts PostgreSQL, RabbitMQ, RustFS, Mailpit, the API, and renderer; it does not start the Vite web/admin dev servers.

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Linux/macOS:

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Development-only local URLs:

| Service | URL |
|---|---|
| API | `http://localhost:8080/api/v1/status` |
| API health | `http://localhost:8080/actuator/health` |
| Mailpit inbox | `http://localhost:8025` |
| PostgreSQL | `localhost:5432` |
| RabbitMQ management | `http://localhost:15672` |
| RustFS S3 API / console | `localhost:9000` / `localhost:9001` |
| Web Vite server | `http://localhost:5173` |
| Admin Vite server | `http://localhost:5175` |

Run the web and admin development servers in separate terminals:

```powershell
Push-Location apps\web; npm.cmd ci; npm.cmd run dev -- --port 5173; Pop-Location
Push-Location apps\admin; npm.cmd ci; npm.cmd run dev -- --port 5175; Pop-Location
```

```bash
(cd apps/web && npm ci && npm run dev -- --port 5173)
(cd apps/admin && npm ci && npm run dev -- --port 5175)
```

The local API defaults to `http://localhost:8080`. Use Mailpit to read verification, password recovery, and invitation emails. New accounts must verify their email before signing in. The local Compose stack enables the sandbox profile and contains development credentials; do not use it as the production stack or expose its ports publicly.

## Build and test every app

Run commands from the repository root.

### Web

```powershell
Push-Location apps\web; npm.cmd ci; npm.cmd run build; Pop-Location
```

```bash
cd apps/web && npm ci && npm run build
```

The web production image is built from the repository root using `apps/web/Dockerfile`. The public API base URL is provided at build time as `VITE_API_URL`; it is not a secret.

### Admin

```powershell
Push-Location apps\admin; npm.cmd ci; npm.cmd run build; Pop-Location
```

```bash
cd apps/admin && npm ci && npm run build
```

The admin production image is built from the repository root using `apps/admin/Dockerfile`. The production API URL is injected as `VITE_API_URL`.

### Backend API

Start a fresh disposable PostgreSQL 16 database before running integration tests. Do not point tests at a shared development or production database.

```powershell
Push-Location backend\api; mvn test; Pop-Location
```

```bash
cd backend/api && mvn -B test
```

The production Dockerfile builds the API with Maven and runs it on Java 21. Flyway migrations run on application startup. Marketplace uploads are stored in the private `exports_data` volume alongside generated exports; preserve and back up the volume. Keep migrations additive and compatible with the previous app release because deployment rollback does not roll database migrations back.

### Shared deck model

```powershell
Push-Location packages\shared-types; npm.cmd ci; npm.cmd run typecheck; npm.cmd test; Pop-Location
```

```bash
cd packages/shared-types && npm ci && npm run typecheck && npm test
```

### Presentation renderer

```powershell
Push-Location services\presentation-renderer; npm.cmd ci; npm.cmd test; Pop-Location
```

```bash
cd services/presentation-renderer && npm ci && npm test
```

The full PDF tests require LibreOffice (`soffice`) and Python `python-pptx`. The renderer production image includes LibreOffice and is only reachable by the API on the private Compose network.

### Flutter mobile

```powershell
Push-Location apps\mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8080
Pop-Location
```

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

`10.0.2.2` addresses the host machine from the Android emulator. A physical-device build must use a reachable HTTPS API URL. A signed Android App Bundle requires the upload keystore and the four `ANDROID_*` secrets in the GitHub `production` environment. Pushing a `vX.Y.Z` tag runs the separate mobile release workflow.

### All-in-one CI checks

`.github/workflows/ci.yml` runs shared-types, renderer, backend, web, admin, and Flutter checks on pushes and pull requests. The production workflow runs only after successful CI for a push to `main`, or by manual dispatch from `main`.

## Deploy to a fresh Ubuntu VDS

The complete step-by-step operator instructions, secret names, recovery procedure, and backup guidance are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The outline below records the target values for this deployment.

### 1. DNS and network

Create A records for `eduslides`, `admin-eduslides`, and `api-eduslides` pointing to `176.96.243.45`. Create CNAME records for each matching `www` name, pointing to its canonical hostname. Remove stale AAAA records unless IPv6 is configured on the VDS. Allow inbound SSH and TCP 80/443 in both the VDS provider firewall and Ubuntu firewall.

### 2. Install Docker Engine and Compose

On Ubuntu 24.04, add Docker's official apt repository and install `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`. The exact commands are in [the Docker bootstrap section](docs/DEPLOYMENT.md#2-install-docker-on-a-fresh-ubuntu-vds). Use a trusted `encode` deployment account and permit it to run Docker; Docker group membership is effectively root access.

The GitHub deployment variable must be:

```text
VDS_DEPLOY_PATH=/home/encode/eduslides
```

### 3. Configure GitHub secrets

Create a protected GitHub Environment named `production`. The workflow needs `VDS_HOST=176.96.243.45`, `VDS_USER=encode`, a dedicated SSH private key and verified host key, GHCR pull credentials, database/JWT secrets, bootstrap admin email/hash, and SMTP settings. See [the full secrets table and setup](docs/DEPLOYMENT.md#4-configure-github-actions). Do not commit any server credentials or production `.env` files.

### 4. Deploy

After DNS and secrets are ready, push a reviewed change to `main` and wait for CI plus `Deploy production`, or manually dispatch `Deploy production` on `main`. GitHub Actions builds and pushes SHA-tagged web, admin, API, and renderer images; transfers the production Compose/Caddy config and restricted env file; and deploys to `/home/encode/eduslides`.

Verify:

```bash
curl --fail --show-error https://api-eduslides.encode.uz/actuator/health
```

Then verify web/admin login, email verification, password recovery, exports, TLS, and the `www` redirects. Do not claim a live deployment until these checks pass on the VDS.

## HTTPS and Certbot

The production stack uses Caddy, which obtains and renews ACME certificates automatically for all six configured hostnames. Keep ports 80/443 open and persist the `caddy_data` volume. Certbot is intentionally not installed: running Certbot standalone alongside Caddy would conflict over the HTTP/HTTPS ports. If Certbot is a strict requirement, switch the reverse-proxy/TLS architecture rather than running two listeners.

## Operate and back up production

```bash
cd /home/encode/eduslides
docker compose --env-file slideforge.production.env -f compose.production.yml ps
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 api
docker compose --env-file slideforge.production.env -f compose.production.yml logs --tail=200 caddy
```

Deploy through GitHub Actions so images and configuration stay in sync. Never run `docker compose down -v` on production; it removes persistent database, exports/marketplace files, and Caddy certificate data.

Configure encrypted off-host backups before accepting real user data. The helper is `infra/deployment/backup-production.sh`; it archives PostgreSQL and the persistent export volume (including marketplace files), encrypts them with `age`, and uploads them with `rclone`. Keep the age private key off the VDS, test restores, and configure retention. Full instructions are in [the deployment runbook](docs/DEPLOYMENT.md#backups-and-recovery).

## Current limitations and release gates

- No live VDS deployment, SMTP delivery test, or production AI-provider test has been performed yet.
- Real external payment processing, seller payouts, and legal invoices are not implemented.
- Web and mobile marketplace clients support typed work-file publishing, and mobile displays up to the first two public preview pages. The API gates original-file downloads on buyer entitlement and the documented allowlist. Uploaded files are not currently malware-scanned.
- The web bundle builds with Vite, but the full production build is currently blocked by pre-existing unused declarations in `apps/web/src/app/App.tsx`; see [the continuation notes](docs/CONTINUATION.md#current-checkpoint).
- The authentication rate limiter is process-local; a multi-instance API deployment needs a distributed limiter.
- Production backups, monitoring/alerting, and an incident/restore drill must be operator-configured.
- The Flutter app is released separately and is not included in the VDS Compose stack.

## Project documentation

- [Production deployment runbook](docs/DEPLOYMENT.md)
- [Local development and checks](docs/DEVELOPMENT.md)
- [Project map and diagrams](docs/PROJECT_MAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/ERD.md)
- [API contract](docs/API.md)
- [Security status](docs/SECURITY.md)
- [Payments assumptions](docs/PAYMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Continuation notes](docs/CONTINUATION.md)
