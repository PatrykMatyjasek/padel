import { prisma } from "@/lib/prisma";
import { parseSets, setsWon } from "@/lib/classic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.setsJson !== undefined) {
      const sets = parseSets(body.setsJson);
      const [homeScore, awayScore] = setsWon(sets);

      const [updated] = await prisma.$transaction([
        prisma.matchScore.update({
          where: { id },
          data: { setsJson: body.setsJson, homeScore, awayScore, locked: true },
          include: { homeTeam: true, awayTeam: true, matchSets: { orderBy: { setIndex: "asc" } } },
        }),
        prisma.matchSet.deleteMany({ where: { matchId: id } }),
        prisma.matchSet.createMany({
          data: sets.map(([homeGames, awayGames, homeTb, awayTb], setIndex) => ({
            matchId: id,
            setIndex,
            homeGames,
            awayGames,
            homeTb: homeTb ?? null,
            awayTb: awayTb ?? null,
          })),
        }),
      ]);
      return Response.json(updated);
    }

    const updated = await prisma.matchScore.update({
      where: { id },
      data: { homeScore: body.homeScore, awayScore: body.awayScore, locked: true },
      include: { homeTeam: true, awayTeam: true, matchSets: { orderBy: { setIndex: "asc" } } },
    });
    return Response.json(updated);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.matchScore.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
