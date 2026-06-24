-- CreateTable
CREATE TABLE "public"."PlayerStat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "matches" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "isPodium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerStat_tournamentId_idx" ON "public"."PlayerStat"("tournamentId");

-- CreateIndex
CREATE INDEX "PlayerStat_playerId_idx" ON "public"."PlayerStat"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStat_playerId_tournamentId_key" ON "public"."PlayerStat"("playerId", "tournamentId");

-- AddForeignKey
ALTER TABLE "public"."PlayerStat" ADD CONSTRAINT "PlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStat" ADD CONSTRAINT "PlayerStat_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
