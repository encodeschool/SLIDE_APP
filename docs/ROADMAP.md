# Roadmap

| Phase | Status |
|-------|--------|
| 0 Architecture + renderer PoC | **Done** (architecture, ERD, API and renderer decisions documented; PDF test passes in Linux/CI with LibreOffice) |
| 1 Foundation (compose, Flyway, health, CI, app shells) | **Done** (stack starts, migrations run, API and clients validated) |
| 2 Auth + core data | **Done** (email verification/recovery, owner-scoped versioned deck CRUD, configurable auth endpoint rate limits; release operations still need live verification) |
| 2b Editor core (deck types, ops, undo/redo) | **Done**, typecheck passes and all 6 tests pass |
| 3 Web editor + export integration | **Implemented** (full-height responsive editor contained in the workspace main panel, with slide rail, canvas, tool inspector, inline text editing, drag/drop text/shapes/icons/images, theme/font controls, versioned saves, authenticated PPTX/PDF jobs and downloads; production smoke test pending) |
| 4 AI generation | **Implemented, provider-gated** (authenticated persisted jobs and validated web flow; no live provider compatibility test) |
| 5 Marketplace + payments | Responsive catalog, owned-presentation and typed file publishing, private storage, entitlement-gated buyer downloads, orders, wallet transaction history, and sandbox top-ups implemented; malware scanning, real card processing, seller payouts, and legal invoices remain gated |
| 6 Admin panel | **Implemented** (role-protected sign-in, user management, marketplace listing moderation, and SUPERADMIN category management) |
| 7 Flutter MVP | Partial (auth, library, create/open, multi-slide text/title editing, versioned saves and conflict reload; export pending; signed AAB workflow awaits operator signing secrets) |
| 7b Multi-format learning artifacts | Vertical slice implemented: typed non-deck schema, versioned owner-scoped API, AI drafts for 10 formats, web/mobile editing/library, interactive quiz/crossword, DOCX/PDF export. Artifact drafts/exports are synchronous; mobile files are app-private. |
| 8 Quality + release | In progress (backend, web, admin, shared types, mobile, and renderer checks pass; live VDS deployment, backups, monitoring and production smoke tests pending) |

Web, admin, and mobile keep English, Russian, and Uzbek interface catalogs in their respective `i18n` folders; Uzbek is the default for new clients while saved/account preferences are preserved. The Uzbek copy uses the project-requested 2026 Latin letters Ş/ş, Ç/ç, Ö/ö, and Ğ/ğ. The public web root has a responsive localized landing page with centered in-page web, admin, and mobile product sections and illustrative promo previews. Its desktop header keeps “What can you make?”, a highlighted Marketplace link, and “How it works”; mobile uses a logo-only header and a fixed Liquid Glass action bar for marketplace, sign-in, and registration. The marketplace catalog and cart are a separate storefront at `/marketplace`. Web sign-in and self-registration, plus admin sign-in and invitation registration, are standalone screens without app navigation. Administrator registration remains invitation-only; web and mobile accounts use the existing self-registration and email-verification flow. GSAP scroll entrances alternate with the content layout, and the branded intro loader and scroll effects honor reduced-motion preferences. Production builds pass; live deployment remains part of Phase 8.

The prepared Ubuntu 24.04 production target is `176.96.243.45`, with the web, admin, and API on `eduslides.encode.uz`, `admin-eduslides.encode.uz`, and `api-eduslides.encode.uz` plus `www` redirects. Docker Compose deploys to `/home/encode/eduslides`; Caddy automatically obtains and renews ACME TLS certificates. The protected GitHub `production` environment, operator-controlled secrets/DNS, live deployment, backup restore, and production smoke tests remain pending.

## Phase 1 checkpoint details

- Added a Java 21 / Spring Boot 3.4.5 API with PostgreSQL, Flyway, Actuator, validation, Springdoc, and a tested public status endpoint.
- Docker Compose includes PostgreSQL, RabbitMQ, RustFS S3-compatible storage, and the API image; startup and Flyway migrations were verified. The RustFS disk-check bypass is development-only because named volumes share one physical host disk.
- The web shell reads live API status and displays loading/unavailable states. Web and admin production builds pass; mobile CI currently builds a development/debug APK.
- Production readiness still requires VDS credentials, DNS, operator-owned secrets, and live smoke checks.

## Phase 2 checkpoint details

- Implemented BCrypt registration/login, short-lived signed access tokens, hashed refresh-token rotation/revocation, HttpOnly refresh cookie, and `/api/v1/users/me`.
- Implemented authenticated presentation create/list/read/version/save/archive APIs. Server validates schema version, supported language, slide dimensions, geometry bounds, supported element types, and document size; owner checks return the same not-found response for unknown or foreign IDs.
- Web restores auth from the refresh cookie, signs in/registers, refreshes expired access tokens in memory, and manages owned presentation records. Editor workflows include slide navigation/order, speaker notes, backgrounds, text/shape/image elements, drag/keyboard positioning, geometry and style controls, undo/redo, and versioned saves. Generation exposes format, output language, and item-count selectors before submit. PPTX/PDF exports use owner-scoped persisted jobs and authenticated downloads; production smoke testing remains pending.
- Flutter has Android/iOS project scaffolds and uses `dio` and `flutter_secure_storage` for register/login, cookie-backed refresh, local secure session restore, and logout; project listing and editing remain Phase 7. Android debug build was verified locally.
- PostgreSQL integration tests cover token hash storage, refresh replay, auth enumeration behavior, owner isolation, immutable versions, conflicts, malformed geometry, and archive behavior.
- Authentication registration, login, and refresh endpoints are rate-limited to 10 POST requests per peer IP per 60-second fixed window by default; both values are configurable. This limiter is in-memory and per API instance.
- Phase 4 now has authenticated persisted generation jobs and web prompt/submit/poll/save behavior. The OpenAI-compatible provider is server-only; an absent configuration fails explicitly. Output is bounded and validated against the canonical deck schema. Configure provider base URL, model, and API key before enabling this feature.
- Flutter has an authenticated presentation library with create/open, refresh/retry/empty/error states, multi-slide title/text editing, add/remove slide, versioned save, and explicit reload after a concurrent version conflict. Mobile export remains pending.
- Email verification and password recovery are implemented with generic action responses; production SMTP delivery still needs testing with the chosen provider.
- A fresh PostgreSQL 16 run passed all 32 backend tests both with and without the V8 bootstrap admin configured.
- The V8 migration seeds an admin only from the configured email and Base64 BCrypt hash; there are no committed default credentials.
- Marketplace clients can browse a published catalog, filter by category, inspect seller/license metadata, create orders, publish an owned canonical presentation, or upload a typed work file through the web dialog. The API validates the allowlisted file type/signature, stores a random private object key on the immutable listing version, and delivers the attachment only to a buyer with an active entitlement from a paid order. Uploads are limited to 25 MiB and are not currently malware-scanned; add scanning/quarantine before accepting untrusted uploads at public scale. Account displays wallet transaction history. Sandbox checkout remains disabled unless explicitly enabled under the sandbox profile. Real payments, payouts, and invoice generation remain gated. V11 grants SUPERADMIN only to the configured existing verified administrator.
- Flyway migrations are append-only. Preserve migrations already applied in any shared environment.
- Real Payme, Click, and Uzum payment adapters must not be activated until current merchant technical materials and credentials verify protocol authentication, amount units, lifecycle, replay protection, and sandbox behavior. See `PAYMENTS.md`.
