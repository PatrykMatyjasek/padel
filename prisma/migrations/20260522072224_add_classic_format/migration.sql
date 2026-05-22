-- AlterTable
ALTER TABLE "public"."MatchScore" ADD COLUMN     "bracketRound" TEXT,
ADD COLUMN     "bracketSlot" INTEGER,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "phase" TEXT,
ADD COLUMN     "setsJson" TEXT;

-- AlterTable
ALTER TABLE "public"."Tournament" ADD COLUMN     "advancePerGroup" INTEGER,
ADD COLUMN     "consolationBracket" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numGroups" INTEGER,
ADD COLUMN     "setsToWin" INTEGER,
ADD COLUMN     "teamsJson" TEXT;
