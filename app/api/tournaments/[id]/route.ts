import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: true,
        matchScores: {
          include: { homeTeam: true, awayTeam: true, matchSets: { orderBy: { setIndex: "asc" } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
    return Response.json(tournament);
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tournament.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return Response.json({ error: "Not found" }, { status: 404 });
    if (tournament.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    // Handle seriesId if provided
    let seriesId = tournament.seriesId;
    if (body.seriesId !== undefined) {
      if (body.seriesId !== null) {
        const targetSeries = await prisma.series.findUnique({ where: { id: body.seriesId } });
        if (!targetSeries || targetSeries.userId !== session.user.id) {
          return Response.json({ error: "Series not found or not yours" }, { status: 400 });
        }
        seriesId = body.seriesId;
      } else {
        seriesId = null;
      }
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { isClosed: body.isClosed, seriesId },
    });

    // ADR-001: sync PlayerStat snapshot on close/reopen
    if (body.isClosed === true) {
      // 1. Delete any stale rows
      await prisma.playerStat.deleteMany({ where: { tournamentId: id } });
      // 2. Import and compute
      const { computeTournamentPlayerStats } = await import("@/lib/player-stats");
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
    } else if (body.isClosed === false) {
      await prisma.playerStat.deleteMany({ where: { tournamentId: id } });
    }

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, location, startDate, format, courts, pointsPerMatch, mexicanoRounds, players } = body;
    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        location,
        startDate: new Date(startDate),
        format,
        courts,
        pointsPerMatch,
        mexicanoRounds,
        players: { set: players.map((pid: string) => ({ id: pid })) },
      },
      include: { players: true, matchScores: true },
    });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}
