# Continuation notes

Last updated: 2026-11-09

## Current checkpoint

- **Active work:** Release readiness and VDS operator setup. The Ubuntu 24.04/Caddy/GHCR deployment pipeline and runbook are prepared; live deployment remains unverified.
- **Phase 2:** Registration, login, refresh, profile, email verification/recovery, owner-scoped deck persistence, and configurable in-memory auth rate limits (default 10 requests/peer IP/60 seconds) are implemented. Caddy strips untrusted forwarded headers and supplies the connected client address; rate limiting remains per API process.
- **Phase 3:** Web editor, versioned saves, and authenticated PPTX/PDF export jobs/downloads are implemented.
- **Phase 4:** Authenticated persisted generation jobs and web prompt/poll/save flow are implemented. The server requires an OpenAI-compatible provider; it bounds output and schema-validates results. No live provider compatibility test has been run.
- **Phase 5:** Provider-independent catalog/listing/order/sandbox foundations are implemented and covered by tests. Real payment processing remains blocked on current merchant specifications and credentials.
- **Phase 6:** Role-protected admin user management and invitation-only administrator registration are implemented. An existing admin sends a one-time email invitation; the invitee can request a resend using their email address and sets their own password from the email link in the admin app.
- **Phase 7:** Flutter supports authentication, a signed-in library, create/open, multi-slide text/title editing, versioned saves, and explicit reload after version conflicts. Mobile exports remain pending. Release builds use external signing secrets and a tagged Android App Bundle workflow; signed artifact creation requires operator-managed signing secrets.
- **Deployment target:** Ubuntu 24.04, Docker Compose, Caddy, GHCR; `slides.encode.uz`, `slides-admin.encode.uz`, and `api-slides.encode.uz`. Never put deployment credentials in source or documentation.
- **Payment gate:** Payme/Click/Uzum technical request/auth/amount/lifecycle/replay/sandbox details could not be verified from public official pages. Obtain current merchant packs and contracts; do not activate guessed adapters.
- **Last verified validation:** Backend suite passed all 32 tests on a fresh PostgreSQL 16 database; web/admin production builds passed; shared-types typecheck and all 6 tests passed; mobile analysis, all 16 tests, and a debug APK build passed. All 7 renderer tests passed in the previous Linux validation; this Windows environment cannot run the PDF test without LibreOffice. Production Compose syntax, Caddy configuration, both workflow YAML files, and backup-helper Bash syntax validated.

## Start here next

1. Review [the deployment runbook](DEPLOYMENT.md), configure the protected GitHub `production` environment, DNS, VDS firewall/SSH access, SMTP, admin hash, GHCR pull credentials, and deployment path.
2. Run the GitHub CI and production deployment workflow, then verify the web, admin, API health, email verification/recovery, and export flows on the live VDS.
3. Configure and smoke-test the selected AI provider if generation will be enabled.
4. Configure the `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` GitHub Environment secrets, then create a `vX.Y.Z` tag to build a signed Android App Bundle. Decide whether mobile export is required in the first public release.
5. Obtain official merchant integration materials before implementing real payments. Do not guess Payme/Click/Uzum protocols.
6. Configure off-host database and export-volume backups, monitoring, and a tested restore/incident procedure.

The live deployment and production smoke tests cannot be completed without operator-controlled VDS access, DNS, and service credentials. Do not claim production deployment from local or CI validation alone.

## Known limitations and checks

- The rate limiter is an in-memory fixed-window counter local to one API process; it is not distributed and is not sufficient as a production multi-instance control.
- It keys by `HttpServletRequest.getRemoteAddr()`. The production API is private behind Caddy, which does not trust incoming forwarded headers by default; don't expose the API directly or enable trust for arbitrary forwarded headers.
- Run backend checks from `backend/api`: `mvn test`. For only the limiter: `mvn -Dtest=AuthRateLimitFilterTest test`.
- Run the web/admin `npm.cmd run build` in their app folders, shared deck model `npm.cmd run typecheck` and `npm.cmd test`, backend `mvn test` in `backend/api`, and mobile `flutter analyze` / `flutter test` when those projects change.
- Generation provider config is server-only (`AI_PROVIDER_BASE_URL`, `AI_PROVIDER_MODEL`, `AI_PROVIDER_API_KEY`); provider assumptions and response shape are in `API.md`.
- Mobile export remains unimplemented; Android release signing is configured to require external signing secrets and has not been exercised with the production key.
- Renderer PDF tests require LibreOffice (`soffice`) and Python `python-pptx`; CI installs both. They passed in a temporary Linux container for this checkpoint.
- The Compose deployment does not configure backups or monitoring automatically. Production operations must provide these before accepting user data.
- The default local PostgreSQL database has a recorded Flyway version 6 that is not present in this checkout. Flyway rejects that existing database; use a fresh disposable database for tests and do not repair/reset a shared database without investigating its migration history.
- See `ROADMAP.md`, `PROJECT_MAP.md`, and `DEPLOYMENT.md` for phase, architecture, and release orientation.

## Orientation

Read `PROJECT_MAP.md` for architecture and flow diagrams, then `ROADMAP.md` and the focused docs linked from `README.md`. The project map skill is `.github/skills/slideforge-project-mapping/SKILL.md`.
