# Padel Manager — Product Overview & Roadmap Ideas

## What it is

A web app for organizing padel tournaments. Organizers create tournaments, add players, auto-generate schedules, and track scores. Results feed a live leaderboard and player statistics that accumulate across tournaments.

---

## Current features

### Tournament formats

| Format | How it works |
|---|---|
| **Americano** | Partners rotate every round. Every player pairs with every other exactly once. Uses exact balanced algorithm for N=4 and N=8; circle method for other counts. |
| **Mexicano** | Dynamic pairing. Round 1 is random; subsequent rounds pair players by current ranking (rank 1+3 vs rank 2+4 within each court group). |
| **Classic** | Fixed teams. Group stage (round-robin within groups) followed by knockout bracket (QF/SF/F). Optional consolation bracket. Per-set scoring with tiebreak support. |

### Players
- Global player registry per account, reused across tournaments
- Per-player profile page with full stats: total points, matches, win rate, tournament wins, podiums, partner/rival breakdown, and full tournament history

### Schedule generation
- Automatic — all rounds and match slots generated at creation time for Americano/Classic
- Mexicano is round-by-round: each round generated after scoring the previous one

### Scoring
- Score entry per match with lock/confirm step
- Per-set scores for Classic format (with tiebreak legs)
- Matches can be reopened (unlocked) and rescored

### Tournament sharing
- Any tournament can get a share token → public read-only URL at `/t/[token]`
- No login required to view a shared tournament's bracket and results

### Statistics dashboard
- Cross-tournament leaderboard per account with breakdown by format (Americano / Mexicano / Classic)
- Tracks: total points, matches played, wins, avg pts/match, tournaments entered, podiums (top 3 finishes), tournament wins
- Stats are only counted from scored, locked matches; podiums/wins only from closed tournaments

### Platform
- Admin dashboard: global user count, tournaments, matches, page views, daily charts, feedback management, recent signups
- In-app feedback widget (with star rating)
- Page view tracking (lightweight analytics)
- SEO: sitemap, robots.txt, PWA manifest, JSON-LD structured data
- Auth: email + password (bcrypt), NextAuth sessions

---

## Improvement areas — existing features

### Scoring & schedule UX
- **Mexicano round generation is manual** — the organizer must explicitly trigger each next round after scoring. Could auto-suggest when all matches in a round are locked.
- **Court assignment** — courts count is stored but matches aren't assigned to specific courts. Players don't know which court to go to.
- **Classic bracket advancement** — currently generates all bracket rounds upfront as empty slots. Propagating winners automatically (or at least prompting) would reduce manual work.

### Player experience
- **No password reset** — users who forget passwords have no self-serve recovery.
- **No social login** — email/password only; Google/Apple login would lower the signup barrier.
- **Player stats are private** — the player detail page requires auth and only shows your own players. There's no public player profile URL to share someone's stats.

### Data quality
- **Player deduplication** — if the same real person is added with different name spellings across tournaments, their stats are split. No merge tool.
- **Player deletion** — deleting a player with match history would leave orphaned score records. No guard or archive mechanism.

### Statistics
- **No date range filter** — all-time only; can't compare "last 3 months" vs lifetime.
- **No head-to-head summary on the stats page** — the data exists in the player profile API (partner/rival tables) but the stats dashboard doesn't expose h2h between any two players.
- **Win rate shown but not used for ranking** — players are ranked by raw points, not adjusted for matches played. A separate "efficiency" ranking (pts per match) exists as a column but isn't primary.

---

## Ideas & possibilities

### 1. Tournament series / leagues
Group multiple tournaments into a series. Each tournament contributes points to a season standings table (e.g., top 3 finishes count, or all tournaments count with drop-worst-N option). Would add:
- `Series` model with a list of linked `Tournament` ids and a point-conversion rule
- Series leaderboard aggregated from closed tournaments in the series
- Share page for the series (similar to the current tournament share token)

This is the highest-value feature for recurring groups (weekly club nights, monthly circuits).

### 2. Public player profile / shareable stats link
Currently player stats are only visible to the account owner. A share token for player profiles (similar to the tournament share token) would let players show off their record to others without requiring them to log in. Low implementation cost given the data is already computed.

### 3. Elo / skill rating
Replace (or supplement) raw points with a per-player rating that adjusts after each match based on opponent strength. Makes cross-tournament comparisons fairer when players don't all play the same number of matches. Could be computed as a background job when a tournament is closed.

### 4. Player invites / collaborative tournaments
Right now one account owns all the data. An invite system would let:
- The organizer send a link that lets a player view their own match schedule
- Multiple organizers co-manage a tournament (useful for club events)
- Players self-report scores (with organizer approval)

### 5. Real-time score updates
Currently the tournament view is a static fetch — you have to reload to see new scores. Server-Sent Events or polling with a short interval would let spectators (or players checking a shared link) see scores update live without manual refreshes.

### 6. Mobile-first / PWA improvements
The manifest exists but the app isn't installable as a full PWA (no service worker, no offline support). Adding offline caching would let organizers enter scores even when the club WiFi is spotty, syncing when connectivity returns.

### 7. Export
- PDF bracket/results for printing and pinning to the noticeboard
- CSV export of match results and standings for external analysis
- Image-shareable leaderboard card (like a social media result card)

### 8. Tournament templates
Most recurring events reuse the same settings (format, courts, points per match). A "save as template" option at tournament creation would save the time of re-entering config every week.

### 9. Notifications
- Email to all players when a tournament they're in is created or a new round is generated
- Push notification (via PWA) when it's your court's turn

### 10. Club / group accounts
Multi-user clubs. An organizer account that holds multiple players from a club, with club-level stats across all members and tournaments. Currently every organizer is siloed; a shared club roster would avoid the same player being registered multiple times across different organizers' accounts.

### 11. Head-to-head page
Dedicated page comparing two players across all shared tournaments: matches together, matches against, win/loss records, points. Data already exists in the player stats API; it just needs a route and UI.

### 12. Waiting list / substitutions
For Americano/Mexicano with 5 or 9 players, one player sits out each round. Currently this is handled by marking that player as a "bye" implicitly (the schedule generator inserts a null player). Explicit waitlist management with fair rotation tracking ("you sat out round 2, so you play next") would be useful for clubs with irregular attendance.

---

## Technical debt worth noting

- `any` types are used heavily across API routes and components — a typed response layer would prevent subtle bugs as the schema evolves.
- The `setsJson` and `teamsJson` columns are serialised JSON strings in the DB rather than separate models. This works but makes querying/filtering by set scores impossible at the database level.
- Statistics are recomputed from scratch on every request — acceptable now, but will become slow as match history grows. Materialized stats columns on `Player` updated at match-lock time would fix this.
- The Mexicano "next round" function exists in `lib/schedule.ts` but the actual round-by-round flow lives entirely in the frontend component — making it hard to validate or test server-side.
