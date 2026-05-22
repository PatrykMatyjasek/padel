import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    const session = await getServerSession(authOptions);
    await prisma.pageView.create({
      data: {
        path: typeof path === "string" ? path.slice(0, 255) : "/",
        userId: session?.user?.id ?? null,
      },
    });
  } catch {}
  return new Response(null, { status: 201 });
}
