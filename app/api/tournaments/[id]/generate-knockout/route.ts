import { prisma } from "@/lib/prisma";
import {
  parseTeams, divideIntoGroups, computeGroupStandings,
  buildKnockoutPairings, bracketRoundLabel, nextBracketRound,
  parseSets, setsWon, matchSetsToSetScores,
} from "@/lib/classic";

const WINNER_ROUNDS = ["QF", "SF", "F"];
const CONSOLATION_ROUNDS = ["C-QF", "C-SF", "C-F"];
const ALL_ROUNDS = [...WINNER_ROUNDS, ...CONSOLATION_ROUNDS];

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { players: true, matchScores: { include: { homeTeam: true, awayTeam: true, matchSets: { orderBy: { setIndex: "asc" } } } } },
    });

    if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.isClosed) return Response.json({ error: "Tournament is closed" }, { status: 400 });
    if (tournament.format !== "CL") return Response.json({ error: "Only Classic tournaments support knockout" }, { status: 400 });

    const groupMatches = tournament.matchScores.filter(m => m.phase === "group");
    const knockoutMatches = tournament.matchScores.filter(m => m.phase === "knockout");

    // --- Phase A: generate initial knockout from group results ---
    if (knockoutMatches.length === 0) {
      const allGroupLocked = groupMatches.length > 0 && groupMatches.every(m => m.locked);
      if (!allGroupLocked) return Response.json({ error: "Complete all group matches first" }, { status: 400 });

      const idToName = new Map(tournament.players.map(p => [p.id, p.name]));
      const rawTeams = parseTeams((tournament as any).teamsJson)
        .map(ids => ids.map(id => idToName.get(id) ?? id));
      const numGroups = (tournament as any).numGroups ?? 1;
      const advancePerGroup = (tournament as any).advancePerGroup ?? 2;
      const groups = divideIntoGroups(rawTeams, numGroups);

      const groupStandings = groups.map(g => {
        const gMatches = groupMatches.filter(m => m.groupName === g.name);
        return { name: g.name, standings: computeGroupStandings(g.teams, gMatches) };
      });

      const totalAdvancing = numGroups * advancePerGroup;
      const roundLabel = bracketRoundLabel(totalAdvancing);
      const pairings = buildKnockoutPairings(groupStandings, advancePerGroup);

      const created: any[] = [];
      for (const p of pairings) {
        const homeIds = p.homeTeamNames.map((n: string) => tournament.players.find(pl => pl.name === n)?.id).filter((id): id is string => !!id);
        const awayIds = p.awayTeamNames.map((n: string) => tournament.players.find(pl => pl.name === n)?.id).filter((id): id is string => !!id);
        if (homeIds.length < 2 || awayIds.length < 2) continue;

        const m = await prisma.matchScore.create({
          data: {
            tournamentId: id,
            round: 100,
            phase: "knockout",
            bracketRound: roundLabel,
            bracketSlot: p.bracketSlot,
            homeTeam: { connect: homeIds.map((pid: string) => ({ id: pid })) },
            awayTeam: { connect: awayIds.map((pid: string) => ({ id: pid })) },
            homeScore: 0, awayScore: 0,
          },
          include: { homeTeam: true, awayTeam: true },
        });
        created.push(m);
      }

      // --- Consolation bracket (if enabled) ---
      if ((tournament as any).consolationBracket) {
        const minTeamsPerGroup = Math.floor(rawTeams.length / numGroups);
        const consolationCount = minTeamsPerGroup - advancePerGroup;

        if (consolationCount > 0) {
          const consolationPairings = buildKnockoutPairings(groupStandings, consolationCount, advancePerGroup);

          if (consolationPairings.length > 0) {
            const consolationLabel = "C-" + bracketRoundLabel(consolationPairings.length * 2);

            for (const p of consolationPairings) {
              const homeIds = p.homeTeamNames.map((n: string) => tournament.players.find(pl => pl.name === n)?.id).filter((id): id is string => !!id);
              const awayIds = p.awayTeamNames.map((n: string) => tournament.players.find(pl => pl.name === n)?.id).filter((id): id is string => !!id);
              if (homeIds.length < 2 || awayIds.length < 2) continue;

              const m = await prisma.matchScore.create({
                data: {
                  tournamentId: id,
                  round: 200,
                  phase: "knockout",
                  bracketRound: consolationLabel,
                  bracketSlot: p.bracketSlot,
                  homeTeam: { connect: homeIds.map((pid: string) => ({ id: pid })) },
                  awayTeam: { connect: awayIds.map((pid: string) => ({ id: pid })) },
                  homeScore: 0, awayScore: 0,
                },
                include: { homeTeam: true, awayTeam: true },
              });
              created.push(m);
            }
          }
        }
      }

      return Response.json(created, { status: 201 });
    }

    // --- Phase B: advance winners and/or consolation to next round ---
    const created: any[] = [];

    const tryAdvance = async (roundOrder: string[]) => {
      const latestRound = roundOrder.slice().reverse().find(r => knockoutMatches.some(m => m.bracketRound === r));
      if (!latestRound) return;

      const latestMatches = knockoutMatches.filter(m => m.bracketRound === latestRound);
      if (!latestMatches.every(m => m.locked)) return;

      const nextRound = nextBracketRound(latestRound);
      if (!nextRound) return;
      if (knockoutMatches.some(m => m.bracketRound === nextRound)) return;

      const sorted = [...latestMatches].sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0));
      let slot = 1;

      for (let i = 0; i < sorted.length; i += 2) {
        const m1 = sorted[i];
        const m2 = sorted[i + 1];
        if (!m1 || !m2) break;

        const setsToWin = (tournament as any).setsToWin ?? 2;
        const w1 = resolveWinner(m1, setsToWin);
        const w2 = resolveWinner(m2, setsToWin);
        if (!w1 || !w2) continue;

        const roundNum = 100 + ALL_ROUNDS.indexOf(nextRound);
        const m = await prisma.matchScore.create({
          data: {
            tournamentId: id,
            round: roundNum,
            phase: "knockout",
            bracketRound: nextRound,
            bracketSlot: slot++,
            homeTeam: { connect: w1.map((p: any) => ({ id: p.id })) },
            awayTeam: { connect: w2.map((p: any) => ({ id: p.id })) },
            homeScore: 0, awayScore: 0,
          },
          include: { homeTeam: true, awayTeam: true },
        });
        created.push(m);
      }
    };

    await tryAdvance(WINNER_ROUNDS);
    await tryAdvance(CONSOLATION_ROUNDS);

    if (created.length === 0) {
      return Response.json({ error: "No rounds ready to advance — complete current matches first or tournament brackets are finished" }, { status: 400 });
    }

    return Response.json(created, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function resolveWinner(match: any, setsToWin = 2): any[] | null {
  const sets = match.matchSets?.length > 0
    ? matchSetsToSetScores(match.matchSets)
    : parseSets(match.setsJson);
  if (sets.length === 0) return null;
  const [h, a] = setsWon(sets);
  if (h >= setsToWin) return match.homeTeam;
  if (a >= setsToWin) return match.awayTeam;
  return null;
}
