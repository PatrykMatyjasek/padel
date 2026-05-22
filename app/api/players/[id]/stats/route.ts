import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player || player.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [homeMatches, awayMatches] = await Promise.all([
    prisma.matchScore.findMany({
      where: { locked: true, homeTeam: { some: { id } }, tournament: { userId: session.user.id } },
      include: { homeTeam: true, awayTeam: true, tournament: true },
    }),
    prisma.matchScore.findMany({
      where: { locked: true, awayTeam: { some: { id } }, tournament: { userId: session.user.id } },
      include: { homeTeam: true, awayTeam: true, tournament: true },
    }),
  ]);

  type MatchEntry = {
    match: any;
    myScore: number;
    oppScore: number;
    myTeam: any[];
    oppTeam: any[];
  };

  const allMatches: MatchEntry[] = [
    ...homeMatches.map((m) => ({
      match: m,
      myScore: m.homeScore,
      oppScore: m.awayScore,
      myTeam: m.homeTeam,
      oppTeam: m.awayTeam,
    })),
    ...awayMatches.map((m) => ({
      match: m,
      myScore: m.awayScore,
      oppScore: m.homeScore,
      myTeam: m.awayTeam,
      oppTeam: m.homeTeam,
    })),
  ];

  let totalPoints = 0;
  let totalWins = 0;
  const tournamentIds = new Set<string>();
  const partnerStats: Record<string, { name: string; matches: number; wins: number; points: number }> = {};
  const rivalStats: Record<string, { name: string; matches: number; wins: number; points: number }> = {};

  for (const { match, myScore, oppScore, myTeam, oppTeam } of allMatches) {
    totalPoints += myScore;
    const won = myScore > oppScore;
    if (won) totalWins++;
    tournamentIds.add(match.tournamentId);

    for (const p of myTeam) {
      if (p.id === id) continue;
      if (!partnerStats[p.id]) partnerStats[p.id] = { name: p.name, matches: 0, wins: 0, points: 0 };
      partnerStats[p.id].matches++;
      if (won) partnerStats[p.id].wins++;
      partnerStats[p.id].points += myScore;
    }

    for (const p of oppTeam) {
      if (!rivalStats[p.id]) rivalStats[p.id] = { name: p.name, matches: 0, wins: 0, points: 0 };
      rivalStats[p.id].matches++;
      if (won) rivalStats[p.id].wins++;
      rivalStats[p.id].points += myScore;
    }
  }

  // Tournament wins/podiums from closed tournaments
  const allTournamentIds = Array.from(tournamentIds);
  const closedTournaments = await prisma.tournament.findMany({
    where: { userId: session.user.id, isClosed: true, id: { in: allTournamentIds } },
    include: {
      matchScores: { where: { locked: true }, include: { homeTeam: true, awayTeam: true } },
    },
  });

  let tournamentWins = 0;
  let podiums = 0;
  const tournamentHistory: any[] = [];
  const closedIds = new Set(closedTournaments.map((t) => t.id));

  for (const t of closedTournaments) {
    if (t.matchScores.length === 0) continue;
    const pts: Record<string, number> = {};
    for (const m of t.matchScores) {
      m.homeTeam.forEach((p: any) => { pts[p.id] = (pts[p.id] ?? 0) + m.homeScore; });
      m.awayTeam.forEach((p: any) => { pts[p.id] = (pts[p.id] ?? 0) + m.awayScore; });
    }
    const ranked = Object.entries(pts).sort(([, a], [, b]) => b - a).map(([pid]) => pid);
    const rank = ranked.indexOf(id) + 1;
    if (rank === 1) tournamentWins++;
    if (rank >= 1 && rank <= 3) podiums++;
    tournamentHistory.push({ id: t.id, name: t.name, rank, points: pts[id] ?? 0, isClosed: true });
  }

  // Open tournaments
  const openIds = allTournamentIds.filter((tid) => !closedIds.has(tid));
  if (openIds.length > 0) {
    const openTournaments = await prisma.tournament.findMany({
      where: { id: { in: openIds } },
      include: {
        matchScores: { where: { locked: true }, include: { homeTeam: true, awayTeam: true } },
      },
    });
    for (const t of openTournaments) {
      const pts: Record<string, number> = {};
      for (const m of t.matchScores) {
        m.homeTeam.forEach((p: any) => { pts[p.id] = (pts[p.id] ?? 0) + m.homeScore; });
        m.awayTeam.forEach((p: any) => { pts[p.id] = (pts[p.id] ?? 0) + m.awayScore; });
      }
      tournamentHistory.push({ id: t.id, name: t.name, rank: null, points: pts[id] ?? 0, isClosed: false });
    }
  }

  const partners = Object.entries(partnerStats)
    .map(([pid, s]) => ({ id: pid, ...s, winRate: s.matches > 0 ? s.wins / s.matches : 0 }))
    .sort((a, b) => b.matches - a.matches);

  const rivals = Object.entries(rivalStats)
    .map(([pid, s]) => ({ id: pid, ...s, winRate: s.matches > 0 ? s.wins / s.matches : 0 }))
    .sort((a, b) => b.matches - a.matches);

  return Response.json({
    player: { id: player.id, name: player.name },
    stats: {
      points: totalPoints,
      matches: allMatches.length,
      wins: totalWins,
      winRate: allMatches.length > 0 ? totalWins / allMatches.length : 0,
      tournamentsPlayed: tournamentIds.size,
      tournamentWins,
      podiums,
    },
    partners,
    rivals,
    tournaments: tournamentHistory.sort((a, b) => {
      if (a.isClosed !== b.isClosed) return a.isClosed ? -1 : 1;
      return (a.rank ?? 999) - (b.rank ?? 999);
    }),
  });
}
