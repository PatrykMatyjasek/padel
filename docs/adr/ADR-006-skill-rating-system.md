# ADR-006: Skill rating system (Elo)

**Status**: Proposed  
**Date**: 2026-06-20

---

## Context

Current leaderboards rank players by **total raw points** accumulated across matches. This has two fairness problems:

1. **Volume bias** — a player who enters 10 tournaments accumulates more points than an equally skilled player who enters 3, regardless of results.
2. **Opponent quality is ignored** — beating a weak team earns the same points as beating a strong team.

A skill rating system adjusts each player's rating based on opponent strength, normalising for volume. The most common approach in amateur sport is an Elo-based rating (used in chess, table tennis, and many sports leagues).

In doubles padel the unit of competition is the **team** (pair of players), not the individual. This creates a choice: rate teams or rate individuals.

---

## Decision drivers

- Americano and Mexicano formats have **rotating partners** — there are no fixed teams. Individual rating is the only viable approach for these formats.
- Classic format has **fixed teams** per tournament. Team rating is possible but individual rating is also computable from the same data.
- Rating must be stored persistently and updated incrementally (not recomputed from scratch on every request).
- The system must remain interpretable to non-technical users: a visible number that goes up when you win and down when you lose.
- Rating computation must not block the score-save request. It is acceptable for ratings to update a few seconds after a match is locked.
- No external job queue infrastructure is available; computation must happen within Next.js API routes or a lightweight async mechanism.

---

## Rating model: individual Elo in doubles

### Standard Elo

Each player has a rating `R`. After a match between team (A, B) vs team (C, D):

```
teamRating_home = (R_A + R_B) / 2
teamRating_away = (R_C + R_D) / 2

E_home = 1 / (1 + 10^((teamRating_away - teamRating_home) / 400))
E_away = 1 - E_home

S_home = 1 if homeScore > awayScore, else 0
S_away = 1 - S_home

ΔR_home = K × (S_home − E_home)   — applied to both A and B
ΔR_away = K × (S_away − E_away)   — applied to both C and D
```

K-factor: `K = 32` is standard for players with fewer than 30 rated matches; `K = 16` for established players. Using a static `K = 24` initially is acceptable.

Starting rating: **1000** for all players.

### Format-specific adjustments

- **Americano / Mexicano**: each individual match is a rated event. Partners change every round, so each match contributes independently.
- **Classic**: group-stage matches are rated individually. Knockout matches carry 1.5× weight (higher stakes).

---

## Considered options for computation trigger

### Option A — Compute on match lock

After the organizer locks a match (`POST /api/match-scores/[id]/close`), compute and apply Elo delta immediately before returning the response.

Pros:
- Ratings are current as soon as a match is locked.
- No deferred job needed.

Cons:
- Adds latency to the lock API call (small: one match = 4 player reads + 4 updates).
- Rating history depends on **lock order**, which may not match **play order** if organizers lock matches out of sequence.
- Does not recompute on score edit (if a locked match is unlocked, score changed, then re-locked, the Elo delta from the first lock remains).

---

### Option B — Compute on tournament close

When an organizer closes a tournament, walk all locked matches in round order and apply Elo deltas sequentially.

Pros:
- Lock order vs play order is no longer ambiguous — round number provides canonical ordering.
- Score edits before close don't create orphaned Elo deltas.
- Matches within the same round can be processed in any order (or in parallel).

Cons:
- Ratings do not update during the tournament — live match viewers cannot see their rating change in real time.
- A large tournament (50+ matches) may take noticeable time to process; must be done asynchronously.

---

### Option C — Compute on tournament close, async via background Route Handler

Same as Option B but the close API returns 202 Accepted immediately and triggers computation in a background `fetch` to a `/api/internal/compute-elo` endpoint. This keeps the close response fast.

Pros:
- Non-blocking close request.
- Ratings update within seconds of close.

Cons:
- Requires careful handling of concurrent close attempts (idempotency check on `eloComputedAt` column).

---

## Decision

**Option B (synchronous on tournament close) initially; upgrade to Option C if close latency becomes a problem.**

Reasons:
- Tournament close is an infrequent, intentional action — small latency is acceptable.
- Play-order ambiguity (Option A) would produce different rating outcomes depending on when the organizer taps "lock" — unacceptable for a fairness-oriented system.
- Starting synchronous simplifies the implementation; async can be added transparently later.

---

## Storage

### Schema additions

```prisma
// Player gets:
//   eloRating      Int    @default(1000)
//   eloMatches     Int    @default(0)

model EloHistory {
  id           String    @id @default(cuid())
  playerId     String
  player       Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
  tournamentId String
  matchId      String
  ratingBefore Int
  ratingAfter  Int
  delta        Int
  createdAt    DateTime  @default(now())
}
```

`Player.eloRating` is the current rating. `EloHistory` stores one row per player per rated match, enabling a rating-over-time chart.

`Tournament` gets `eloComputedAt DateTime?` — set when Elo is computed for the tournament. The close handler checks this to avoid double-computing.

### Recomputation

If a closed tournament's scores are corrected (organizer unlocks, edits, closes again):
1. Delete all `EloHistory` rows for that `tournamentId`.
2. Roll back affected `Player.eloRating` values by re-replaying history from the `EloHistory` table in chronological order.

This is the most complex part of the implementation. A simpler alternative: prohibit score edits after Elo has been computed (show a warning: "Elo ratings have been computed for this tournament; editing scores will require recomputing ratings for all subsequent tournaments").

---

## Consequences

### Positive
- Players get a persistent skill rating that is comparable across tournaments and formats.
- Rating history enables a "rating over time" chart on the player profile page.
- Series leaderboards (ADR-002) can optionally rank by Elo instead of raw points for season standings.

### Negative / risks
- **Bootstrap problem** — all players start at 1000. The first 5–10 tournaments produce volatile ratings. Consider a provisional rating phase (shown differently in the UI) until a player has 10+ rated matches.
- **Recomputation on score edit** is expensive and complex. Initial version should warn and prevent edits after close; full recomputation can come later.
- Classic format set-by-set outcomes are ignored in this model (match winner only). If ADR-004 is implemented, a margin-of-victory adjustment (more convincing wins = larger K) becomes possible.
- The K-factor choice (24) is arbitrary. Should be re-evaluated after the first season of data.

---

## Links

- Depends on: ADR-001 (PlayerStat) — Elo should be computed alongside `PlayerStat` rows at close time.
- Depends on: ADR-004 (schema normalization) — for future margin-of-victory weighting using set scores.
- Enables: Series rankings by Elo (ADR-002).
