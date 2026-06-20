import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import ClientPage from "./ClientPage";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const t = await prisma.tournament.findUnique({
    where: { shareToken: token },
    include: { players: { select: { name: true } } },
  });
  if (!t) return { title: "Shared tournament not found | Padel Manager" };
  const fmt = t.format === "AM" ? "Americano" : t.format === "MX" ? "Mexicano" : "Classic";
  const names = t.players.map((p) => p.name).join(", ");
  return {
    title: `${t.name} — Shared ${fmt} | Padel Manager`,
    description: `Shared ${fmt} padel tournament: ${t.name}. Players: ${names}.`,
    openGraph: { title: t.name, description: `Shared ${fmt} padel tournament: ${t.name}` },
  };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClientPage token={token} />;
}