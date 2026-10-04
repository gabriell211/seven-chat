# Seven Chat — Architecture

## Runtime boundaries

- **Next.js/Vercel:** web, SSR, stateless API/BFF and webhooks.
- **PostgreSQL/Neon:** users, social graph, persisted chat, moderation and financial ledger.
- **Private object storage:** uploads and signed delivery.
- **Persistent realtime gateway:** presence, typing, room/live events and fan-out.
- **RTC/SFU:** voice, video and live media. Media never crosses the main HTTP API.

## Security invariants

1. Authorization is enforced server-side per resource.
2. Private media never uses a public bucket.
3. Purchased-value mutations are double-entry ledger transactions.
4. Financial operations require idempotency keys.
5. Block rules override discovery, messaging, calling and invitations.
6. Age is derived from birth date rather than client-supplied age.
7. Session cookies are HttpOnly and Secure in production.
8. Upload MIME must be validated from content before publishing.

## Financial invariant

For every posted ledger transaction:

```
total debits == total credits
```

Gift pricing is loaded under the database transaction. The client sends a gift ID and quantity, never a trusted price.
