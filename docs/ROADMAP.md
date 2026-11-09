# Roadmap

| Phase | Status |
|-------|--------|
| 0 Architecture + renderer PoC | **Done** (architecture, ERD, API and renderer decisions documented; PDF test passes in Linux/CI with LibreOffice) |
| 1 Foundation (compose, Flyway, health, CI, app shells) | **Done** (stack starts, migrations run, API and clients validated) |
| 2 Auth + core data | **Done** (email verification/recovery, owner-scoped versioned deck CRUD, configurable auth endpoint rate limits; release operations still need live verification) |
| 2b Editor core (deck types, ops, undo/redo) | **Done**, typecheck passes and all 6 tests pass |
| 3 Web editor + export integration | **Implemented** (visual editor, versioned saves, authenticated PPTX/PDF jobs and downloads; production smoke test pending) |
| 4 AI generation | **Implemented, provider-gated** (authenticated persisted jobs and validated web flow; no live provider compatibility test) |
| 5 Marketplace + payments | Provider-independent listings/orders/sandbox implemented; real payment processing blocked on merchant specifications and credentials |
| 6 Admin panel | **Implemented** (role-protected sign-in and user management) |
| 7 Flutter MVP | Partial (auth, library, create/open, multi-slide text/title editing, versioned saves and conflict reload; export pending; signed AAB workflow awaits operator signing secrets) |
| 8 Quality + release | In progress (backend, web, admin, shared types, mobile, and renderer checks pass; live VDS deployment, backups, monitoring and production smoke tests pending) |

## Phase 1 checkpoint details

- Added a Java 21 / Spring Boot 3.4.5 API with PostgreSQL, Flyway, Actuator, validation, Springdoc, and a tested public status endpoint.
- Docker Compose includes PostgreSQL, RabbitMQ, RustFS S3-compatible storage, and the API image; startup and Flyway migrations were verified. The RustFS disk-check bypass is development-only because named volumes share one physical host disk.
- The web shell reads live API status and displays loading/unavailable states. Web and admin production builds pass; mobile CI currently builds a development/debug APK.
- Production readiness still requires VDS credentials, DNS, operator-owned secrets, and live smoke checks.

## Phase 2 checkpoint details

- Implemented BCrypt registration/login, short-lived signed access tokens, hashed refresh-token rotation/revocation, HttpOnly refresh cookie, and `/api/v1/users/me`.
- Implemented authenticated presentation create/list/read/version/save/archive APIs. Server validates schema version, supported language, slide dimensions, geometry bounds, supported element types, and document size; owner checks return the same not-found response for unknown or foreign IDs.
- Web restores auth from the refresh cookie, signs in/registers, refreshes expired access tokens in memory, and manages owned presentation records. Phase 3 editor workflows now include slide navigation/order, speaker notes, backgrounds, text/shape/image elements, geometry and style controls, undo/redo, and versioned saves. PPTX/PDF exports use owner-scoped persisted jobs and authenticated downloads; final phase validation remains in progress.
- Flutter has Android/iOS project scaffolds and uses `dio` and `flutter_secure_storage` for register/login, cookie-backed refresh, local secure session restore, and logout; project listing and editing remain Phase 7. Android debug build was verified locally.
- PostgreSQL integration tests cover token hash storage, refresh replay, auth enumeration behavior, owner isolation, immutable versions, conflicts, malformed geometry, and archive behavior.
- Authentication registration, login, and refresh endpoints are rate-limited to 10 POST requests per peer IP per 60-second fixed window by default; both values are configurable. This limiter is in-memory and per API instance.
- Phase 4 now has authenticated persisted generation jobs and web prompt/submit/poll/save behavior. The OpenAI-compatible provider is server-only; an absent configuration fails explicitly. Output is bounded and validated against the canonical deck schema. Configure provider base URL, model, and API key before enabling this feature.
- Flutter has an authenticated presentation library with create/open, refresh/retry/empty/error states, multi-slide title/text editing, add/remove slide, versioned save, and explicit reload after a concurrent version conflict. Mobile export remains pending.
- Email verification and password recovery are implemented with generic action responses; production SMTP delivery still needs testing with the chosen provider.
- A fresh PostgreSQL 16 run passed all 32 backend tests both with and without the V8 bootstrap admin configured.
- The V8 migration seeds an admin only from the configured email and Base64 BCrypt hash; there are no committed default credentials.
- Flyway migrations are append-only. Preserve migrations already applied in any shared environment.
- Real Payme, Click, and Uzum payment adapters must not be activated until current merchant technical materials and credentials verify protocol authentication, amount units, lifecycle, replay protection, and sandbox behavior. See `PAYMENTS.md`.
