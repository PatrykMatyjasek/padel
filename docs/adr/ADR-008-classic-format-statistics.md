# ADR-008: Classic format statistics model

**Status**: Proposed  
**Date**: 2026-06-21

---

## Context

Classic format differs from Americano and Mexicano in every dimension that affects statistics:

| Dimension | Americano / Mexicano | Classic |
|---|---|---|
| Teams | Rotating partners | Fixed pairs, whole tournament |
| Scoring unit | Game points (e.g. 21–18) | Sets won per match (e.g. 2–1) |
| `homeScore` / `awayScore` meaning | Raw game points | Sets won |
| Match structure | One flat score | 2–3 sets, each with game scores, optional tiebreak |
| Phases | None | Group stage + knockout bracket |
| Tournament winner | Highest cumulative points | Winner of the Final match |

### The scoring unit mismatch

The score-save handler (`PUT /api/match-scores/[id]`) captures this split explicitly:

```ts
if (body.setsJson !== undefined) {
  // Classic: derive homeScore/awayScore from sets won
  const [homeScore, awayScore] = setsWon(sets);
  data = { setsJson: body.setsJson, homeScore, awayScore, locked: true };
} else {
  // AM/MX: use raw game points
  data = { homeScore: body.homeScore, awayScore: body.awayScore, locked: true };
}
```

As a result, `MatchScore.homeScore` in Classic is at most 3 (sets won in a best-of-3), while in Americano it is routinely 21+. The current `computeStats` function in `/api/stats/route.ts` sums `homeScore` across all formats indiscriminately. A Classic player accumulates 2–3 "points" per match while an Americano player accumulates 15–21. The unified all-time leaderboard is already comparing incommensurable numbers.

### Rich stat dimensions already computed live

`computeGroupStandings` in `lib/classic.ts` computes per team: played (P), wins (W), losses (L), sets won (SW), sets lost (SL), games won (GW), games lost (GL), match points (Pts, 3 per win). This is the right stat model for Classic group stage — but it only exists in JS memory during page render. None of it is persisted.

### Additional stat dimensions unique to Classic

- **Bracket finish**: tournament winner, finalist, semi-finalist, quarter-finalist — these are discrete achievements, not derivable from raw scores.
- **Group finish**: rank within the player's group (1st, 2nd, etc.).
- **Phase-split stats**: group stage performance vs knockout performance can be tracked separately.
- **Consolation bracket finish**: "best of the rest" ranking for teams eliminated in the main bracket.
- **Team identity**: a team (fixed pair) is the natural unit of analysis for Classic, unlike AM/MX where partners change.

---

## Decision drivers

- The unified stats page (`/api/stats`) must continue to work across all three formats. Classic cannot be silently excluded, but the mixing of sets-as-points with game-points must be resolved.
- The player profile page (`/players/[id]`) shows per-individual stats. Classic stats must be expressible at the individual level, even though the natural Classic unit is the team.
- Bracket finish is a first-class achievement. "Won the Final", "Lost in the Semifinal" is more meaningful to Classic players than a points total.
- This ADR builds on ADR-001 (PlayerStat snapshot) and ADR-004 (MatchSet normalization) but must specify what Classic-specific columns belong where.
- No new infrastructure. PostgreSQL + Prisma only.

---

## Decision 1: Resolving the scoring unit mismatch in the unified leaderboard

Three approaches:

### Option A — Exclude Classic from the unified all-time leaderboard

The Statistics page already has per-format tabs (AM / MX / CL). The "All formats" tab simply removes Classic from its aggregation. Classic gets its own separate leaderboard section.

Pros: No fake normalisation. Apples are never mixed with oranges.  
Cons: Breaks the "all-time" concept. A player who plays all three formats is penalised on the overall leaderboard.

### Option B — Normalise Classic to a comparable unit (e.g. games won)

Store games won per player per Classic match. Use games won as the "points" figure for Classic in the unified leaderboard.

Pros: Game scores (e.g. 6–3, 7–5) are in a similar range to AM/MX game points (15–21). The unified view becomes closer to comparable.  
Cons: Artificial. A player who wins 6–0, 6–0 in Classic scores 12 "points" vs a player who wins 21–18 in Americano scoring 21. Still not comparable, just less obviously wrong.

### Option C — Keep per-format leaderboards; in the "All formats" tab rank by match wins and tournaments played, not raw points

Change the all-formats view to rank by: (1) match win rate, (2) total tournaments, (3) total matches. Points are shown per-format only. This is semantically honest: you cannot sum game points and sets won, but you can sum match wins.

Pros: Honest. Match wins are directly comparable across formats — a win is a win.  
Cons: "Pts" disappears from the all-formats view, which may confuse users who expect to see a points total.

---

**Decision: Option C** — the all-formats tab ranks by match wins and tournaments played. The "CL" tab shows Classic-specific stats (match wins, sets won/lost ratio, games won/lost, bracket finish). The `points` column on the all-formats view becomes `wins`.

This requires a UI change to the stats table (rename the column header) and a change to `computeStats` to emit wins as the primary sort key for the all-formats view. No schema change required beyond what ADR-001 already specifies.

