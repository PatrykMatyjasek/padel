# ADR-005: Player identity model and public profiles

**Status**: Proposed  
**Date**: 2026-06-20

---

## Context

The current `Player` model has two interconnected problems:

**1. Identity is per-organizer, not per-person.**  
Each `Player` row is owned by a `User` (`userId`). If the same real person plays in tournaments organized by different accounts, they appear as separate players with no connection between them. Across even a small club this fragments statistics.

**2. Player profiles are auth-gated.**  
`/players/[id]` and `/api/players/[id]/stats` both require a session. A player cannot share their own stats page with a friend or post it publicly. The tournament share token already demonstrates the read-only public view pattern; player profiles have no equivalent.

These two issues interact: if player identity is eventually unified across accounts (club model, ADR-007 not covered here), a public profile URL becomes even more valuable. But even within the current single-organizer model, public profiles are independently useful.

---

## Decision drivers

- A public player profile must be read-only and expose only stats the organizer has already made public (tournaments that are either public via share token or closed).
- The solution must not require solving the full cross-organizer identity problem immediately — that is a larger scope (club accounts).
- Player deletion or archive must not corrupt existing match history.
- Implementation should reuse existing patterns (share tokens) rather than introduce new auth mechanisms.

---

## Considered options for public profiles

### Option A — Share token on Player (mirrors Tournament)

Add `shareToken String? @unique` to `Player`. When the organizer generates a share token for a player, a public URL `/p/[token]` becomes available. Anyone with the link can view the player's stats.

Pros:
- Identical pattern to `Tournament.shareToken` — zero new concepts to learn.
- Opt-in per player — the organizer controls which players are publicly visible.
- Token can be revoked (set to null) at any time.

Cons:
- The organizer must generate tokens individually for each player they want to share.
- If a player wants to share their own profile they must ask the organizer to generate the token.

---

### Option B — All player profiles are publicly accessible by ID

Remove the auth check from `/players/[id]` and `/api/players/[id]/stats`. Player IDs are cuid()s (unguessable without enumeration), so exposure is limited in practice.

Pros:
- Simplest — no schema change, just remove the auth guard and limit what the public response includes (no email, no private tournament data).

Cons:
- Player IDs are in URLs the organizer might share (e.g. a tournament link that references player names with profile links). Making them guessable-by-URL means stats are visible to anyone who sees a tournament page.
- Inconsistent with the opt-in philosophy of tournament share tokens.
- If an organizer adds a player named "John" who doesn't want their stats public, there's no way to opt out without deleting the player.

---

### Option C — Players claim their own account (federated identity)

Allow a `Player` record to be "claimed" by a registered `User` account. The player creates an account, the organizer sends a claim link, and after claiming the player's stats are visible on the player's own dashboard regardless of which organizer's tournament they played in.

Pros:
- Solves both the public profile problem and the cross-organizer identity problem at once.
- Player controls their own data.

Cons:
- Large scope — requires invite flows, claim approval by organizer, profile merging logic.
- Premature for the current user base size.
- Blocks public profiles on solving identity first.

---

## Decision

**Option A — `shareToken` on `Player`, public URL at `/p/[token]`.**

Reasons:
- Consistent with the existing tournament share pattern — both users and the codebase already understand it.
- Opt-in per player respects player privacy.
- Unblocks public profiles without requiring club accounts or federated identity.
- Option C remains viable as a future upgrade — when a player claims their account, the share token URL can redirect to their profile.

### Schema addition

```prisma
// Player gets:
//   shareToken  String?  @unique
```

### Public profile scope

The `/p/[token]` page shows:
- Player name.
- All-time stats (points, matches, wins, win rate, tournament wins, podiums) — computed only from tournaments that are either closed or have a share token (i.e. the organizer has already made them public).
- Tournament history listing (closed tournaments only).
- Top partners and rivals by match count (names only, no links to their profiles unless they also have share tokens).

Intentionally excluded from the public view:
- The organizer's account details.
- In-progress tournament scores (to avoid spoilers before the organizer closes the tournament).

---

## Considered options for player deletion / archive

The current schema allows `Player` deletion with a Prisma cascade that would NULL out the `homeTeam`/`awayTeam` relations on `MatchScore`, orphaning match data silently.

### Option A — Hard guard: block deletion if match history exists

Return a 409 error from `DELETE /api/players/[id]` if any `MatchScore` references the player. Require the organizer to confirm they understand history will be lost, then perform a hard delete with cascade.

Pros: Prevents accidental deletion.  
Cons: No way to remove a player without losing their history.

### Option B — Soft delete: `archivedAt` column

Add `archivedAt DateTime?` to `Player`. Archived players are hidden from the player roster and tournament builder but their `MatchScore` rows remain intact. Stats continue to include archived players.

Pros:
- Match history preserved.
- Player can be unarchived.
- Stats remain accurate.

Cons:
- All player queries must add `WHERE archivedAt IS NULL` — easy to forget.
- Share tokens for archived players — should the public profile page return a 404 or show "archived"?

### Option C — Keep hard delete, add a confirmation dialog only

Current cascade behaviour with a "this will delete match history" warning in the UI.

Pros: Simple.  
Cons: Irreversible data loss is a single button click away.

---

## Decision (player deletion)

**Option B — soft delete via `archivedAt`.**

Reasons:
- Historical match data is the app's most valuable content — irreversible deletion is too destructive.
- Soft delete is the standard pattern for records that have downstream references.
- Archived players appearing in historical stats is correct: removing them would artificially change past tournament leaderboards.

### Schema addition

```prisma
// Player gets:
//   archivedAt  DateTime?
```

All player list queries add `WHERE archivedAt IS NULL`. The public profile share page returns the stats if `archivedAt IS NULL`, otherwise 410 Gone.

---

## Consequences

### Positive
- Players (or organizers on their behalf) can share a stats link without requiring the viewer to log in.
- Historical match data cannot be accidentally destroyed.
- Consistent UX with tournament sharing that users already understand.

### Negative / risks
- Share tokens for players must be explicitly generated by the organizer — a friction point if a player wants to share their own stats immediately after a tournament.
- Soft delete means the `players` table grows indefinitely. A "purge archived players older than N months" admin tool may be needed eventually.
- Stats aggregation queries must filter `archivedAt IS NULL` consistently — a missed filter would surface archived players in leaderboards.

---

## Links

- Related: ADR-002 — series leaderboards must also filter archived players.
- Enables: future ADR on federated player identity / club accounts.
