# Local development

## Prerequisites

- Docker Desktop with Compose
- Java 21 and Maven 3.9+
- Node.js 22+
- Flutter stable (for mobile)
- LibreOffice and Python 3 with `python-pptx` (for full renderer tests)

## Start infrastructure

Copy `.env.example` to `.env`, then from the repository root:

```powershell
docker compose up --build -d
```

```bash
docker compose up --build -d
```

The API starts on `http://localhost:8080`, PostgreSQL on `5432`, RabbitMQ management on `15672`, RustFS S3 API on `9000`, and its console on `9001`. Compose also builds a private renderer service with LibreOffice and persists export files in a Docker volume. Compose applies Flyway migrations during API startup. Local credentials in `.env.example` are development-only. Sign into the RustFS console with the S3 access/secret values and create the `slideforge` bucket; marketplace asset storage is a later phase.

This Compose configuration is for local development only. In particular, the RustFS disk-check bypass is not suitable for production. Do not expose these ports publicly; see [security status](SECURITY.md).

## Run the clients

```powershell
cd apps/web
npm ci
npm run dev -- --port 5173
```

In a separate terminal:

```powershell
cd apps/admin
npm ci
npm run dev -- --port 5175
```

```bash
(cd apps/web && npm ci && npm run dev -- --port 5173)
(cd apps/admin && npm ci && npm run dev -- --port 5175)
```

The web app supports account/profile workflows, presentation library management, a visual deck editor with versioned saves, asynchronous PPTX/PDF exports, and AI generation. Flutter supports registration/login, secure session restore, a presentation library, create/open, title and text editing across slides, add/remove slide operations, versioned saves, and reloading the server version after a save conflict. Mobile exports remain future work.

The marketplace is available to signed-out visitors in both clients: browsing, categories, listing details, seller information, and cart are public; checkout requires an account. Seller listings require a signed-in user with an owned presentation. Category preferences are saved for signed-in shoppers. The marketplace UI supports English, Russian, and Uzbek (Latin script). The admin category manager is available only to `SUPERADMIN`.

For a storefront demo without creating orders, set `VITE_MARKETPLACE_DEMO=true` when building/running the web app, or launch Flutter with `--dart-define=MARKETPLACE_DEMO=true`. Both modes use local sample listings and paginate by 10; demo checkout explicitly does not create an order or charge. Real payment-provider integrations are not enabled: the API has a development-only sandbox adapter that is disabled by default, and production checkout requires a provider-specific integration and credentials.

For AI generation, configure `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_MODEL`, and `AI_PROVIDER_API_KEY` on the API server (never in a `VITE_*` variable or client `.env`). The API expects an OpenAI-compatible chat-completions endpoint with JSON-object output support; see [the API contract](API.md) for request/response assumptions and limits. Without provider configuration, generation jobs fail explicitly.

### Bootstrap the first administrator

There are no committed default administrator credentials. On the first database migration, V8 inserts one verified administrator only when both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64` are configured. V11 grants `SUPERADMIN` only to that configured email when it is already a verified, active `ADMIN`; partial/invalid configuration and accounts without the `ADMIN` role fail migration. Neither migration assigns privileged roles during public registration. The hash is generated with the application's Spring password encoder and contains no plaintext password.

From an interactive terminal:

```powershell
Push-Location backend\api
mvn -q -DskipTests compile exec:java
Pop-Location
```

Enter a unique password when prompted and copy the emitted `BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64` value to a secret store. Set `BOOTSTRAP_ADMIN_EMAIL` and the hash in `.env` before running Flyway for the first time (`docker compose up --build -d`). V11 is one-time as well; on a fresh install it elevates only the bootstrap administrator. Do not commit `.env` or paste the password/hash in tickets or chat.

For production, configure GitHub Environment `production` secrets `PROD_BOOTSTRAP_ADMIN_EMAIL` and `PROD_BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64` before the first deployment; the deployment workflow supplies them to Flyway. The migration is one-time: changing these values after V8 has already run does not rotate or create an administrator. Use the normal verified password-recovery flow to rotate the bootstrap password. Never seed a shared hard-coded password.

The Flutter Android emulator defaults to `http://10.0.2.2:8080`. iOS Simulator and physical-device builds should use an HTTPS development endpoint; iOS App Transport Security blocks plain HTTP unless a narrowly scoped local-development exception is configured. For a physical device, set `API_BASE_URL` to a reachable HTTPS development address.

Android debug builds do not need signing secrets. Release builds intentionally fail unless `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` point to an externally managed upload key. The tagged release workflow consumes these as GitHub Environment secrets; never commit the keystore or its passwords.

For a non-local deployment, set `VITE_API_URL` in `apps/web/.env.local` at build time, using `apps/web/.env.example` as a reference. Vite embeds this public API base URL in the client bundle, so never put secrets there.

## Checks

Backend integration tests run Flyway against the configured PostgreSQL database. Use an empty disposable PostgreSQL 16 database; do not point tests at a shared development or production database. The local database used during the 2026-11-09 validation had an applied Flyway version 6 with no corresponding migration file in this checkout, so Flyway validation rejected that database. The full suite passed against new disposable databases with and without the V8 bootstrap admin.

```powershell
Push-Location backend/api; mvn test; Pop-Location
Push-Location packages/shared-types; npm ci; npm run typecheck; npm test; Pop-Location
Push-Location services/presentation-renderer; npm install; npm test; Pop-Location
Push-Location apps/mobile; flutter pub get; flutter analyze; flutter test; flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8080; Pop-Location
```

The focused authentication rate-limit tests can be run with `Push-Location backend/api; mvn -Dtest=AuthRateLimitFilterTest test; Pop-Location`.

```bash
(cd backend/api && mvn test)
(cd packages/shared-types && npm ci && npm run typecheck && npm test)
(cd services/presentation-renderer && npm install && npm test)
(cd apps/mobile && flutter pub get && flutter analyze && flutter test && flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8080)
```

Renderer PDF tests require `soffice` and `python-pptx`; missing tools fail the export test rather than silently skipping it. The Compose renderer image includes LibreOffice. The renderer is internal to the Compose network; the API reaches it through `RENDERER_URL`. Export jobs are polled from `GET /api/v1/exports/{jobId}` and completed artifacts are downloaded from the returned authenticated `downloadUrl`; files persist in the `exports_data` volume. The API status endpoint is `GET /api/v1/status`, health is `/actuator/health`, and Swagger UI is `/swagger-ui.html`.

## Current checkpoint

Authentication, email verification/recovery, core presentation persistence, web editor/export, role-protected admin user management, and marketplace catalog/seller/sandbox workflows are implemented. AI generation requires an operator-configured provider. Flutter supports a marketplace catalog and seller publishing in addition to its presentation editor; mobile exports and a buyer entitlement library remain future work. Android release signing requires the operator's key; the VDS web/API deployment still requires the operator's DNS, secrets, and production smoke tests. See [continuation notes](CONTINUATION.md) and the [production deployment runbook](DEPLOYMENT.md).