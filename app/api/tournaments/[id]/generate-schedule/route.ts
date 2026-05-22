import { prisma } from "@/lib/prisma";
import { generateAmericano, generateAmericanoFlex, generateMexicanoRound1, generateGroupRoundRobin } from "@/lib/schedule";
import { parseTeams, divideIntoGroups } from "@/lib/classic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { players: true, matchScores: { take: 1 } },
    });

    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.isClosed) {
      return Response.json({ error: "Tournament is closed" }, { status: 400 });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    if (tournament.matchScores.length > 0) {
      if (!force) {
        return Response.json({ error: "Schedule already generated" }, { status: 400 });
      }
      await prisma.matchScore.deleteMany({ where: { tournamentId: id } });
    }

    const players = tournament.players;
    const created: any[] = [];

    if (tournament.format === "CL") {
      // Classic: fixed-team group round-robin
      const rawTeams = parseTeams((tournament as any).teamsJson);
      if (rawTeams.length < 2) return Response.json({ error: "No teams defined" }, { status: 400 });
      const numGroups = (tournament as any).numGroups ?? 1;
      const groups = divideIntoGroups(rawTeams, numGroups);

      for (const group of groups) {
        // Map team name-pairs to player objects
        const teamObjects = group.teams.map((names: string[]) =>
          names.map((name: string) => players.find((p: any) => p.name === name)).filter(Boolean)
        ).filter((t: any[]) => t.length === 2);

        const rounds = generateGroupRoundRobin(teamObjects);
        for (let ri = 0; ri < rounds.length; ri++) {
          for (const match of rounds[ri]) {
            const [t1, t2]: [any[], any[]] = match.teams;
            const m = await prisma.matchScore.create({
              data: {
                tournamentId: id,
                round: ri + 1,
                phase: "group",
                groupName: group.name,
                homeTeam: { connect: t1.map((p: any) => ({ id: p.id })) },
                awayTeam: { connect: t2.map((p: any) => ({ id: p.id })) },
                homeScore: 0,
                awayScore: 0,
              },
              include: { homeTeam: true, awayTeam: true },
            });
            created.push(m);
          }
        }
      }
    } else {
      let rounds: any[][];
      try {
        if (tournament.format === "AM") {
          rounds = players.length % 2 !== 0
            ? generateAmericanoFlex(players)
            : generateAmericano(players);
        } else {
          rounds = [generateMexicanoRound1(players)];
        }
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }

      for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
        for (const match of rounds[roundIdx]) {
          const [team1, team2]: [any[], any[]] = match.teams;
          const m = await prisma.matchScore.create({
            data: {
              tournamentId: id,
              round: roundIdx + 1,
              homeTeam: { connect: team1.map((p: any) => ({ id: p.id })) },
              awayTeam: { connect: team2.map((p: any) => ({ id: p.id })) },
              homeScore: 0,
              awayScore: 0,
            },
            include: { homeTeam: true, awayTeam: true },
          });
          created.push(m);
        }
      }
    }

    return Response.json(created, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
