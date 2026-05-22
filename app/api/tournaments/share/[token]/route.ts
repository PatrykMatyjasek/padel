import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { shareToken: token },
    include: {
      players: true,
      matchScores: {
        include: { homeTeam: true, awayTeam: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tournament) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(tournament);
}
