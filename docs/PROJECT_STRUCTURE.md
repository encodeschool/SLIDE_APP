# Project structure

Slideforge uses feature-oriented vertical slices: UI, client API/repository, and domain behavior for a capability live together. Cross-cutting runtime configuration, shared deck types, and infrastructure stay in dedicated shared areas. Keep modules small and move code only when ownership is clear; avoid a generic `utils/` or `common/` dumping ground.

## Application boundaries

```text
apps/
  web/                 React + Vite browser workspace
    src/
      app/             App composition, top-level layout and route state
      features/
        auth/          Sign-in, registration, verification and recovery
        presentations/ Library and deck editing
        generation/    AI generation UI and job state
      shared/          API transport and reusable UI/types
  admin/               Separate React + Vite staff application
    src/
      app/             Admin app shell and translations
      features/
        auth/          Staff session and sign-in
        users/          Role-protected user management
      shared/          API transport shared within the admin app
  mobile/              Separate Flutter application
    lib/
      main.dart        Theme and application composition
      auth/            Auth models, API/session repository, auth gate/form
      presentations/   Presentation repository, library and editor

backend/
  api/
    src/main/java/com/slideforge/api/
      auth/            Registration, login, verification, recovery and sessions
      users/           Account/profile and roles
      presentations/   Canonical decks, owner-scoped versions and validation
      exports/         Persisted export jobs and renderer integration
      generations/     Persisted AI generation jobs and provider adapter
      marketplace/     Listings, orders, catalog and sandbox payments
      admin/            Staff-only operations
      common/            Cross-cutting HTTP/security/error behavior
      tools/             Explicit developer-only command-line utilities
    src/main/resources/
      db/migration/     Append-only Flyway schema/data migrations
      application.yml   Environment-backed runtime defaults

packages/shared-types/  Canonical TypeScript deck model and editor operations
services/
  presentation-renderer/ Private PPTX/PDF rendering service
infra/deployment/        Production-only Compose, Caddy and deploy helpers
.github/workflows/       CI and protected production deployment pipelines
docs/                    Architecture, API, operations and handoff material
```

The web/admin source folders are organized by feature, and the backend is already organized as a Spring modular monolith by business capability. Flutter separates authentication from presentations; the signed-in workspace/library belongs with presentations rather than in the auth module.

## Dependency direction

- `app/` composes feature modules; feature modules do not import application entry points.
- A feature owns its API calls/state/UI. Cross-feature operations are passed through typed interfaces or shared transport helpers, not by importing another feature's internals.
- Each client uses its own API client; no client code imports backend implementation details.
- Backend feature packages may depend on shared platform/security primitives but should not depend on other features' persistence internals. Keep HTTP controllers thin and put business rules in feature services.
- Database schema changes are additive, versioned Flyway migrations. Never edit a migration that has already run in an environment.
- `packages/shared-types` is the canonical shared deck contract; keep renderer and API validation aligned with that contract.
- Secrets are runtime configuration or GitHub/VDS secrets, never committed defaults.

For diagrams and the current implementation state, see [project map](PROJECT_MAP.md) and [continuation notes](CONTINUATION.md).
