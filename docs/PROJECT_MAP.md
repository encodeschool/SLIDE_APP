# Project map

This is a fast orientation map, not a replacement for the implementation or detailed docs. Last reviewed: 2026-11-09.

## System overview

```mermaid
flowchart LR
    User[User]
    Web[React web client<br/>apps/web]
    Admin[React admin client<br/>apps/admin]
    Mobile[Flutter client<br/>apps/mobile]
    Shared[Canonical deck model + editor operations<br/>packages/shared-types]
    API[Spring Boot API<br/>backend/api]
    AuthLimit[In-memory auth rate limiter<br/>per API instance]
    DB[(PostgreSQL<br/>Flyway migrations)]
    Worker[Persisted export worker<br/>backend/api]
    Renderer[Private PPTX/PDF renderer<br/>services/presentation-renderer]
    Files[(Persistent export volume)]
    GenerationWorker[Persisted generation worker<br/>backend/api]
    AIProvider[OpenAI-compatible AI provider<br/>optional, server-side config]
    Mail[Configured SMTP service<br/>verification and recovery]
    Queue[(RabbitMQ<br/>reserved for other future jobs)]
    Storage[(RustFS / S3 API<br/>reserved for future marketplace assets)]

    User --> Web
    User --> Admin
    User --> Mobile
    Web --> Shared
    Web -->|REST /api/v1| API
    Admin -->|role-protected REST /api/v1/admin| API
    Mobile -->|REST /api/v1| API
    API --> DB
    API -->|verification and recovery messages| Mail
    API -->|register/login/refresh| AuthLimit
    API -->|claim queued export| Worker
    Web -->|authenticated prompt + job polling| API
    API -->|persist generation job| DB
    API -->|claim queued generation| GenerationWorker
    GenerationWorker -->|server-side API request| AIProvider
    AIProvider -->|JSON deck candidate| GenerationWorker
    GenerationWorker -->|validate + persist result| DB
    Worker -->|private HTTP| Renderer
    Renderer -->|PPTX/PDF artifact| Files
    API -->|owner-authorized download| User
    API -. future queued workflows .-> Queue
    API -. future uploaded assets .-> Storage
```

Solid paths are documented as implemented; dashed paths are planned or reserved and should not be treated as working features without code verification.

## Main user flows

```mermaid
sequenceDiagram
    actor User
    participant Web as Web client
    participant API as Spring Boot API
    participant DB as PostgreSQL
    participant Renderer as Private renderer
    participant AI as Configured AI provider

    User->>Web: Register or sign in
    Web->>API: Auth and session requests
    API->>DB: Store user and refresh-token state
    Web->>API: Create/read/save owned presentation
    API->>DB: Validate ownership and persist immutable version
    User->>Web: Request PPTX/PDF export
    Web->>API: Create export job for saved version
    API->>DB: Persist job
    API->>Renderer: Render canonical deck JSON
    Renderer-->>API: Artifact result
    API->>DB: Persist job status
    User->>Web: Poll job and download
    Web->>API: Owner-authorized job/download request
    API-->>Web: Job status or artifact
    User->>Web: Submit generation prompt
    Web->>API: Create authenticated generation job
    API->>DB: Persist bounded job
    API->>AI: Generate canonical deck candidate
    AI-->>API: JSON candidate
    API->>API: Validate/normalize and enforce limits
    API->>DB: Persist result/failure
    Web->>API: Poll owner-scoped job
    Web->>API: Save successful deck as presentation
```

## Where to look

| Area | Location | Responsibility |
|---|---|---|
| Web app | `apps/web/` | Authenticated presentation library, editor, save/export UI |
| Admin app | `apps/admin/` | Staff sign-in and role-protected user management |
| Mobile app | `apps/mobile/` | Flutter auth, library, create/open, multi-slide text/title editing, versioned saves and conflict reload |
| API | `backend/api/` | Auth, email actions, presentations, exports, generation, admin, marketplace |
| Auth rate limit | `backend/api/src/main/java/com/slideforge/api/common/AuthRateLimitFilter.java` | Per-instance fixed-window limits for register/login/refresh |
| Shared deck model | `packages/shared-types/` | Versioned deck types, operations, undo/redo |
| Renderer | `services/presentation-renderer/` | Editable PPTX generation and PDF conversion |
| Infrastructure | `docker-compose.yml`, `infra/` | Local development services and deployment configuration |
| Roadmap / active status | `docs/ROADMAP.md`, `docs/CONTINUATION.md` | Phase status and next concrete work |
| API details | `docs/API.md` | HTTP contract |
| Data model | `docs/ERD.md` | Persisted entities and relationships |
| Local run/test steps | `docs/DEVELOPMENT.md` | Prerequisites, startup, validation commands |
| Production rollout | `docs/DEPLOYMENT.md` | VDS, GitHub secrets, deployment, smoke checks, backups |

For detailed security boundaries and design rationale, see `docs/SECURITY.md` and `docs/DECISIONS.md`.

## Phase orientation

The project has authentication, core presentation persistence, a web editor/export flow, validated AI generation jobs, admin user management, provider-independent marketplace/sandbox foundations, and a basic Flutter library/editor slice. See `docs/CONTINUATION.md` for the latest verified checkpoint and exact next work. Real payment adapters remain contract-gated, and a live VDS deployment remains unverified. The `docs/ROADMAP.md` table is authoritative for broader phase status.
