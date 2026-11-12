# API contract

All business routes use `/api/v1`. Auth, owner-scoped presentation CRUD, PPTX/PDF export jobs, persisted AI generation jobs, admin user management, and provider-independent marketplace API foundations are implemented.

## Implemented

`GET /api/v1/status` (public)

```json
{
  "application": "slideforge-api",
  "status": "available"
}
```

`GET /actuator/health` (public liveness/readiness information). OpenAPI JSON is at `/v3/api-docs`; Swagger UI is at `/swagger-ui.html`.

## Authentication

`POST /api/v1/auth/register` (public) accepts `{ "email": "person@example.com", "password": "at-least-12-characters", "displayName": "Person", "locale": "en" }`. It creates an unverified account, sends a verification email when SMTP is enabled, and returns `201` with a generic action message (no session is issued before verification). `POST /api/v1/auth/verify/request` accepts an email and always returns the same generic response. `POST /api/v1/auth/verify` accepts `{ "token": "..." }`; tokens are single-use, expire, and are stored only as hashes.

Administrator registration is invitation-only. An authenticated administrator can `POST /api/v1/admin/users/invitations` with `{ "email": "admin@example.com", "displayName": "Admin Name", "locale": "en" }`. The service sends a single-use invitation link to the configured admin app origin. If that email is missing, `POST /api/v1/auth/admin-invitation/request` with `{ "email": "admin@example.com" }` resends a fresh link for an existing pending invitation and always returns the same generic response for eligible and unknown addresses. The invitee follows the emailed link and sets their own password via `POST /api/v1/auth/admin-invitation/complete` with `{ "token": "...", "newPassword": "at-least-12-characters" }`; no token needs to be copied into the app. Links expire with the email-verification token TTL. Public registration never accepts or assigns a role.

Login and refresh are available only to active, verified users. Login returns a short-lived access token and profile and sets an HttpOnly `slideforge_refresh` cookie. Refresh rotates the refresh cookie and returns a new access token; logout revokes the cookie token and clears it.

`GET /api/v1/users/me` requires `Authorization: Bearer <accessToken>`.

`PUT /api/v1/users/me` requires the same bearer token and accepts `{ "displayName": "Person", "locale": "en" }`. Display name must be non-blank and at most 120 characters; locale must be `en`, `ru`, or `uz`. It returns the updated profile. Email, verification status, and roles cannot be changed through this endpoint.

`POST /api/v1/auth/password/forgot` accepts an email and returns a generic response whether or not an eligible account exists. `POST /api/v1/auth/password/reset` accepts `{ "token": "...", "newPassword": "at-least-12-characters" }`; successful reset consumes the single-use token and revokes refresh sessions. Verification and recovery links require configured SMTP for delivery; see [local development](DEVELOPMENT.md).

## Presentations

All presentation endpoints require a bearer access token. IDs are UUIDs and every read/write is scoped to the authenticated owner.

`POST /api/v1/presentations` accepts `{ "title": "Quarterly plan", "language": "en", "document": { ...canonical deck schema v1... } }`. The server assigns the canonical document ID and stores version 1. It returns `201` and a `Location` header.

`GET /api/v1/presentations?page=0&size=20` returns `{ "items": [], "page": 0, "size": 20, "total": 0 }`.

`GET /api/v1/presentations/{id}` returns the current document. `GET /api/v1/presentations/{id}/versions/{version}` reads an immutable earlier version.

`PUT /api/v1/presentations/{id}` accepts `{ "expectedVersion": 1, "document": { ... } }`. A successful save creates a new immutable version; a stale version returns `409 VERSION_CONFLICT`. `DELETE /api/v1/presentations/{id}` archives the presentation and returns `204`.

`POST /api/v1/presentations/{id}/exports` accepts `{ "format": "pptx", "version": 2 }`; `version` is optional and defaults to the current version. It returns `202` with a queued export job and a `Location` header. Formats are `pptx` and `pdf`.

`GET /api/v1/exports/{jobId}` returns the owner-scoped job status (`QUEUED`, `RUNNING`, `SUCCEEDED`, or `FAILED`). A succeeded job includes `downloadUrl`. `GET /api/v1/exports/{jobId}/file` downloads the artifact and requires the same bearer token. Exports use an immutable presentation version; files are stored on the configured API export volume.

## Learning artifacts

Slides continue to use `/presentations` and the canonical deck model. The authenticated `/api/v1/artifacts` routes store non-slide content as a separate versioned artifact model. Supported `type` values are `essay`, `independent-work`, `coursework`, `dissertation`, `research-article`, `quiz`, `crossword`, `thesis-abstract`, `glossary`, and `argumentative-essay`.

`POST /api/v1/artifacts/draft` accepts `{ "type": "quiz", "prompt": "A water cycle quiz for grade 6", "language": "en", "itemCount": 8 }` and returns `{ "document": { ...artifact schema v1... } }`. `itemCount` is optional (defaults to 5) and must be between 1 and 20; it requests the number of questions for quizzes, crossword entries for crosswords, terms for glossaries, or sections for other formats. It uses the server-configured AI provider and type-specific JSON instructions; AI drafts are validated and are not saved until the user chooses to save. Provider configuration is the same server-only configuration as deck generation. This route runs synchronously and currently does not create a pollable generation job.

An artifact document has `schemaVersion: 1`, `id`, `type`, `title`, `language`, and editable `sections: [{id,heading,body}]`. Quizzes additionally contain `questions: [{id,question,options,answerIndex,explanation?}]`; crosswords contain `crossword: {rows,columns,entries:[{id,clue,answer,row,column,direction}]}` with zero-based grid coordinates and `across`/`down` direction. Quiz answers must refer to an existing option. Crossword entries must fit the declared grid and crossing letters must agree. Non-quiz documents cannot include quiz data, and non-crossword documents cannot include a crossword grid.

