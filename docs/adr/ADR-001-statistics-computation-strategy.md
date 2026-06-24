# ADR-001: Statistics computation strategy

**Status**: Implemented  
**Date**: 2026-06-20

---

## Context

All player statistics (total points, wins, win rate, podiums, tournament wins, avg pts/match) are recomputed from scratch on every request. `/api/stats` loads every tournament with its players and all locked match scores, iterates over all of them in JS, and returns the result. `/api/players/[id]/stats` does the same for a single player.

This works at the current scale but has two problems:

1. **Performance** — query volume grows linearly with match history. At 100 tournaments × 30 matches each that's 3 000 match score rows loaded, joined, and processed in-memory on every stats page load. At 1 000 tournaments it becomes noticeably slow.

2. **Blocked features** — Elo rating (ADR-006), series leaderboards (ADR-002), and date-range filtering all require either recomputing stats per slice or having pre-aggregated values to start from. On-demand full recomputation gets expensive as new slicing dimensions are added.

---

## Decision drivers

- Stats accuracy must be correct at all times (no stale reads for the organizer).
- Implementation must stay within the current Next.js + Prisma + PostgreSQL stack (no Redis, no queue, no separate compute service unless justified).
- Should not require a rewrite of the existing stats API contracts.

---

## Considered options

### Option A — Keep on-demand recomputation (current)

Load all relevant rows on each request and compute in JS.

Pros:
- Always fresh.
- No extra schema changes.
- Simple to reason about.

Cons:
- Slow at scale.
- Every new filter dimension (date range, format, series) multiplies query cost.

---

### Option B — Materialized columns on `Player`

Add aggregate columns to the `Player` table (`totalPoints`, `matchesPlayed`, `wins`, `tournamentWins`, `podiums`). Update them inside the existing match-lock and tournament-close API handlers.

Pros:
- Stats reads become a single `SELECT` with no joins.
- No background job infrastructure needed.
- Incrementally updatable — only the players in the affected match need their counters touched.

Cons:
- Counter updates in the same transaction as match-lock can fail and leave counts out of sync if not handled carefully.
- Filtering by date range or format is not directly possible from scalar counters alone — still requires querying raw matches for sliced views.
- Schema migration required (additive, non-breaking).

---

### Option C — Separate `PlayerStat` snapshot table, updated on tournament close

Add a `PlayerStat` table with one row per (player, tournament). Populate it when a tournament is closed. Global stats aggregate over these rows with a single GROUP BY query.

```
PlayerStat — playerId, tournamentId, format, points, matches, wins, rank, closedAt
```

Pros:
- Supports date-range and format filtering natively via SQL (filter `closedAt`, `format`).
- Correct-by-construction — written once per tournament when results are final.
- Does not pollute the `Player` model.
- Naturally extends to series (ADR-002) by joining on `tournamentId`.

Cons:
- Stats for open/in-progress tournaments must still be computed on-demand (since they haven't been closed yet).
- Adds a write step to the tournament-close flow.
- Schema migration required.

---

## Decision

**Option C — `PlayerStat` snapshot table, updated on tournament close.**

Reasons:
- Date-range and format filtering are a confirmed requirement and can only be served cheaply via SQL if the data is in rows.
- The snapshot model is naturally consistent: stats are finalised once, at close time, and never drift.
- Open tournament stats (which are always current anyway) can keep using on-demand computation without changing the UX.
- This decision unblocks ADR-002 (series) and ADR-006 (Elo), both of which need per-tournament per-player outcome data.

---

## Consequences

### Positive
- Stats page query goes from O(all matches ever) to O(rows in PlayerStat), one GROUP BY.
- Date range and format filters are free SQL predicates.
- Foundation for series leaderboards (join PlayerStat on the series' tournament list).

### Negative / risks
- Stats for a tournament that gets closed and then inadvertently reopened must invalidate and recompute the snapshot row — needs a delete + recompute on tournament reopen.
- A bug in the close handler could silently write wrong stats with no automatic correction — needs a reconciliation script that can be run manually.
- In-progress tournament stats still use on-demand computation, so there are two code paths for the same UI — must be kept in sync.

---

## Links

- Depends on: ADR-004 (schema normalization) — if `setsJson` is normalized first, set-level stats can be added to `PlayerStat` without another migration.
- Required by: ADR-002 (series), ADR-006 (Elo).
