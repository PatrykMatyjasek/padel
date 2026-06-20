import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import ClientPage from "./ClientPage";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: { players: { select: { name: true } } },
  });
  if (!t) return { title: "Tournament not found | Padel Manager" };
  const fmt = t.format === "AM" ? "Americano" : t.format === "MX" ? "Mexicano" : "Classic";
  const names = t.players.map((p) => p.name).join(", ");
  const desc = `${t.name} — ${fmt} padel tournament${t.location ? ` in ${t.location}` : ""}. Players: ${names}. ${t.isClosed ? "Completed." : "In progress."}`;
  return {
    title: `${t.name} (${fmt}) | Padel Manager`,
    description: desc,
    openGraph: { title: t.name, description: desc },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientPage id={id} />;
}