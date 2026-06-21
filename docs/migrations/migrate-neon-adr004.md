# Migration guide — ADR-004 (MatchSet table + teamsJson IDs)

This migration adds the `MatchSet` table and changes `teamsJson` to store player IDs
instead of player names. Run these steps against your Neon database before deploying
the new code.

---

## Prerequisites

Your Neon connection string. Find it in the Neon dashboard under
**Project → Connection Details → Connection string** — it looks like:

```
postgresql://user:password@ep-xxx-yyy.us-east-2.aws.neon.tech/dbname?sslmode=require
```

---

## Step 1 — Apply the schema migration

From the project root:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

`migrate deploy` applies all pending migrations from `prisma/migrations/` without
interactive prompts. Safe to run against production — it only runs migrations that
haven't been applied yet.

Expected output:

```
Applying migration `20260621202404_add_match_sets`
1 migration applied.
```

---

## Step 2 — Backfill MatchSet rows from existing setsJson data

```bash
DATABASE_URL="postgresql://..." node scripts/backfill-match-sets.mjs
```

Reads every `MatchScore` that has a non-null `setsJson`, parses it, and writes
the corresponding `MatchSet` rows. The script is idempotent (uses upsert) — safe
to run multiple times.

---

## Step 3 — Migrate teamsJson from player names to player IDs

```bash
DATABASE_URL="postgresql://..." node scripts/backfill-teams-json.mjs
```

Updates every Classic tournament's `teamsJson` from name-pairs to ID-pairs.
Skips rows that already look like IDs. Also idempotent.

---

## Step 4 — Deploy the application

Once all three steps succeed, deploy the new build. The application reads
`MatchSet` rows preferentially over `setsJson`, and resolves team IDs to names
at runtime using `tournament.players`.

---

## Rollback

The `setsJson` and `teamsJson` columns are **not dropped** in this migration —
they remain on the table. If you need to roll back the code to the previous
version, the old code paths using `setsJson` and name-based `teamsJson` will
continue to work against the migrated database without any changes.

To roll back the schema itself (remove the `MatchSet` table):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate resolve --rolled-back 20260621202404_add_match_sets
```

Then drop the table manually in Neon's SQL editor:

```sql
DROP TABLE IF EXISTS "MatchSet";
```

---

## Verify

After deployment, open a Classic tournament, enter a score, and confirm the
result saves correctly. In Neon's SQL editor you can confirm rows exist:

```sql
SELECT COUNT(*) FROM "MatchSet";
```
