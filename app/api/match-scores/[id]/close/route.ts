import { prisma } from "@/lib/prisma";
import { computeTournamentPlayerStats } from "@/lib/player-stats";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { format: true },
    });
    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });

    await prisma.tournament.update({ where: { id }, data: { isClosed: true } });

    // ADR-001: write PlayerStat snapshot on close
    await prisma.playerStat.deleteMany({ where: { tournamentId: id } });
    const stats = await computeTournamentPlayerStats(id);
    if (stats.length > 0) {
      await prisma.playerStat.createMany({
        data: stats.map((s) => ({
          playerId: s.playerId,
          tournamentId: id,
          format: tournament.format,
          points: s.points,
          matches: s.matches,
          wins: s.wins,
          rank: s.rank,
          isWinner: s.isWinner,
          isPodium: s.isPodium,
        })),
      });
    }

    return Response.json({ isClosed: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}