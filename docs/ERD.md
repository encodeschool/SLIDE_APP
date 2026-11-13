# Data model

UUIDs are primary keys, timestamps are `TIMESTAMPTZ`, and monetary values are integer tiyin plus ISO currency. Deck and learning-artifact versions hold immutable canonical JSON documents in JSONB. See the Flyway migrations for exact constraints and indexes.

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ AUTH_ACTION_TOKENS : receives
    USERS ||--o{ PRESENTATIONS : owns
    PRESENTATIONS ||--o{ PRESENTATION_VERSIONS : versions
    USERS ||--o{ LEARNING_ARTIFACTS : owns
    LEARNING_ARTIFACTS ||--o{ LEARNING_ARTIFACT_VERSIONS : versions
    USERS ||--o{ GENERATION_JOBS : requests
    USERS ||--o{ LISTINGS : sells
    LISTINGS ||--o{ LISTING_VERSIONS : snapshots
    USERS ||--o{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    LISTING_VERSIONS ||--o{ ORDER_ITEMS : purchased_as
    ORDERS ||--o{ PAYMENT_EVENTS : receives
    USERS ||--o{ ENTITLEMENTS : receives
    LISTING_VERSIONS ||--o{ ENTITLEMENTS : unlocks
    ORDERS ||--o{ ENTITLEMENTS : grants

    USERS {
      uuid id PK
      string email UK
      string password_hash
      string status
      timestamptz created_at
    }
    USER_ROLES {
      uuid user_id PK,FK
      string role PK
    }
    REFRESH_TOKENS {
      uuid id PK
      uuid user_id FK
      string token_hash UK
      timestamptz expires_at
      timestamptz revoked_at
    }
    AUTH_ACTION_TOKENS {
      uuid id PK
      uuid user_id FK
      string purpose
      string token_hash UK
      timestamptz expires_at
      timestamptz consumed_at
    }
    PRESENTATIONS {
      uuid id PK
      uuid owner_id FK
      string title
      int current_version
    }
    PRESENTATION_VERSIONS {
      uuid presentation_id PK,FK
      int version PK
      json document
      int schema_version
    }
    LEARNING_ARTIFACTS {
      uuid id PK
      uuid owner_id FK
      string artifact_type
      string title
      string language
      int current_version
    }
    LEARNING_ARTIFACT_VERSIONS {
      uuid artifact_id PK,FK
      int version PK
      json document
      timestamptz created_at
    }
    GENERATION_JOBS {
      uuid id PK
      uuid owner_id FK
      string status
      json result_document
      timestamptz created_at
    }
    LISTINGS {
      uuid id PK
      uuid seller_id FK
      string status
    }
    LISTING_VERSIONS {
      uuid id PK
      uuid listing_id FK
      bigint price_tiyin
      string file_sha256
    }
    ORDERS {
      uuid id PK
      uuid buyer_id FK
      string status
      bigint total_tiyin
      string idempotency_key
    }
    ORDER_ITEMS {
      uuid id PK
      uuid order_id FK
      uuid listing_version_id FK
      bigint price_tiyin
    }
    PAYMENT_EVENTS {
      uuid id PK
      uuid order_id FK
      string provider_event_id UK
      json payload
    }
    ENTITLEMENTS {
      uuid id PK
      uuid user_id FK
      uuid listing_version_id FK
      uuid order_id FK
      timestamptz revoked_at
    }
```

Flyway migrations create users/roles/sessions/presentations, learning artifacts and immutable artifact versions (V13), work-credit wallets and their top-up/debit ledger (V14), hashed verification and password-recovery tokens, persisted presentation generation jobs, marketplace listing snapshots, idempotent orders, payment events, and entitlements. V8 conditionally bootstraps the first administrator from operator-provided email and BCrypt hash. Wallet top-ups are sandbox-only; real provider callbacks, uploaded assets, moderation, reviews, notifications, and immutable admin audit events remain future work.