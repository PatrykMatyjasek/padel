import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(`
    SELECT "migration_name" FROM "_prisma_migrations" WHERE "migration_name" = '20260624_add_player_stat' LIMIT 1;
  `);
  if (exists.length > 0) {
    console.log("Migration already marked");
    return;
  }
  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
    VALUES (
      gen_random_uuid(),
      '',
      NOW(),
      '20260624_add_player_stat',
      '',
      NULL,
      NOW(),
      1
    );
  `);
  console.log("Migration marked as applied");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
