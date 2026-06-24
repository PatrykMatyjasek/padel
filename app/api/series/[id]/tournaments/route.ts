import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const series = await prisma.series.findUnique({ where: { id } });
    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });
    if (series.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const tournament = await prisma.tournament.findUnique({
      where: { id: body.tournamentId },
    });
    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.tournament.update({
      where: { id: body.tournamentId },
      data: { seriesId: id },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Failed to add tournament to series" }, { status: 500 });
  }
}