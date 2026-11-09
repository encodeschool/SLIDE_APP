# Decisions and assumptions

| # | Decision | Reason / trade-off |
|---|----------|--------------------|
| 1 | Modular monolith (Spring Boot 3.x, Java 21, Maven), one worker process later | Single maintainer; avoid microservice overhead |
| 2 | Canonical deck = versioned JSON (`schemaVersion: 1`), stored as JSONB in `presentation_versions` | Editor, AI, and exporters share one model; slides are not separate rows because they are always read/written together |
| 3 | Coordinates in px on a 1280x720 canvas (96 px = 1 inch) | Simple for editor; converts exactly to PPTX inches |
| 4 | **Export: Node `pptxgenjs` (PPTX) + LibreOffice headless (PDF)**, in `services/presentation-renderer` | See PoC below. Alternative (Apache POI) gives finer control but far more code for charts/shapes |
| 5 | RabbitMQ for AI/export jobs; RustFS locally for S3-compatible object storage | Durable queues survive restarts; RustFS 1.0.1 is public and pullable where the MinIO Community images are not |
| 6 | Access token in memory, refresh token in HttpOnly cookie | Brief forbids bearer tokens in localStorage |
| 7 | Payments: Payme, Click, Uzum adapters behind one interface; card networks (Humo, Uzcard, Visa, Mastercard) are accepted through them | See docs/PAYMENTS.md |
| 8 | Money stored as integer minor units + currency code | No floating point |
| 9 | Brand name: Slideforge; web/admin icons use Lucide, mobile uses Material Icons | Consistent, recognizable iconography without custom inline drawings |
| 10 | Phase 1 uses Spring Boot 3.4.5 on Java 21 and Springdoc 2.8.6 | Compatible API dependencies are kept in Maven |
| 11 | Local object storage uses RustFS 1.0.1, with a four-volume single-node layout | MinIO's current official docs no longer provide the previously assumed public Community image; RustFS has a public pinned image and S3-compatible API |
| 12 | Phase 2 refresh sessions use random opaque tokens stored as SHA-256 hashes; access JWTs are signed HS256 and held in web memory | Rotation/revocation stays server-controlled without persisting long-lived bearer tokens in browser storage |
| 13 | Flutter stores access and refresh credentials with `flutter_secure_storage`; API base URL is a build-time `API_BASE_URL` define | Avoids embedding environment secrets and uses platform secure storage for mobile sessions |

## Renderer proof of concept (done)
- Sample 2-slide deck -> PPTX -> PDF succeeded.
- PPTX checked with python-pptx: text is real text frames, zero picture shapes, speaker notes preserved.
- PDF has one page per slide; page raster inspected visually.
- Known differences: fonts fall back when not installed (Arial -> Liberation Sans in LibreOffice); charts/tables/images not yet covered by the PoC.
