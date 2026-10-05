# Implementation status

This branch rebuilds the executable Seven Chat platform while the current production deployment remains untouched.

## Implemented and CI-validated

- Next.js 16 / React 19 web application.
- Expo 57 / React Native 0.86 mobile client for Android and iOS source.
- Separate Next.js administrative application with RBAC.
- Persistent WebSocket realtime gateway with authenticated channel subscriptions and PostgreSQL LISTEN/NOTIFY fan-out.
- Durable worker for private media processing, store retries, privacy jobs and timed live-battle completion.
- PostgreSQL/Drizzle migrations validated from an empty PostgreSQL 17 database.
- Revocable per-device native sessions and HttpOnly web sessions.
- Registration age rule (13–99), versioned legal consent, disposable-email rejection, e-mail verification, password reset, password/e-mail change with session revocation, temporary deactivation/reactivation and TOTP 2FA.
- Feed, posts, comments, reactions, saved posts, search, follow/block and notifications.
- Direct/group conversations, persisted messages, typing/realtime refresh, media messages, VIP video gating and server-controlled view-once.
- Private S3-compatible upload authorization, magic-byte inspection, malware gate, metadata stripping, image normalization, video/audio transcode and signed reads.
- Stories with 24-hour expiry and reels backed by processed private assets.
- Voice rooms with VIP gating, password/invite modes, hand raising, stage roles, moderation and bans.
- Live sessions, up to four guests, live comments, moderators/bans, gifts and timed gift-scored battles.
- LiveKit token issuance for rooms/lives/calls.
- Double-entry Diamond ledger, idempotent gifts, Mega Fan, rewarded-ad claims and authoritative wallet balance.
- Apple App Store and Google Play server-side purchase verification, purchase intents, VIP gifting and durable Google consume/acknowledge retries.
- Account data export, deletion scheduling/cancellation and privacy worker.
- Admin moderation hierarchy and executable warn/restrict/suspend/ban/remove-content actions.
- Production rate-limit fail-closed behavior for auth/write/financial/report policies.
- Security headers, validation tests and multi-application CI.

## External infrastructure gates still open

The branch must not be called **1.0 production-ready** until these environment-dependent gates are proven:

- Staging database is now isolated on Supabase Free in sa-east-1. Private object storage, Redis/rate-limit, LiveKit/TURN, realtime and worker deployments still need isolated staging instances.
- Real Apple/Google sandbox purchase fixtures and refund/revocation webhook exercises.
- Real AdMob server-side verification fixture.
- Native Android/iOS signed builds, device smoke tests, background/push notification validation and store compliance checks. Mobile metadata is prepared as 1.0.0; signed artifacts still require the platform signing/build environment.
- E2E browser/device suites against staging, plus concurrency/load tests for chat, gifts, rooms and live battles.
- Free-tier disaster recovery now has executable logical backup/restore scripts and a runbook; a real off-site backup/restore drill still requires BACKUP_DATABASE_URL/RESTORE_DATABASE_URL and measured RPO/RTO. Supabase PITR is a paid add-on and is not claimed by the free architecture.
- Production observability/alert routing with SLO dashboards.
- Final accessibility audit, privacy/legal review and operational runbooks.

## Staging infrastructure status

- Railway was removed from the critical path because its connected trial is expired and requires a paid plan.
- A dedicated `Seven Chat Staging` Supabase project was created at $0/month in `sa-east-1`, separate from production and other projects.
- Drizzle migrations `0000` and `0001` were applied successfully to PostgreSQL 17.
- Supabase Security Advisor initially found all 54 public tables exposed without RLS. Staging was hardened so all 54 now have RLS enabled with no public policies; the backend remains the authority through direct PostgreSQL connections.
- The repository includes `0002_secure_supabase.sql` so this protection and FK-index hardening are reproducible from source.
- Supabase Free does not provide managed daily backups or PITR; production on a free architecture therefore requires scheduled logical off-site backups and periodic restore drills.

No production database, deployment or paid infrastructure was modified while building this branch.

## Security completion notes

- TOTP enrollment and login enforcement are implemented server-side; mobile login handles the second factor challenge.
- WebAuthn credential storage is migrated and RLS-protected, but passkey ceremony endpoints remain an external-browser/security integration gate and are not falsely marked complete.
- Staging schema currently has 56/56 public tables protected by RLS.
