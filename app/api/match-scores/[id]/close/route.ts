import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const closed = await prisma.tournament.update({
      where: { id },
      data: { isClosed: true },
    });
    return Response.json(closed);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
