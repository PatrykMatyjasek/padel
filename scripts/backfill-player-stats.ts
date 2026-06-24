import { computeTournamentPlayerStats, buildPlayerStatRows } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { isClosed: true },
    select: { id: true, format: true },
  });

  console.log(`Found ${tournaments.length} closed tournaments to backfill`);

  for (const t of tournaments) {
    // Delete any existing rows (idempotent)
    await prisma.playerStat.deleteMany({ where: { tournamentId: t.id } });

    const stats = await computeTournamentPlayerStats(t.id);
    if (stats.length === 0) {
      console.log(`Skipping ${t.id} — no locked matches`);
      continue;
    }

    await prisma.playerStat.createMany({
      data: buildPlayerStatRows(t.id, t.format, stats),
    });
    console.log(`Backfilled ${t.id}: ${stats.length} players`);
  }

  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});