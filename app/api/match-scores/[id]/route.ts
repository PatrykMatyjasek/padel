import { prisma } from "@/lib/prisma";
import { parseSets, setsWon } from "@/lib/classic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    let data: any;

    if (body.setsJson !== undefined) {
      // Tennis scoring (Classic format)
      const sets = parseSets(body.setsJson);
      const [homeScore, awayScore] = setsWon(sets);
      data = { setsJson: body.setsJson, homeScore, awayScore, locked: true };
    } else {
      data = { homeScore: body.homeScore, awayScore: body.awayScore, locked: true };
    }

    const updated = await prisma.matchScore.update({
      where: { id },
      data,
      include: { homeTeam: true, awayTeam: true },
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
