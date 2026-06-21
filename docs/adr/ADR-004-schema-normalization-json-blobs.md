# ADR-004: Schema normalization — setsJson and teamsJson

**Status**: Implemented  
**Date**: 2026-06-20

---

## Context

Two columns store structured data as serialised JSON strings rather than as relational rows:

- **`MatchScore.setsJson`** (`String?`) — stores an array of `[homeGames, awayGames, homeTb?, awayTb?]` tuples representing per-set scores. Used only in Classic format.
- **`Tournament.teamsJson`** (`String?`) — stores an array of `[player1Name, player2Name]` pairs representing the fixed teams for a Classic tournament.

This was likely an expedient early choice to avoid a migration. The immediate consequence is:

1. **No SQL-level querying** — cannot filter matches by set score, find matches that went to a tiebreak, or count set wins per player without pulling all rows into JS.
2. **No referential integrity** — `teamsJson` stores player names (strings) not `Player` IDs, so renaming a player silently breaks the join, and player deletion leaves ghost names.
3. **Blocked features** — Elo computation (ADR-006) needs set-level outcomes. Series stats (ADR-002) would benefit from set-level data for Classic format tiebreakers. These are hard to add cleanly on top of JSON blobs.

---

## Decision drivers

- Any migration must be non-breaking: existing tournaments with Classic format data must continue to work during and after the migration.
- `teamsJson` stores names, not IDs. The normalization must resolve this without corrupting existing data.
- The current `classic.ts` library functions (`parseSets`, `setsWon`, etc.) must continue to work during the transition — the library is not being replaced, just the storage layer.
- Schema changes should be additive then destructive, not in-place (to allow a safe rollback window).

---

## Considered options

### Option A — Keep JSON blobs as-is

No change.

Pros:
- No migration risk.
- Schema stays simple.

Cons:
- Elo computation remains hard.
- Player name drift in `teamsJson` is a silent data quality bug that compounds over time.
- Date-range and set-level filtering are impossible via SQL.

Rejected as a long-term choice. Acceptable only as "defer until Elo is prioritized."

---

### Option B — Normalize `setsJson` into a `MatchSet` table; keep `teamsJson` but store player IDs

Two separate changes:

**`MatchSet` table:**

```prisma
model MatchSet {
  id          String    @id @default(cuid())
  matchId     String
  match       MatchScore @relation(fields: [matchId], references: [id], onDelete: Cascade)
  setIndex    Int        // 0, 1, 2 …
  homeGames   Int
  awayGames   Int
  homeTb      Int?
  awayTb      Int?
}
```

**`teamsJson` fix:** Change storage from player names to player IDs. Keep the column as JSON (`String?`) since Classic teams are an ordered pair and the relation is already expressed via the existing `homeTeam`/`awayTeam` many-to-many on `MatchScore`. `teamsJson` would become a lightweight lookup from slot position → `Player.id` pair.

Pros:
- `MatchSet` enables SQL set-level aggregation (needed for Elo and set-win stats).
- Fix to `teamsJson` stops name drift without requiring a full `Team` model.
- Smaller blast radius: two targeted changes rather than a full data model overhaul.

Cons:
- `teamsJson` remains a JSON blob — less clean but avoids a complex `Team` table that would ripple through the entire Classic scheduling flow.
- Migration must backfill `MatchSet` rows from existing `setsJson` data — requires a one-time data script.

---

### Option C — Full normalization: `MatchSet` + `Team` model

```prisma
model Team {
  id          String    @id @default(cuid())
  tournamentId String
  tournament  Tournament @relation(...)
  players     Player[]  @relation("TeamPlayers")
  homeMatches MatchScore[] @relation("HomeTeam")
  awayMatches MatchScore[] @relation("AwayTeam")
}
```

`Tournament.teamsJson` is removed. `MatchScore.homeTeam`/`awayTeam` become relations to `Team` instead of direct M:M to `Player`.

Pros:
- Fully relational. Teams have IDs and can be referenced consistently.
- Enables team-level stats (team win rate, best team pairs).

Cons:
- Major migration: the existing `homeTeam`/`awayTeam` M:M on `MatchScore` already stores the players who played in each match (across all three formats). Introducing a `Team` model breaks this or requires duplicating the relation.
- Americano and Mexicano don't have persistent teams — a `Team` model would only be used by Classic format, making it a niche addition with heavyweight schema impact.
- High risk, high effort, marginal gain over Option B.

Rejected.

---

## Decision

**Option B — Add `MatchSet` table; migrate `teamsJson` to store player IDs instead of names.**

### Migration plan

**Step 1 (additive):** Create `MatchSet` with a Prisma migration. Keep `setsJson` column in place.

**Step 2 (backfill):** Run a one-time script that reads every `MatchScore` with a non-null `setsJson`, parses it, and inserts the corresponding `MatchSet` rows.

**Step 3 (read path):** Update `classic.ts` and API routes to prefer `MatchSet` rows over `setsJson`. Keep `parseSets(setsJson)` as fallback for any rows the backfill missed.

**Step 4 (write path):** Update the score-save API (`/api/match-scores/[id]`) to write `MatchSet` rows instead of (or in addition to) `setsJson`.

**Step 5 (cleanup):** After confirming backfill is complete and no code path writes to `setsJson`, drop the column in a follow-up migration.

**`teamsJson` migration:** Similar two-step: (1) write new Classic tournaments with player IDs in `teamsJson`; (2) run a backfill script that resolves player names to IDs for existing rows (match on `name` within the tournament's player list — since names must be unique within a tournament, this is safe).

---

## Consequences

### Positive
- `MatchSet` enables set-level SQL aggregation: set wins per player, tiebreak frequency, etc.
- Unblocks Elo computation (ADR-006) which needs per-set outcomes for Classic format.
- Player ID storage in `teamsJson` stops silent name drift after player renames.
- `parseSets()` in `classic.ts` continues to work as a fallback during migration window.

### Negative / risks
- Backfill script must be idempotent (re-runnable without creating duplicate `MatchSet` rows). Use `upsert` on `(matchId, setIndex)`.
- Tournaments created during the migration window (after Step 1, before Step 4) could end up with only `setsJson` populated if the write path isn't updated atomically — the fallback read path handles this but the window should be kept short.
- `teamsJson` name→ID backfill relies on player names being unique per tournament. If duplicates exist (edge case), the script must flag them for manual resolution.

---

## Links

- Required by: ADR-006 (Elo rating) for set-level Classic outcomes.
- Related: ADR-001 — `PlayerStat` can include set-win stats once `MatchSet` exists.
