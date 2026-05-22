import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {

  const [userCount, tournamentCount, activeCount, matchCount, playerCount, totalViews] =
    await Promise.all([
      prisma.user.count(),
      prisma.tournament.count(),
      prisma.tournament.count({ where: { isClosed: false } }),
      prisma.matchScore.count({ where: { locked: true } }),
      prisma.player.count({ where: { userId: { not: null } } }),
      prisma.pageView.count(),
    ]);

  // Daily activity for the last 14 days
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [recentViews, recentUsers, recentTournaments] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, userId: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: { select: { name: true } },
        _count: { select: { players: true, matchScores: true } },
      },
    }),
  ]);

  const recentSignups = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  // Build 14-day buckets
  const days: Record<string, { views: number; uniqueUsers: Set<string | null>; signups: number }> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days[key] = { views: 0, uniqueUsers: new Set(), signups: 0 };
  }

  for (const v of recentViews) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (days[key]) {
      days[key].views++;
      days[key].uniqueUsers.add(v.userId ?? "guest");
    }
  }

  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (days[key]) days[key].signups++;
  }

  const daily = Object.entries(days).map(([date, d]) => ({
    date,
    views: d.views,
    uniqueVisitors: d.uniqueUsers.size,
    signups: d.signups,
  }));

  // Top pages
  const pathCounts: Record<string, number> = {};
  for (const v of recentViews) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (days[key]) {
      pathCounts[v.createdAt.toISOString()] = (pathCounts[v.createdAt.toISOString()] ?? 0);
    }
  }

  // Fetch all views for top pages
  const allViews = await prisma.pageView.findMany({
    select: { path: true },
  });
  const topPages: Record<string, number> = {};
  for (const v of allViews) {
    topPages[v.path] = (topPages[v.path] ?? 0) + 1;
  }
  const topPagesList = Object.entries(topPages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return Response.json({
    totals: {
      users: userCount,
      tournaments: tournamentCount,
      activeTournaments: activeCount,
      matchesPlayed: matchCount,
      players: playerCount,
      pageViews: totalViews,
    },
    daily,
    topPages: topPagesList,
    recentSignups,
    recentTournaments: recentTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      isClosed: t.isClosed,
      format: t.format,
      createdAt: t.createdAt,
      ownerName: t.user?.name ?? "Guest",
      playerCount: t._count.players,
      matchCount: t._count.matchScores,
    })),
  });

  } catch (err: any) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
