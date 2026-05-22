import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PlayerAgg = {
  name: string;
  points: number;
  matches: number;
  wins: number;
  tournamentWins: number;
  podiums: number;
  _tournamentIds: Set<string>;
};

function computeStats(tournaments: any[]) {
  const playerStats: Record<string, PlayerAgg> = {};

  const ensure = (id: string, name: string) => {
    if (!playerStats[id]) {
      playerStats[id] = { name, points: 0, matches: 0, wins: 0, tournamentWins: 0, podiums: 0, _tournamentIds: new Set() };
    }
  };

  for (const tournament of tournaments) {
    const tournamentPoints: Record<string, number> = {};
    for (const p of tournament.players) {
      tournamentPoints[p.id] = 0;
      ensure(p.id, p.name);
    }

    for (const match of tournament.matchScores) {
      const homeWon = match.homeScore > match.awayScore;
      const awayWon = match.awayScore > match.homeScore;

      for (const p of match.homeTeam) {
        ensure(p.id, p.name);
        playerStats[p.id].points += match.homeScore;
        playerStats[p.id].matches += 1;
        if (homeWon) playerStats[p.id].wins += 1;
        playerStats[p.id]._tournamentIds.add(tournament.id);
        tournamentPoints[p.id] = (tournamentPoints[p.id] ?? 0) + match.homeScore;
      }
      for (const p of match.awayTeam) {
        ensure(p.id, p.name);
        playerStats[p.id].points += match.awayScore;
        playerStats[p.id].matches += 1;
        if (awayWon) playerStats[p.id].wins += 1;
        playerStats[p.id]._tournamentIds.add(tournament.id);
        tournamentPoints[p.id] = (tournamentPoints[p.id] ?? 0) + match.awayScore;
      }
    }

    if (!tournament.isClosed || tournament.matchScores.length === 0) continue;

    const ranked = Object.entries(tournamentPoints)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([id]) => id);

    ranked.forEach((id, i) => {
      if (!playerStats[id]) return;
      if (i === 0) playerStats[id].tournamentWins += 1;
      if (i < 3) playerStats[id].podiums += 1;
    });
  }

  const players = Object.entries(playerStats)
    .map(([id, s]) => ({
      id,
      name: s.name,
      points: s.points,
      matches: s.matches,
      wins: s.wins,
      tournamentWins: s.tournamentWins,
      podiums: s.podiums,
      tournamentsPlayed: s._tournamentIds.size,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  const totalMatches = tournaments.reduce((sum, t) => sum + t.matchScores.length, 0);

  return {
    totals: { tournaments: tournaments.length, matchesPlayed: totalMatches },
    players,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const tournaments = await prisma.tournament.findMany({
    where: { userId },
    include: {
      players: true,
      matchScores: {
        where: { locked: true },
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });

  const playerCount = await prisma.player.count({ where: { userId } });

  const all = computeStats(tournaments);
  const am = computeStats(tournaments.filter((t) => t.format === "AM"));
  const mx = computeStats(tournaments.filter((t) => t.format === "MX"));
  const cl = computeStats(tournaments.filter((t) => t.format === "CL"));

  return Response.json({
    totals: { ...all.totals, players: playerCount },
    players: all.players,
    byFormat: { AM: am, MX: mx, CL: cl },
  });
}