---

## Decision 2: Classic-specific stat columns in PlayerStat

ADR-001 defines a `PlayerStat` table written at tournament close. For Classic, the following additional columns must be captured:

```prisma
model PlayerStat {
  id             String   @id @default(cuid())
  playerId       String
  tournamentId   String
  format         String   // "AM" | "MX" | "CL"

  // Common across all formats
  points         Int      // AM/MX: raw game points scored. CL: games won (see Decision 1).
  matches        Int      // total matches played
  wins           Int      // match wins
  rank           Int?     // final rank within tournament (null if tournament still open)

  // Classic-specific — null for AM/MX rows
  setsWon        Int?
  setsLost       Int?
  gamesWon       Int?
  gamesLost      Int?
  groupFinish    Int?     // rank within group (1 = group winner, 2 = runner-up, etc.)
  bracketFinish  String?  // "W" | "F" | "SF" | "QF" | "C-F" | "C-SF" | "C-QF" | "group-only"
  teamPartner    String?  // partner Player.id — the other player on the fixed team

  closedAt       DateTime
  @@unique([playerId, tournamentId])
}
```

`points` in Classic rows stores **games won** (sum of all game scores across all sets the player's team played). This is the normalised value used in the CL-format leaderboard on the stats page.

`bracketFinish` captures the deepest bracket round the player reached. Values:
- `"W"` — won the Final
- `"F"` — lost in the Final (runner-up)
- `"SF"` — eliminated in Semifinals
- `"QF"` — eliminated in Quarterfinals
- `"C-F"`, `"C-SF"`, `"C-QF"` — consolation bracket equivalents
- `"group-only"` — did not advance from group stage

`teamPartner` enables team-level aggregation without a separate Team model (see Decision 3).

---

## Decision 3: Individual vs team-level stat granularity

Classic has fixed teams. Stats are inherently team stats. The question is whether to store them at individual level, team level, or both.

### Option A — Individual only (one row per player per tournament in PlayerStat)

Both players on the same team get identical `PlayerStat` rows (same wins, same setsWon, same bracketFinish). `teamPartner` links them.

Pros: Consistent with AM/MX rows. No separate Team model needed. Player profile page works without modification.  
Cons: Redundant data (the same values duplicated for two rows). Team-level aggregation requires grouping by `(playerId, teamPartner)`.

### Option B — Team rows only (one row per team per tournament)

A `TeamStat` table stores stats per (player1Id, player2Id, tournamentId). Player profile aggregates over `TeamStat` rows where `player1Id = id OR player2Id = id`.

Pros: No duplication. Natural model.  
Cons: New table. Player profile query becomes a UNION across two foreign keys. Inconsistent with how AM/MX stats are stored.

### Option C — Both: individual PlayerStat rows + team aggregation computed at read time

Store individual `PlayerStat` rows (Option A). Team stats are derived at read time by querying `PlayerStat WHERE (playerId = A AND teamPartner = B) OR (playerId = B AND teamPartner = A)` and grouping.

Pros: Player profile remains a simple single-player query. Team leaderboard for Classic (a future feature) is a derived view with no extra storage.  
Cons: Slightly awkward query for team records.

---

**Decision: Option A** — individual `PlayerStat` rows with `teamPartner` linking the pair. Duplication is acceptable (two rows per team per tournament is six extra columns, not a meaningful storage cost). Team-level stats can be derived from these rows without a separate model.

---

## Decision 4: Phase-split statistics (group vs knockout)

Classic matches carry `phase: "group"` or `phase: "knockout"`. Should stats be tracked separately per phase?

### Option A — Single aggregate per player per tournament (no phase split)

One `PlayerStat` row per player per tournament. Group stage and knockout stats are summed together.

Pros: Simple. Consistent with AM/MX.  
Cons: A team that dominated their group but lost in QF has a misleading win/loss record mixed with their knockout loss.

### Option B — Two PlayerStat rows per player per tournament: one for group, one for knockout

`phase String?` added to `PlayerStat`. Two rows: `{ phase: "group", wins: 3, ... }` and `{ phase: "knockout", wins: 0, bracketFinish: "QF", ... }`.

Pros: Phase-level stats are queryable directly. Bracket finish is naturally attached to the knockout row.  
Cons: Player profile and stats page must sum across phases when showing totals — adds a GROUP BY.

### Option C — Single aggregate row with phase-split sub-columns

Add `groupMatchWins`, `groupMatchLosses`, `knockoutMatchWins`, `knockoutMatchLosses` as separate columns on the single `PlayerStat` row.

Pros: One row per player per tournament. Phase split is readable without aggregation.  
Cons: Column proliferation. AM/MX rows leave all phase columns NULL.

---

**Decision: Option B** — two rows with a `phase` column. Bracket finish is stored only on the `knockout` phase row. When the player profile or stats page shows "total wins for Classic", it sums across both phase rows for the same tournament. This is a straightforward GROUP BY on `(playerId, format)` and produces correct totals.

`PlayerStat` gets:

```prisma
phase  String?  // null for AM/MX; "group" or "knockout" for Classic
```

The `@@unique` constraint changes to `@@unique([playerId, tournamentId, phase])` to allow two rows per Classic tournament.

---

## Decision 5: Bracket finish computation

`bracketFinish` must be derived from the knockout match results at tournament close time. The logic:

1. Find the deepest `bracketRound` where the player's team has a locked match (`"QF"`, `"SF"`, `"F"`, or consolation equivalents).
2. Check if the team won or lost that match.
3. Winner of `"F"` → `"W"`. Loser of `"F"` → `"F"`. Loser of `"SF"` → `"SF"`. Etc.
4. If no knockout matches exist for the player (they didn't advance from groups) → `"group-only"`.

This computation runs over `MatchScore` rows with `phase = "knockout"` at tournament close, using existing `matchWinner()` from `lib/classic.ts`. No new library function required.

---

## Classic stats in the player profile page

The `/api/players/[id]/stats` endpoint should return a Classic-specific section alongside the existing AM/MX data:

```json
{
  "classic": {
    "matches": 12,
    "wins": 8,
    "setsWon": 19,
    "setsLost": 9,
    "gamesWon": 142,
    "gamesLost": 98,
    "setWinRate": 0.68,
    "tournamentWins": 2,
    "podiums": 3,
    "bracketFinishes": {
      "W": 2, "F": 1, "SF": 0, "QF": 1, "group-only": 0
    },
    "bestPartner": { "id": "...", "name": "Anna", "teamWins": 6, "teamMatches": 8 }
  }
}
```

`bestPartner` is derived by querying `PlayerStat WHERE teamPartner = <partnerId>` grouped by partner, ordered by team wins. This is the Classic equivalent of the partner win-rate table that already exists for AM/MX.

---

## Classic stats in the Statistics page (CL tab)

The CL format tab shows a leaderboard with columns appropriate to Classic:

| # | Player | T | MW | SW | SL | SR | GW | GL | 🏆 | QF+ |
|---|---|---|---|---|---|---|---|---|---|---|

- **T** — tournaments played
- **MW** — match wins
- **SW / SL** — sets won / lost
- **SR** — set win rate (SW / SW+SL)
- **GW / GL** — games won / lost
- **🏆** — tournament wins
- **QF+** — number of tournaments where they reached at least QF

Primary sort: tournament wins → set win rate → games won.

The AM and MX tabs keep the existing columns (Pts, M, Avg, W, T, podiums, tournament wins) unchanged.

---

## Migration from current state

Currently, Classic tournament statistics are computed live from `MatchScore` rows in JS. No persistent stat rows exist.

**Steps at implementation time:**

1. Add `phase`, `setsWon`, `setsLost`, `gamesWon`, `gamesLost`, `groupFinish`, `bracketFinish`, `teamPartner` columns to `PlayerStat` (all nullable — AM/MX rows leave them NULL).
2. Change `PlayerStat @@unique` from `[playerId, tournamentId]` to `[playerId, tournamentId, phase]`.
3. Write a backfill script that closes all existing Classic tournaments and generates `PlayerStat` rows. (Or mark existing Classic tournaments as "stats pending" until manually reclosed.)
4. Update the tournament-close handler to write two `PlayerStat` rows per player per Classic tournament (group phase + knockout phase).
5. Update `/api/stats` to use `PlayerStat` rows for CL, with phase aggregation.
6. Update `/api/players/[id]/stats` to return the Classic-specific section.

---

## Consequences

### Positive
- Classic stats are no longer mixed with AM/MX scores in the unified leaderboard — the numbers shown mean what users expect.
- Bracket finish is a persistent, queryable achievement: "reached the Final 3 times" is now a stat, not a recalculated inference.
- Phase-split rows enable future filters like "how does this player perform in knockout matches vs group stage?"
- `teamPartner` enables a "best team pairs" leaderboard for Classic with no additional schema.

### Negative / risks
- Two `PlayerStat` rows per Classic tournament per player means the stats query must always aggregate across phases. Forgetting the GROUP BY will double-count Classic stats — a latent query bug risk.
- `bracketFinish` computation depends on knockout match completeness. A tournament closed before all knockout matches are scored will produce an incorrect `bracketFinish`. Should validate all knockout matches are locked before allowing close, or mark `bracketFinish` as provisional.
- `points` in Classic rows means games won, not game points. A comment in the schema and query layer is necessary to avoid future maintainers reinterpreting this column.

---

## Links

- Depends on: ADR-001 (PlayerStat snapshot table) — this ADR extends that schema.
- Depends on: ADR-004 (MatchSet normalization) — `gamesWon`/`gamesLost` require iterating set scores; this is easier once `MatchSet` rows exist.
- Informs: ADR-006 (Elo) — Classic Elo uses match winner, which is already derived from sets. The per-set data (for future margin-of-victory weighting) comes from `MatchSet`.
- Informs: ADR-002 (series) — series leaderboards for Classic should rank by match wins or bracket finish, not by "points", consistent with Decision 1 here.
