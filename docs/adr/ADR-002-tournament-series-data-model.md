# ADR-002: Tournament series data model

**Status**: Implemented  
**Date**: 2026-06-20

---

## Context

Groups of players often run recurring events — weekly club nights, monthly circuits, seasonal leagues. Currently each tournament is independent; there is no way to link multiple tournaments into a "series" that accumulates season-level standings. This is the highest-value missing feature.

The key design questions are:

1. **How are tournaments linked to a series?** (on the series or on the tournament)
2. **How are series points calculated?** (total, drop-worst, top-N-count)
3. **Who can create a series?** (same user who owns the tournaments)
4. **Can a series be shared publicly?** (like tournament share tokens)

---

## Decision drivers

- A tournament can only belong to one series at a time. Cross-series membership creates ambiguous leaderboards.
- Series standings must reflect only closed tournaments (same rule as individual tournament wins/podiums).
- The share/public-view pattern that exists for tournaments should be reused for series.
- No new infrastructure: stays within Next.js + Prisma + PostgreSQL.

---

## Considered options

### Option A — Series ID on Tournament (foreign key pointing up)

Add `seriesId String?` on `Tournament`. A `Series` table holds the config.

```prisma
model Series {
  id           String       @id @default(cuid())
  name         String
  pointsRule   String       // "all" | "top3" | "drop-worst"
  dropWorst    Int?
  shareToken   String?      @unique
  userId       String
  user         User         @relation(...)
  tournaments  Tournament[]
  createdAt    DateTime     @default(now())
}
```

Tournament gets `seriesId String?` + `series Series? @relation(...)`.

Series leaderboard: query `PlayerStat WHERE tournamentId IN (SELECT id FROM Tournament WHERE seriesId = ?)`, group by `playerId`, apply points rule.

Pros:
- Standard normalised relation.
- Easy to enforce "one series per tournament" (unique constraint on `Tournament.seriesId` is not needed but the FK is enough).
- Adding a tournament to a series is a single UPDATE on Tournament.

Cons:
- Series config (drop-worst count, etc.) lives in one row and affects all its tournaments — changing the rule retroactively changes the leaderboard.

---

### Option B — Join table `SeriesTournament` (explicit M:M)

```prisma
model SeriesTournament {
  seriesId     String
  tournamentId String
  addedAt      DateTime @default(now())
  @@id([seriesId, tournamentId])
}
```

Pros:
- Flexible: could allow a tournament in multiple series (rejected as a requirement above).
- Explicit ordering via `addedAt`.

Cons:
- Unnecessary complexity for a 1:1 membership rule. Adds a join table that provides no unique value over Option A.

---

### Option C — Embed tournament list as JSON on Series

Store `tournamentIds String` (JSON array) on `Series`.

Pros:
- Simplest migration.

Cons:
- Can't query "which series does tournament X belong to?" via SQL.
- No referential integrity.
- Completely inconsistent with the rest of the schema (same problem as `setsJson`, see ADR-004).

Rejected.

---

## Decision

**Option A — `seriesId` FK on `Tournament`, `Series` table holds config.**

Single-membership is a firm requirement. Option A is the clean relational model for that. The points rule is stored as an enum-like string plus an optional `dropWorst` int on `Series`, interpreted at query time.

### Schema additions

```prisma
model Series {
  id             String       @id @default(cuid())
  name           String
  description    String?
  pointsRule     String       @default("all")   // "all" | "top_n" | "drop_worst"
  topN           Int?
  dropWorst      Int?
  shareToken     String?      @unique
  userId         String
  user           User         @relation(fields: [userId], references: [id])
  tournaments    Tournament[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

// Tournament gets:
//   seriesId  String?
//   series    Series? @relation(fields: [seriesId], references: [id])
```

### Points rules

- `"all"` — sum all tournament points across every tournament in the series.
- `"top_n"` — sum only the player's best N tournament points (requires `topN` to be set).
- `"drop_worst"` — sum all, then subtract the lowest N scores (requires `dropWorst` to be set).

Rules are applied at read time over `PlayerStat` rows (from ADR-001). No separate "series points" column is stored — it is always computed.

### API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/series` | GET | List user's series |
| `/api/series` | POST | Create series |
| `/api/series/[id]` | GET | Series detail + standings |
| `/api/series/[id]` | PATCH | Edit name / rule |
| `/api/series/[id]` | DELETE | Delete (does not delete tournaments) |
| `/api/series/[id]/tournaments` | POST | Add tournament to series |
| `/api/series/[id]/tournaments/[tid]` | DELETE | Remove tournament from series |
| `/api/series/share/[token]` | GET | Public read-only series view |

### UI

- Series list on home page alongside individual tournaments.
- Series detail page: tournament list with dates, series leaderboard table.
- Public share page at `/s/[token]` (mirrors `/t/[token]` for tournaments).
- Tournament card shows badge "Part of [Series name]" if it belongs to a series.

---

## Consequences

### Positive
- Series standings always reflect current closed-tournament data via `PlayerStat` — no extra denormalization needed.
- Share token approach is identical to tournaments — reuses existing read-only pattern.
- Removing a tournament from a series is a single NULL update on `Tournament.seriesId` — standings auto-correct.

### Negative / risks
- Changing `pointsRule` on an existing series with closed tournaments changes historical standings retroactively. Users must understand that rule changes affect past data — consider showing a warning in the UI.
- Series standings require ADR-001 to be implemented first (or fall back to on-demand computation temporarily with known performance cost).
- If a tournament is deleted, `seriesId` FK constraint will block the delete unless `onDelete: SetNull` is set — must be intentional.

---

## Links

- Depends on: ADR-001 (PlayerStat snapshot) for efficient standings query.
- Related: ADR-005 (player identity) — series leaderboard aggregates across players; deduplication issues compound here.
