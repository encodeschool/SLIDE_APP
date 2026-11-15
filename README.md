# Slideforge

Slideforge is an AI-assisted presentation platform built from a Spring Boot modular monolith, PostgreSQL/Flyway, React web and admin clients, Flutter mobile, and a versioned canonical deck model. Core web, admin, API, export, and provider-independent marketplace workflows are implemented; the mobile editor and production rollout still have release gates. See [the roadmap](docs/ROADMAP.md) for current scope.

## Current checkpoint

- Spring Boot API: status/health/OpenAPI, PostgreSQL/Flyway, email verification/recovery, configurable in-memory auth rate limits, owner-scoped versioned presentations, PPTX/PDF exports, validated AI generation jobs, admin user management, and provider-independent marketplace/sandbox flows.
- Renderer: private HTTP service that generates editable PPTX and DOCX files and converts presentation/artifact content to PDF through LibreOffice. Compose builds the renderer with LibreOffice; full presentation renderer tests also require Python `python-pptx`.
- Shared TypeScript deck model and undo/redo operations back the web editor, with passing tests.
- Web provides an original-brand responsive landing page with GSAP motion, in-page product previews for web, admin, and mobile, and a mobile Liquid Glass action bar for marketplace, sign-in, and registration. The separate responsive marketplace storefront at `/marketplace` includes catalog, cart, checkout flow, and publishing for owned presentations; web sign-in and self-registration use standalone screens without workspace navigation. The authenticated workspace provides the visual editor, versioned saves, exports, configured-provider AI generation, and wallet transaction history in Account. Editor elements can be moved by dragging or keyboard. Admin provides responsive role-protected user and marketplace management; sign-in and invitation-based registration are also standalone, and administrator registration remains invitation-only. Flutter supports authentication and self-registration with email verification, presentation and learning-document libraries, editing, and versioned saves; mobile presentation export and signed release builds require additional operator setup.
- Web, admin, and mobile keep their English, Russian, and Uzbek interface copy in app-specific `i18n` folders. Uzbek uses the 2026 Latin letters specified for this project: Ş/ş, Ç/ç, Ö/ö, and Ğ/ğ (for example, şahar, çoy, Özbekiston, ğalaba). New and unsaved installs default to Uzbek; an existing account or saved language preference remains in effect.
- Web and mobile also support owner-scoped editable learning artifacts (essay, independent work, coursework, dissertation, research article, quiz, crossword, thesis abstract, glossary, and argumentative essay), with AI drafts, versioned save/reopen, interactive quiz/crossword play, and DOCX/PDF export. Slides continue to use the canonical deck model and PPTX/PDF path.
- Real payment adapters, seller payouts, legal invoices, and arbitrary-file marketplace uploads/delivery remain gated on merchant specifications, legal requirements, and secure storage/entitlement support. Production deployment is automated for a configured Ubuntu VDS, but no live deployment has been performed.

## Start

See [local development instructions](docs/DEVELOPMENT.md). With Docker Desktop installed, copy `.env.example` to `.env` and run:

```bash
docker compose up --build -d
```

API: `http://localhost:8080/api/v1/status`. Swagger UI: `http://localhost:8080/swagger-ui.html`.

For production prerequisites, GitHub secrets, VDS setup, deployment, health checks, and backup guidance, see the [production deployment runbook](docs/DEPLOYMENT.md).

## Architecture and decisions

- [Project map and diagrams](docs/PROJECT_MAP.md)
- [Project structure and module boundaries](docs/PROJECT_STRUCTURE.md)
- [Next-session continuation notes](docs/CONTINUATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/ERD.md)
- [API contract](docs/API.md)
- [Security status](docs/SECURITY.md)
- [Decisions](docs/DECISIONS.md)
- [Development and known limitations](docs/DEVELOPMENT.md)
- [Production deployment runbook](docs/DEPLOYMENT.md)
- [Payments assumptions](docs/PAYMENTS.md)

For project diagrams and focused continuation handoffs, use the workspace skill in `.github/skills/slideforge-project-mapping/`.

The AI generation feature requires server-side `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_MODEL`, and `AI_PROVIDER_API_KEY`; see [API contract](docs/API.md) and [local development](docs/DEVELOPMENT.md).
