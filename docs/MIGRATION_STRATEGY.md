# Migration Strategy

1. Use `prisma migrate dev --name <change-name>` only in local development.
2. Commit generated migration files with the matching Prisma schema change.
3. In staging and production, run `prisma migrate deploy` from CI/CD before the app starts.
4. Never edit an already-applied production migration. Add a new forward-only migration.
5. For large tables, prefer phased migrations: add nullable column, backfill in batches, then enforce `NOT NULL`.
6. Back up the production database before destructive schema changes.
7. Use database-level unique constraints for letter numbers and category monthly sequences.
