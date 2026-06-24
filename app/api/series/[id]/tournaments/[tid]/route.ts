import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id, tid } = await params;

    const series = await prisma.series.findUnique({ where: { id } });
    if (!series) return Response.json({ error: "Series not found" }, { status: 404 });
    if (series.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    const tournament = await prisma.tournament.findUnique({ where: { id: tid } });
    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    await prisma.tournament.update({
      where: { id: tid },
      data: { seriesId: null },
    });

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to remove tournament from series" }, { status: 500 });
  }
}