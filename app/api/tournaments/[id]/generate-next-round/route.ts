import { prisma } from "@/lib/prisma";
import { generateMexicanoNextRound } from "@/lib/schedule";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: true,
        matchScores: { include: { homeTeam: true, awayTeam: true } },
      },
    });

    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.isClosed) return Response.json({ error: "Tournament is closed" }, { status: 400 });
    if (tournament.format !== "MX") return Response.json({ error: "Only Mexicano tournaments support this" }, { status: 400 });

    const maxRound = tournament.matchScores.reduce((max, m) => Math.max(max, m.round), 0);

    if (maxRound === 0) return Response.json({ error: "No rounds exist yet — generate the schedule first" }, { status: 400 });
    if (maxRound >= tournament.mexicanoRounds) return Response.json({ error: "All rounds already generated" }, { status: 400 });

    const currentRoundMatches = tournament.matchScores.filter((m) => m.round === maxRound);
    const allLocked = currentRoundMatches.every((m) => m.locked);
    if (!allLocked) return Response.json({ error: "Current round is not complete yet" }, { status: 400 });

    // Compute cumulative points per player from all locked matches
    const pointsMap: Record<string, number> = {};
    tournament.players.forEach((p) => { pointsMap[p.id] = 0; });
    tournament.matchScores.forEach((m) => {
      if (!m.locked) return;
      m.homeTeam.forEach((p) => { pointsMap[p.id] = (pointsMap[p.id] ?? 0) + m.homeScore; });
      m.awayTeam.forEach((p) => { pointsMap[p.id] = (pointsMap[p.id] ?? 0) + m.awayScore; });
    });

    const rankedPlayers = [...tournament.players].sort((a, b) => (pointsMap[b.id] ?? 0) - (pointsMap[a.id] ?? 0));
    const nextRoundMatches = generateMexicanoNextRound(rankedPlayers);
    const nextRound = maxRound + 1;

    const created: any[] = [];
    for (const match of nextRoundMatches) {
      const [team1, team2]: [any[], any[]] = match.teams;
      const m = await prisma.matchScore.create({
        data: {
          tournamentId: id,
          round: nextRound,
          homeTeam: { connect: team1.map((p: any) => ({ id: p.id })) },
          awayTeam: { connect: team2.map((p: any) => ({ id: p.id })) },
          homeScore: 0,
          awayScore: 0,
        },
        include: { homeTeam: true, awayTeam: true },
      });
      created.push(m);
    }

    return Response.json(created, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
