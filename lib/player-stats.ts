import { prisma } from "./prisma";

export async function computeTournamentPlayerStats(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
      matchScores: {
        where: { locked: true },
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });

  if (!tournament) return [];

  const playerStats = new Map<string, { id: string; name: string; points: number; matches: number; wins: number }>();

  for (const match of tournament.matchScores) {
    const homeWon = match.homeScore > match.awayScore;
    const awayWon = match.awayScore > match.homeScore;

    for (const p of match.homeTeam) {
      const s = playerStats.get(p.id) || { id: p.id, name: p.name, points: 0, matches: 0, wins: 0 };
      s.points += match.homeScore;
      s.matches += 1;
      if (homeWon) s.wins += 1;
      playerStats.set(p.id, s);
    }
    for (const p of match.awayTeam) {
      const s = playerStats.get(p.id) || { id: p.id, name: p.name, points: 0, matches: 0, wins: 0 };
      s.points += match.awayScore;
      s.matches += 1;
      if (awayWon) s.wins += 1;
      playerStats.set(p.id, s);
    }
  }

  const ranked = Array.from(playerStats.values()).sort((a, b) => b.points - a.points || b.wins - a.wins);

  return ranked.map((s, i) => ({
    playerId: s.id,
    name: s.name,
    points: s.points,
    matches: s.matches,
    wins: s.wins,
    rank: i + 1,
    isWinner: i === 0,
    isPodium: i < 3,
  }));
}

// Mark the exported function as a server action
export const computeTournamentPlayerStatsServerAction = Object.assign(
  computeTournamentPlayerStats,
  { "use server": "" }
);

export function buildPlayerStatRows(
  tournamentId: string,
  format: string,
  stats: Awaited<ReturnType<typeof computeTournamentPlayerStats>>,
) {
  return stats.map((s) => ({
    playerId: s.playerId,
    tournamentId,
    format,
    points: s.points,
    matches: s.matches,
    wins: s.wins,
    rank: s.rank,
    isWinner: s.isWinner,
    isPodium: s.isPodium,
  }));
}