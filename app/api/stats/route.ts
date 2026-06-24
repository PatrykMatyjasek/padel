import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PlayerAgg = {
  name: string;
  points: number;
  matches: number;
  wins: number;
  tournamentWins: number;
  podiums: number;
  _tournamentIds: Set<string>;
};

function computeStats(tournaments: any[]) {
  const playerStats: Record<string, PlayerAgg> = {};

  const ensure = (id: string, name: string) => {
    if (!playerStats[id]) {
      playerStats[id] = { name, points: 0, matches: 0, wins: 0, tournamentWins: 0, podiums: 0, _tournamentIds: new Set() };
    }
  };

  for (const tournament of tournaments) {
    const tournamentPoints: Record<string, number> = {};
    for (const p of tournament.players) {
      tournamentPoints[p.id] = 0;
      ensure(p.id, p.name);
    }

    for (const match of tournament.matchScores) {
      const homeWon = match.homeScore > match.awayScore;
      const awayWon = match.awayScore > match.homeScore;

      for (const p of match.homeTeam) {
        ensure(p.id, p.name);
        playerStats[p.id].points += match.homeScore;
        playerStats[p.id].matches += 1;
        if (homeWon) playerStats[p.id].wins += 1;
        playerStats[p.id]._tournamentIds.add(tournament.id);
        tournamentPoints[p.id] = (tournamentPoints[p.id] ?? 0) + match.homeScore;
      }
      for (const p of match.awayTeam) {
        ensure(p.id, p.name);
        playerStats[p.id].points += match.awayScore;
        playerStats[p.id].matches += 1;
        if (awayWon) playerStats[p.id].wins += 1;
        playerStats[p.id]._tournamentIds.add(tournament.id);
        tournamentPoints[p.id] = (tournamentPoints[p.id] ?? 0) + match.awayScore;
      }
    }

    if (!tournament.isClosed || tournament.matchScores.length === 0) continue;

    const ranked = Object.entries(tournamentPoints)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([id]) => id);

    ranked.forEach((id, i) => {
      if (!playerStats[id]) return;
      if (i === 0) playerStats[id].tournamentWins += 1;
      if (i < 3) playerStats[id].podiums += 1;
    });
  }

  const players = Object.entries(playerStats)
    .map(([id, s]) => ({
      id,
      name: s.name,
      points: s.points,
      matches: s.matches,
      wins: s.wins,
      tournamentWins: s.tournamentWins,
      podiums: s.podiums,
      tournamentsPlayed: s._tournamentIds.size,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  const totalMatches = tournaments.reduce((sum, t) => sum + t.matchScores.length, 0);

  return {
    totals: { tournaments: tournaments.length, matchesPlayed: totalMatches },
    players,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. PlayerStat snapshot for closed tournaments
  const playerStatRows = await prisma.playerStat.findMany({
    where: { tournament: { userId } },
    include: { player: true },
  });

  const closedAgg: Record<string, PlayerAgg> = {};
  const ensureClosed = (pid: string, name: string) => {
    if (!closedAgg[pid]) {
      closedAgg[pid] = { name, points: 0, matches: 0, wins: 0, tournamentWins: 0, podiums: 0, _tournamentIds: new Set() };
    }
  };
  for (const row of playerStatRows) {
    ensureClosed(row.player.id, row.player.name);
    const s = closedAgg[row.player.id];
    s.points += row.points;
    s.matches += row.matches;
    s.wins += row.wins;
    if (row.isWinner) s.tournamentWins += 1;
    if (row.isPodium) s.podiums += 1;
    s._tournamentIds.add(row.tournamentId);
  }

  // 2. On-demand for open tournaments
  const openTournaments = await prisma.tournament.findMany({
    where: { userId, isClosed: false },
    include: {
      players: true,
      matchScores: {
        where: { locked: true },
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });
  const openStats = computeStats(openTournaments);

  // 3. Merge: open stats into closedAgg
  const mergedAgg: Record<string, PlayerAgg> = {};
  for (const [pid, s] of Object.entries(closedAgg)) {
    mergedAgg[pid] = { ...s };
  }
  for (const p of openStats.players) {
    if (!mergedAgg[p.id]) {
      mergedAgg[p.id] = { name: p.name, points: 0, matches: 0, wins: 0, tournamentWins: 0, podiums: 0, _tournamentIds: new Set() };
    }
    mergedAgg[p.id].points += p.points;
    mergedAgg[p.id].matches += p.matches;
    mergedAgg[p.id].wins += p.wins;
    mergedAgg[p.id].tournamentWins += p.tournamentWins;
    mergedAgg[p.id].podiums += p.podiums;
    for (const tid of (p as any)._tournamentIds || []) mergedAgg[p.id]._tournamentIds.add(tid);
  }

  const players = Object.entries(mergedAgg)
    .map(([pid, s]) => ({
      id: pid,
      name: s.name,
      points: s.points,
      matches: s.matches,
      wins: s.wins,
      tournamentWins: s.tournamentWins,
      podiums: s.podiums,
      tournamentsPlayed: s._tournamentIds.size,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  const totalMatches =
    playerStatRows.reduce((s, r) => s + r.matches, 0) +
    openTournaments.reduce((s, t) => s + t.matchScores.length, 0);
  const allTotals = {
    tournaments: new Set(playerStatRows.map((r) => r.tournamentId)).size + openTournaments.length,
    matchesPlayed: totalMatches,
  };

  const playerCount = await prisma.player.count({ where: { userId } });

  // 4. Format-specific breakdowns using PlayerStat rows
  const formats = ["AM", "MX", "CL"] as const;
  const formattedStats: Record<string, { totals: { tournaments: number; matchesPlayed: number }; players: any[] }> = {};

  for (const fmt of formats) {
    const closedFormatRows = playerStatRows.filter((r) => r.format === fmt);

    const closedPlayers: Record<string, any> = {};
    for (const row of closedFormatRows) {
      const pid = row.player.id;
      if (!closedPlayers[pid]) {
        closedPlayers[pid] = {
          id: pid,
          name: row.player.name,
          points: 0,
          matches: 0,
          wins: 0,
          tournamentWins: 0,
          podiums: 0,
          _tournamentIds: new Set<string>(),
        };
      }
      closedPlayers[pid].points += row.points;
      closedPlayers[pid].matches += row.matches;
      closedPlayers[pid].wins += row.wins;
      if (row.isWinner) closedPlayers[pid].tournamentWins++;
      if (row.isPodium) closedPlayers[pid].podiums++;
      closedPlayers[pid]._tournamentIds.add(row.tournamentId);
    }

    const openFormatTournaments = openTournaments.filter((t) => t.format === fmt);
    const openFormatStats = computeStats(openFormatTournaments);

    const mergedFormatPlayers: Record<string, any> = {};
    for (const p of Object.values(closedPlayers)) {
      mergedFormatPlayers[p.id] = { ...p };
    }
    for (const p of openFormatStats.players) {
      if (!mergedFormatPlayers[p.id]) {
        mergedFormatPlayers[p.id] = {
          id: p.id,
          name: p.name,
          points: 0,
          matches: 0,
          wins: 0,
          tournamentWins: 0,
          podiums: 0,
          _tournamentIds: new Set<string>(),
        };
      }
      mergedFormatPlayers[p.id].points += p.points;
      mergedFormatPlayers[p.id].matches += p.matches;
      mergedFormatPlayers[p.id].wins += p.wins;
      mergedFormatPlayers[p.id].tournamentWins += p.tournamentWins;
      mergedFormatPlayers[p.id].podiums += p.podiums;
      for (const tid of (p as any)._tournamentIds || []) mergedFormatPlayers[p.id]._tournamentIds.add(tid);
    }

    const fmtPlayers = Object.entries(mergedFormatPlayers)
      .map(([pid, s]) => ({
        id: pid,
        name: s.name,
        points: s.points,
        matches: s.matches,
        wins: s.wins,
        tournamentWins: s.tournamentWins,
        podiums: s.podiums,
        tournamentsPlayed: s._tournamentIds.size,
      }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    const fmtTotalMatches =
      closedFormatRows.reduce((s, r) => s + r.matches, 0) +
      openFormatTournaments.reduce((s, t) => s + t.matchScores.length, 0);

    formattedStats[fmt] = {
      totals: {
        tournaments: new Set(closedFormatRows.map((r) => r.tournamentId)).size + openFormatTournaments.length,
        matchesPlayed: fmtTotalMatches,
      },
      players: fmtPlayers,
    };
  }

  return Response.json({
    totals: { ...allTotals, players: playerCount },
    players,
    byFormat: formattedStats,
  });
}