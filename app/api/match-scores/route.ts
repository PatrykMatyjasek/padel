import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tid");
    if (!tournamentId) {
      return Response.json({ error: "Missing tournamentId" }, { status: 400 });
    }
    const matches = await prisma.matchScore.findMany({
      where: { tournamentId },
      include: { homeTeam: true, awayTeam: true, matchSets: { orderBy: { setIndex: "asc" } } },
    });
    return Response.json(matches);
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tournamentId, homeTeam, awayTeam, homeScore, awayScore } = body;
    if (!tournamentId || !homeTeam?.length || !awayTeam?.length) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }
    const match = await prisma.matchScore.create({
      data: {
        tournamentId,
        homeTeam: { connect: homeTeam.map((id: string) => ({ id })) },
        awayTeam: { connect: awayTeam.map((id: string) => ({ id })) },
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
      },
      include: { homeTeam: true, awayTeam: true },
    });
    return Response.json(match, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create match" }, { status: 500 });
  }
}
