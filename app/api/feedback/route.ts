import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });

    await prisma.feedback.create({
      data: {
        message: message.slice(0, 2000),
        rating: typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5 ? body.rating : null,
        name: typeof body.name === "string" ? body.name.trim().slice(0, 100) || null : null,
        email: typeof body.email === "string" ? body.email.trim().slice(0, 200) || null : null,
        page: typeof body.page === "string" ? body.page.slice(0, 255) || null : null,
        userId: session?.user?.id ?? null,
      },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Response.json(feedback);
}