`POST /api/v1/artifacts` accepts `{ "type": "essay", "title": "Field notes", "language": "en", "document": { ... } }` and stores version 1. `GET /api/v1/artifacts?page=0&size=20` lists only the authenticated owner's artifacts. `GET /api/v1/artifacts/{id}` reads the current version; `?version=N` reads an immutable earlier version and returns both `currentVersion` and the selected `version`. `PUT /api/v1/artifacts/{id}` accepts `{ "expectedVersion": 1, "document": { ... } }`; successful saves append an immutable version and stale writes return `409 VERSION_CONFLICT`. `DELETE /api/v1/artifacts/{id}` deletes the owner-scoped artifact and its versions.

`GET /api/v1/artifacts/{id}/exports/docx?version=N` downloads an editable Word document; `GET /api/v1/artifacts/{id}/exports/pdf?version=N` downloads a printable PDF. Version is optional and defaults to current. These endpoints are authenticated and owner-scoped, invoke the private renderer synchronously, and do not yet create export-job records. Quiz PDF output contains questions and an answer key; crossword output contains a blank grid, clues, and answer key.

## AI generation

`POST /api/v1/generations` requires a bearer token and accepts a prompt (up to 4,000 characters), language, and requested slide count (1–20). It returns `202` with a persisted job and `Location` header. Poll `GET /api/v1/generations/{jobId}`; the response is owner-scoped and includes the validated canonical document on success or a safe failure code/message. The web client can save the generated document as an owned presentation and open it in the editor.

The server calls an OpenAI-compatible chat-completions provider. Configure `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_MODEL`, and `AI_PROVIDER_API_KEY`; credentials stay server-side. The provider must support bearer authentication, `response_format: json_object`, and the request's `max_tokens`, and return JSON in `choices[0].message.content`. Jobs are persisted in PostgreSQL and claimed by an API-process worker. Provider failures, timeouts, missing configuration, invalid documents, and output limits fail explicitly; no placeholder deck is generated. This integration has mock-provider coverage but has not been validated against a live provider account.

## Marketplace and admin routes

| Group | Purpose | Status |
|---|---|---|
| `/api/v1/seller/listings` | List and create/update/publish/archive owner-scoped listing snapshots | Implemented; authenticated |
| `/api/v1/catalog` | Paginated published listing catalog, category filter, seller display name, listing detail and category preferences | Implemented; clients load 10 at a time |
| `/api/v1/admin/marketplace/categories` | Create/list marketplace categories with English, Russian, and Uzbek names; activate/deactivate categories | Implemented; requires SUPERADMIN |
| `/api/v1/orders` | Create idempotent buyer orders for published listings | Implemented; authenticated |
| `/api/v1/orders/{orderId}/sandbox-confirm` | Developer sandbox confirmation and entitlement grant | Disabled by default; only enabled with the sandbox profile and explicit configuration |
| `/api/v1/admin/users` | Admin-only user search/status controls | Implemented; requires ADMIN role |
| `/api/v1/admin/users/invitations` | Invite an administrator to register and set their own password | Implemented; requires ADMIN role and configured SMTP |
| `/api/v1/admin/marketplace/listings` | Monitor listings and suspend/restore catalog visibility | Implemented; requires ADMIN role |

The web and mobile clients allow public catalog browsing, listing details, and cart use before sign-in; sign-in is required to create orders or publish a listing. They provide cart and sandbox-gated checkout. Admins can inspect listings and suspend or restore catalog visibility; only SUPERADMIN can manage category definitions. A buyer library/purchase entitlement UI is not yet implemented. No production payment provider is integrated. Obtain current merchant specifications and credentials before implementing real Payme, Click, or Uzum processing; see [payment notes](PAYMENTS.md).

`GET /api/v1/catalog/categories` returns active category `{slug,name,nameRu,nameUz}` entries. `GET /api/v1/catalog?page=0&size=10&category=education` returns only published snapshots, with seller display names; page size is bounded to 50. `GET /api/v1/catalog/{listingId}` returns public listing metadata, seller, price, category, and license terms (not the deck document). Any signed-in account may read/update its own `GET/PUT /api/v1/catalog/preferences` using `{ "preferredCategory": "education" }` or `null`. Seller listing `POST` accepts an optional category slug; any verified ordinary account may publish its own listing. No client-supplied role is accepted.

The SUPERADMIN-only category manager uses `POST /api/v1/admin/marketplace/categories` with `{ "slug": "science", "nameEn": "Science", "nameRu": "Наука", "nameUz": "Ilm-fan" }` and `PATCH /api/v1/admin/marketplace/categories/{slug}/status` with `{ "active": false }`. A category with published listings cannot be deactivated.

The web and mobile storefronts create orders using the server-side listing price and call the existing `/api/v1/orders/{orderId}/sandbox-confirm` only as a developer sandbox flow. That endpoint remains disabled unless the sandbox profile and explicit enablement are both configured. A disabled sandbox leaves the order pending; it does not simulate a payment or grant entitlement. There are no real payment-provider integrations.

Errors use RFC 9457 Problem Details with a stable `code` property. Order creation is idempotent per buyer-supplied key; generation job submission does not currently have an idempotency key.

Registration, login, and refresh are limited by peer IP to 10 POST requests per 60-second fixed window by default. Configure `AUTH_RATE_LIMIT_MAX_REQUESTS` and `AUTH_RATE_LIMIT_WINDOW_SECONDS` to change the limit. A rejected request returns `429` with code `RATE_LIMITED` and a `Retry-After` header. The limiter is in-memory per API instance; deployments with multiple instances do not share counters, and proxy deployments need an explicitly trusted client-IP strategy before relying on per-client limits.