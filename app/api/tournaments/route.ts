import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const tournaments = await prisma.tournament.findMany({
      where: userId ? { userId } : { userId: null },
      include: {
        players: true,
        matchScores: {
          select: { id: true, homeScore: true, awayScore: true, locked: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(tournaments);
  } catch (err) {
    console.error("GET /api/tournaments error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const body = await req.json();

    const playerNames: string[] = Array.isArray(body.players)
      ? body.players.map((p: any) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
      : [];

    // Resolve player IDs: for logged-in users find-or-create per user;
    // for guests create fresh records with no userId
    let playerConnects: { id: string }[] = [];
    if (playerNames.length > 0) {
      if (userId) {
        playerConnects = await Promise.all(
          playerNames.map(async (name) => {
            const existing = await prisma.player.findFirst({ where: { name, userId } });
            if (existing) return { id: existing.id };
            const created = await prisma.player.create({ data: { name, userId } });
            return { id: created.id };
          })
        );
      } else {
        const created = await prisma.player.createManyAndReturn({
          data: playerNames.map((name) => ({ name, userId: null })),
        });
        playerConnects = created.map((p) => ({ id: p.id }));
      }
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: body.name,
        location: body.location ?? "",
        format: body.format ?? "AM",
        courts: Number(body.courts) || (playerNames.length ? Math.ceil(playerNames.length / 4) : 1),
        pointsPerMatch: Number(body.pointsPerMatch) || 21,
        mexicanoRounds: Number(body.mexicanoRounds) || 5,
        numGroups: body.numGroups ? Number(body.numGroups) : null,
        advancePerGroup: body.advancePerGroup ? Number(body.advancePerGroup) : null,
        setsToWin: body.setsToWin ? Number(body.setsToWin) : null,
        consolationBracket: body.consolationBracket === true,
        teamsJson: body.teamsJson ?? null,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        shareToken: crypto.randomUUID(),
        userId,
        players: playerConnects.length > 0 ? { connect: playerConnects } : undefined,
      },
      include: { players: true },
    });

    return Response.json(tournament, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tournaments error:", err);
    return Response.json({ error: err?.message ?? "Failed to create tournament" }, { status: 500 });
  }
}
