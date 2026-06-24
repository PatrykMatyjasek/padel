import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Public tables:", result);

  const migrationTable = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = '_prisma_migrations';
  `);
  console.log("Migration table exists:", migrationTable.length > 0);

  if (migrationTable.length > 0) {
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at;
    `);
    console.log("Migrations:", migrations);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
