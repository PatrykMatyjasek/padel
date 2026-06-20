import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/login`, lastModified: now, priority: 0.3 },
    { url: `${siteUrl}/register`, lastModified: now, priority: 0.3 },
  ];

  let tournamentRoutes: MetadataRoute.Sitemap = [];
  let playerRoutes: MetadataRoute.Sitemap = [];

  try {
    const tournaments = await prisma.tournament.findMany({
      select: { id: true, updatedAt: true },
    });
    tournamentRoutes = tournaments.map((t) => ({
      url: `${siteUrl}/tournaments/${t.id}`,
      lastModified: t.updatedAt,
      priority: 0.8,
    }));

    const players = await prisma.player.findMany({
      select: { id: true, updatedAt: true },
    });
    playerRoutes = players.map((p) => ({
      url: `${siteUrl}/players/${p.id}`,
      lastModified: p.updatedAt,
      priority: 0.6,
    }));
  } catch {
    // Prisma may not be available during local builds without DB.
    // Static routes still returned; dynamic data added in production.
  }

  return [...staticRoutes, ...tournamentRoutes, ...playerRoutes];
}
