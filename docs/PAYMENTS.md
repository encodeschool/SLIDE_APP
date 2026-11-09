# Payments plan (Uzbekistan)

## Providers requested
Click, Payme, Uzum (merchant/aggregator integrations) and card acceptance for Humo, Uzcard, Visa, Mastercard.

Important: Visa, Mastercard, Humo and Uzcard are card networks, not separate integrations.
In practice they are accepted *through* an acquirer/aggregator. Plan:

| Adapter | Role | Cards covered (to confirm with each provider's merchant contract) |
|---------|------|------------------------------------------------------------------|
| `PaymeProvider` | Merchant API (provider calls our JSON-RPC endpoint) | Uzcard, Humo, others per contract |
| `ClickProvider` | Prepare/Complete callbacks to our endpoint | Uzcard, Humo, others per contract |
| `UzumProvider`  | Uzum Bank acquiring / checkout | Visa, Mastercard, Humo, Uzcard per contract |
| `SandboxProvider` | Local development and automated tests only | n/a |

## Rules (apply to every adapter)
- The backend computes the price from the database; the client never sends an amount or "paid" flag.
- Amounts are integer tiyin (1 UZS = 100 tiyin). Check each provider's unit (Payme uses tiyin; others may use sum).
- Every provider callback is authenticated (Payme: Basic auth; Click: signed request) and stored in `payment_events`
  with a unique `(provider, provider_event_id)` so replays are no-ops.
- An entitlement is granted only when a verified event moves the order to PAID, inside one DB transaction.
- No card numbers/CVV ever touch our servers; card entry happens on the provider's hosted page.

## Before coding the real adapters (open items)
1. Sign merchant contracts and obtain sandbox credentials for each provider.
2. Re-read each provider's current official API docs; the exact request/response and signature formats must be taken from them, not from memory.
3. Confirm legal/tax requirements for selling digital goods and for seller payouts (payouts stay a manual admin workflow).

## Public documentation verification checkpoint

The official public sources checked for current implementation planning were [Payme Business](https://merchant.payme.uz/), [Payme](https://payme.uz/), [Click docs](https://docs.click.uz/), and [Uzum Bank](https://www.uzumbank.uz/). They did not expose enough verifiable protocol detail in this check to safely implement callbacks: request fields, authentication/signature algorithms, amount units, lifecycle/replay rules, and sandbox behavior remain merchant-materials-gated. Click's overview mentions `Prepare` and `Complete` for SHOP API site/app payments, but the detailed linked routes could not be verified and must not be inferred. No real-provider adapter should be enabled until current official merchant packs and credentials are received and reviewed.
