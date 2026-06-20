import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, password, acceptTerms } = await req.json();

  if (acceptTerms !== true) {
    return Response.json({ error: "You must accept the Terms of Service and Privacy Policy" }, { status: 400 });
  }

  if (!name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase(), password: hashed },
  });

  return Response.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
