/**
 * Backfill teamsJson: convert player name-pairs to player ID-pairs.
 * Safe to re-run — skips tournaments where teamsJson already contains IDs.
 *
 * Usage: node scripts/backfill-teams-json.mjs
 *
 * A row is considered already migrated if the first entry of the first team
 * is a cuid (starts with a lowercase letter and is 25 chars long) rather
 * than a player name.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function looksLikeId(str) {
  // cuid2 IDs are 25 chars; old cuid IDs start with 'c' and are ~25 chars
  return typeof str === "string" && /^[a-z][a-z0-9]{10,}$/.test(str);
}

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { format: "CL", teamsJson: { not: null } },
    include: { players: { select: { id: true, name: true } } },
  });

  console.log(`Found ${tournaments.length} Classic tournaments with teamsJson`);

  let migrated = 0;
  let alreadyDone = 0;
  let failed = 0;

  for (const t of tournaments) {
    let teams;
    try {
      teams = JSON.parse(t.teamsJson);
    } catch {
      console.warn(`  Skipping tournament ${t.id} (${t.name}) — invalid teamsJson`);
      failed++;
      continue;
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      failed++;
      continue;
    }

    const firstEntry = teams[0]?.[0];
    if (looksLikeId(firstEntry)) {
      alreadyDone++;
      continue;
    }

    const nameToId = new Map(t.players.map(p => [p.name, p.id]));
    const converted = teams.map(pair =>
      pair.map(name => nameToId.get(name)).filter(Boolean)
    ).filter(ids => ids.length === 2);

    if (converted.length !== teams.length) {
      console.warn(
        `  Tournament ${t.id} (${t.name}): could only resolve ${converted.length}/${teams.length} teams — skipping`
      );
      failed++;
      continue;
    }

    await prisma.tournament.update({
      where: { id: t.id },
      data: { teamsJson: JSON.stringify(converted) },
    });

    migrated++;
    console.log(`  Migrated tournament ${t.id} (${t.name})`);
  }

  console.log(`Done. Migrated: ${migrated}, Already done: ${alreadyDone}, Failed: ${failed}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
