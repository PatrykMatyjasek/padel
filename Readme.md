# Padel Manager

Tournament management app for padel — create tournaments, register players, generate match schedules, and track scores.

## Features

- **Tournaments** — create Americano or Mexicano format tournaments with configurable courts, points per match, and player count
- **Players** — global player registry; players are reused across tournaments
- **Schedule generation** — automatically generates all matches from the player list (round-robin for Americano, randomised rounds for Mexicano)
- **Score tracking** — enter match scores per match; results update the leaderboard in real time
- **Leaderboard** — live ranking table showing total points scored per player across all matches

## Tech stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Prisma 6](https://www.prisma.io) with SQLite
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) components (Button, Card)

## Getting started

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  page.tsx                          # Home — tournament list, player list, new tournament form
  tournaments/[id]/page.tsx         # Tournament detail — schedule + leaderboard
  api/
    tournaments/                    # GET list, POST create
    tournaments/[id]/               # GET, PUT, DELETE single tournament
    tournaments/[id]/generate-schedule/  # POST — generates all matches from player list
    match-scores/                   # GET by tournament, POST create
    match-scores/[id]/              # PUT update score, DELETE
    players/                        # GET list, POST create
    players/[id]/                   # GET, PUT, DELETE

components/
  PadelTournamentBuilder/   # New tournament form
  TournamentDetails/        # Tournament info header card
  TournamentSchedule/       # Match list with score inputs
  TournamentScoreTable/     # Ranked leaderboard table

lib/
  schedule.ts   # generateAmericano / generateMexicano / calculatePlayerPoints
  utils.ts      # cn() helper

prisma/
  schema.prisma # Player, Tournament, MatchScore models
```

## Tournament formats

**Americano** — fixed rotation round-robin. Every player partners with every other player exactly once. Number of rounds = N − 1 (where N is the player count). Each round generates N/4 matches.

**Mexicano** — randomised rounds. Player pairs are shuffled each round. Number of rounds is configurable at tournament creation.

## Data model

```
Player         — id, name (unique)
Tournament     — id, name, location, startDate, format (AM/MX),
                 courts, pointsPerMatch, mexicanoRounds, isClosed
                 → players (many-to-many)
                 → matchScores
MatchScore     — id, tournamentId, homeTeam (players), awayTeam (players),
                 homeScore, awayScore, locked
```
