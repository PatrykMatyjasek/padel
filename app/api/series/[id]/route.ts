import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const series = await prisma.series.findUnique({
      where: { id },
      include: { tournaments: { where: { isClosed: true }, orderBy: { startDate: "asc" } } },
    });

    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });
    if (series.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const tournamentIds = series.tournaments.map((t) => t.id);

    const playerStatRows = tournamentIds.length > 0
      ? await prisma.playerStat.findMany({
          where: { tournamentId: { in: tournamentIds } },
          include: { player: true },
        })
      : [];

    // Group PlayerStat by player
    const agg = new Map<string, { name: string; tournamentPoints: number[] }>();
    for (const row of playerStatRows) {
      if (!agg.has(row.playerId)) {
        agg.set(row.playerId, { name: row.player.name, tournamentPoints: [] });
      }
      agg.get(row.playerId)!.tournamentPoints.push(row.points);
    }

    // Apply points rule
    const standings = Array.from(agg.entries()).map(([playerId, data]) => {
      let points: number;
      const sorted = [...data.tournamentPoints].sort((a, b) => b - a);
      if (series.pointsRule === "top_n" && series.topN) {
        points = sorted.slice(0, series.topN).reduce((a, b) => a + b, 0);
      } else if (series.pointsRule === "drop_worst" && series.dropWorst) {
        points = sorted.slice(0, sorted.length - series.dropWorst).reduce((a, b) => a + b, 0);
      } else {
        points = sorted.reduce((a, b) => a + b, 0);
      }
      return { id: playerId, name: data.name, points, tournamentsPlayed: data.tournamentPoints.length };
    }).sort((a, b) => b.points - a.points);

    return Response.json({ series, standings, tournaments: series.tournaments });
  } catch (err) {
    console.error("GET /api/series/[id] error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const series = await prisma.series.findUnique({ where: { id } });
    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });
    if (series.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.series.update({
      where: { id },
      data: {
        name: body.name ?? series.name,
        description: body.description !== undefined ? body.description : series.description,
        pointsRule: body.pointsRule ?? series.pointsRule,
        topN: body.topN !== undefined ? (body.topN ? Number(body.topN) : null) : series.topN,
        dropWorst: body.dropWorst !== undefined ? (body.dropWorst ? Number(body.dropWorst) : null) : series.dropWorst,
      },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Failed to update series" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const series = await prisma.series.findUnique({ where: { id } });
    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });
    if (series.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    await prisma.series.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to delete series" }, { status: 500 });
  }
}