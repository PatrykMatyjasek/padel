-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "courts" INTEGER NOT NULL,
    "pointsPerMatch" INTEGER NOT NULL,
    "mexicanoRounds" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "teamsJson" TEXT,
    "numGroups" INTEGER,
    "advancePerGroup" INTEGER,
    "setsToWin" INTEGER,
    "consolationBracket" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "name" TEXT,
    "email" TEXT,
    "page" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MatchScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "setsJson" TEXT,
    "phase" TEXT,
    "groupName" TEXT,
    "bracketRound" TEXT,
    "bracketSlot" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchScore_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TournamentPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TournamentPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TournamentPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_HomePlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_HomePlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "MatchScore" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_HomePlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AwayPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AwayPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "MatchScore" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AwayPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_shareToken_key" ON "Tournament"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "_TournamentPlayers_AB_unique" ON "_TournamentPlayers"("A", "B");

-- CreateIndex
CREATE INDEX "_TournamentPlayers_B_index" ON "_TournamentPlayers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HomePlayers_AB_unique" ON "_HomePlayers"("A", "B");

-- CreateIndex
CREATE INDEX "_HomePlayers_B_index" ON "_HomePlayers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AwayPlayers_AB_unique" ON "_AwayPlayers"("A", "B");

-- CreateIndex
CREATE INDEX "_AwayPlayers_B_index" ON "_AwayPlayers"("B");
