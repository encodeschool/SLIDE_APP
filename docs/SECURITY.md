# Security status

## Current checkpoint

Implemented controls include email verification and password recovery, BCrypt password hashing, signed HS256 access JWTs, hashed opaque refresh tokens with single-use rotation, HttpOnly/SameSite=Strict refresh cookies, bearer-protected profile and presentation APIs, owner and admin authorization, and configurable in-memory rate limits for authentication actions. Web access tokens remain in memory; Flutter credentials use platform secure storage. The production Compose topology places the API behind Caddy on a private network; Caddy sets `X-Forwarded-For` to its immediate client address and Spring's forwarded-header strategy is enabled so the per-instance auth rate limiter distinguishes clients. Do not enable untrusted forwarding headers on direct API ingress. The limiter remains process-local and is not appropriate for multiple API replicas.

The application has not had an independent security audit or live production exercise. Production Compose disables Springdoc endpoints. Real payment adapters and related webhook verification, a buyer storefront/library, asset uploads/scanning, and production mobile signing have not been activated. Only the API-first web/admin deployment can be considered for an operator-controlled staged release after the prelaunch checks below; this document does not certify security or regulatory compliance.

## Local development

- `.env.example` values are development-only. Copy them into an untracked `.env` and replace them before any shared environment.
- Local Compose publishes PostgreSQL, RabbitMQ, RustFS, and API ports on the host for developer access. Restrict them to trusted local networks.
- RustFS's `RUSTFS_UNSAFE_BYPASS_DISK_CHECK` is enabled only in local Compose because Docker named volumes reside on one host disk. Production must not use this setting.
- The status API permits configured development origins. Set an explicit origin allowlist per environment; never use wildcard origins with credentials.
- Set `JWT_SECRET` to a unique random value of at least 32 UTF-8 bytes. `REFRESH_COOKIE_SECURE` must be `true` behind HTTPS; its local default is `false` for HTTP development.
- The optional first-admin seed uses `BOOTSTRAP_ADMIN_EMAIL` plus a Spring BCrypt hash encoded as Base64 in `BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64`. The migration creates no admin when both are empty, rejects partial/invalid configuration, and never stores a plaintext password. Keep the password/hash in a secret manager and do not commit them.
- Additional administrator accounts can only be created by an authenticated administrator through a single-use, expiring email invitation. If the invited email misses the link, the admin registration form can request a resend; the resend endpoint reveals no invitation status and never creates a new administrator. The invited person sets their own password on the admin app; public registration cannot assign privileged roles. Admin invitation requires SMTP and uses `PUBLIC_ADMIN_URL` to build the invite link.
- Authentication rate limits default to 10 requests per peer IP per 60-second fixed window on registration, login, refresh, verification, and password actions. Configure `AUTH_RATE_LIMIT_MAX_REQUESTS` and `AUTH_RATE_LIMIT_WINDOW_SECONDS`. Production Caddy sets the client address explicitly; counters are local to each API process.
- AI provider credentials stay server-side; generation errors explicitly if no provider is configured. Real payment credentials remain unconfigured pending provider contracts and technical specifications.

## Before production

Before accepting real user data, configure and test SMTP and the seeded admin, validate DNS/TLS and the client-IP forwarding chain, keep infrastructure ports private, schedule encrypted off-host backups and perform restore drills, and establish monitoring and incident response. Review auth/session/authorization policy and privacy, consumer, tax, payment, copyright, and jurisdiction obligations with qualified professionals. Do not activate real payments until current provider protocols have been independently verified and tested. No legal or regulatory compliance is implied by this software.