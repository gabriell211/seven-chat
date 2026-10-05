# Seven Chat disaster recovery

## Scope
PostgreSQL is the system of record for accounts, moderation and the Diamond ledger. Private media is stored separately and must use provider versioning/lifecycle where available.

## Backup
Run `scripts/backup-db.sh` with a least-privilege `BACKUP_DATABASE_URL`. Store the resulting custom-format dump and SHA-256 outside the database provider. Never commit dumps.

## Restore drill
Provision an empty PostgreSQL instance with the same major version, set `RESTORE_DATABASE_URL`, run `scripts/restore-db.sh <dump>`, then run migrations and application smoke tests. Record start/end time, backup timestamp, RPO and RTO.

## Incident
1. Freeze destructive jobs and purchases if ledger integrity is uncertain.
2. Preserve logs and identify the last known-good transaction.
3. Restore to isolated infrastructure first.
4. Reconcile ledger debits/credits before reopening purchases.
5. Rotate affected credentials.
6. Redirect traffic only after auth, chat, media and financial smoke tests pass.
7. Communicate status and write a post-mortem.

## Targets
Free staging uses logical dumps and does not claim PITR. Production target: financial RPO <=5m, social RPO <=15m, critical RTO <=60m; these targets require infrastructure capable of meeting them.
