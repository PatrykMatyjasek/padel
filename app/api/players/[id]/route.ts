import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });
  return Response.json(player);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

  const player = await prisma.player.findUnique({ where: { id } });
  if (!player || player.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.player.update({ where: { id }, data: { name: body.name.trim() } });
  return Response.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player || player.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.player.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
