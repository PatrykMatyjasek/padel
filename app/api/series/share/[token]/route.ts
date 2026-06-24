import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const series = await prisma.series.findUnique({
      where: { shareToken: token },
      include: { tournaments: { where: { isClosed: true }, orderBy: { startDate: "asc" } } },
    });

    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });

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
    console.error("GET /api/series/share/[token] error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}