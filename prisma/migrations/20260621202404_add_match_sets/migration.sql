-- CreateTable
CREATE TABLE "public"."MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "homeGames" INTEGER NOT NULL,
    "awayGames" INTEGER NOT NULL,
    "homeTb" INTEGER,
    "awayTb" INTEGER,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setIndex_key" ON "public"."MatchSet"("matchId", "setIndex");

-- AddForeignKey
ALTER TABLE "public"."MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."MatchScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
