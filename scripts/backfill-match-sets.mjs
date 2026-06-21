/**
 * Backfill MatchSet rows from existing setsJson data.
 * Safe to re-run — uses upsert on (matchId, setIndex).
 *
 * Usage: node scripts/backfill-match-sets.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.matchScore.findMany({
    where: { setsJson: { not: null } },
    select: { id: true, setsJson: true },
  });

  console.log(`Found ${matches.length} matches with setsJson`);

  let populated = 0;
  let skipped = 0;

  for (const match of matches) {
    let sets;
    try {
      sets = JSON.parse(match.setsJson);
    } catch {
      console.warn(`  Skipping match ${match.id} — invalid setsJson`);
      skipped++;
      continue;
    }

    if (!Array.isArray(sets) || sets.length === 0) {
      skipped++;
      continue;
    }

    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const [homeGames, awayGames, homeTb, awayTb] = sets[setIndex];
      await prisma.matchSet.upsert({
        where: { matchId_setIndex: { matchId: match.id, setIndex } },
        create: {
          matchId: match.id,
          setIndex,
          homeGames,
          awayGames,
          homeTb: homeTb ?? null,
          awayTb: awayTb ?? null,
        },
        update: {
          homeGames,
          awayGames,
          homeTb: homeTb ?? null,
          awayTb: awayTb ?? null,
        },
      });
    }

    populated++;
    if (populated % 50 === 0) console.log(`  Processed ${populated} matches…`);
  }

  console.log(`Done. Populated: ${populated}, Skipped: ${skipped}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
