import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import ClientPage from "./ClientPage";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.player.findUnique({ where: { id } });
  if (!p) return { title: "Player not found | Padel Manager" };
  return {
    title: `${p.name} — Player Profile | Padel Manager`,
    description: `View stats and tournament history for ${p.name}.`,
    openGraph: { title: p.name, description: `Player stats for ${p.name}` },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientPage id={id} />;
}