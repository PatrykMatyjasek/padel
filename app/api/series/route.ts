import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const series = await prisma.series.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { tournaments: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(series);
  } catch (err) {
    console.error("GET /api/series error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const series = await prisma.series.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        pointsRule: body.pointsRule ?? "all",
        topN: body.topN ? Number(body.topN) : null,
        dropWorst: body.dropWorst ? Number(body.dropWorst) : null,
        shareToken: crypto.randomUUID(),
        userId: session.user.id,
      },
    });

    return Response.json(series, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/series error:", err);
    return Response.json({ error: err?.message ?? "Failed to create series" }, { status: 500 });
  }
}