import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json([]);

  const players = await prisma.player.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });
  return Response.json(players);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to manage players" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.player.findFirst({
    where: { name: body.name.trim(), userId: session.user.id },
  });
  if (existing) {
    return Response.json({ error: "Player already exists" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: { name: body.name.trim(), userId: session.user.id },
  });
  return Response.json(player, { status: 201 });
}
