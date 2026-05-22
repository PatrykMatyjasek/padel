// [homeGames, awayGames] or [homeGames, awayGames, homeTb, awayTb] for tiebreak sets
export type SetScore = [number, number, number?, number?];

export interface GroupStanding {
  names: string[];       // ["Alice", "Bob"]
  P: number;
  W: number;
  L: number;
  SW: number; SL: number;
  GW: number; GL: number;
  Pts: number;
}

export function parseTeams(teamsJson: string | null | undefined): string[][] {
  if (!teamsJson) return [];
  try { return JSON.parse(teamsJson); } catch { return []; }
}

export function parseSets(setsJson: string | null | undefined): SetScore[] {
  if (!setsJson) return [];
  try { return JSON.parse(setsJson); } catch { return []; }
}

export function setsWon(sets: SetScore[]): [number, number] {
  return sets.reduce<[number, number]>(
    ([h, a], [hg, ag]) => hg > ag ? [h + 1, a] : ag > hg ? [h, a + 1] : [h, a],
    [0, 0]
  );
}

// Returns 0 (home wins), 1 (away wins), or null (not finished)
export function matchWinner(sets: SetScore[], setsToWin = 2): 0 | 1 | null {
  const [h, a] = setsWon(sets);
  if (h >= setsToWin) return 0;
  if (a >= setsToWin) return 1;
  return null;
}

export function groupLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

export function divideIntoGroups(teams: string[][], numGroups: number): { name: string; teams: string[][] }[] {
  const result: { name: string; teams: string[][] }[] = [];
  const base = Math.floor(teams.length / numGroups);
  const extra = teams.length % numGroups;
  let idx = 0;
  for (let g = 0; g < numGroups; g++) {
    const count = base + (g < extra ? 1 : 0);
    result.push({ name: groupLetter(g), teams: teams.slice(idx, idx + count) });
    idx += count;
  }
  return result;
}

export function computeGroupStandings(
  teamsList: string[][],
  matches: any[],
): GroupStanding[] {
  const standings = teamsList.map(names => ({
    names,
    P: 0, W: 0, L: 0, SW: 0, SL: 0, GW: 0, GL: 0, Pts: 0,
  }));

  // Map: first player name → standing index
  const byName = new Map<string, number>();
  standings.forEach((s, i) => byName.set(s.names[0], i));

  for (const m of matches) {
    if (!m.locked || !m.setsJson) continue;
    const sets = parseSets(m.setsJson);
    const [hSets, aSets] = setsWon(sets);
    const hGames = sets.reduce((s, [h]) => s + h, 0);
    const aGames = sets.reduce((s, [, a]) => s + a, 0);

    const hIdx = m.homeTeam?.[0] ? byName.get(m.homeTeam[0].name) : undefined;
    const aIdx = m.awayTeam?.[0] ? byName.get(m.awayTeam[0].name) : undefined;

    if (hIdx !== undefined) {
      const s = standings[hIdx];
      s.P++; s.SW += hSets; s.SL += aSets; s.GW += hGames; s.GL += aGames;
      if (hSets > aSets) { s.W++; s.Pts += 3; } else { s.L++; }
    }
    if (aIdx !== undefined) {
      const s = standings[aIdx];
      s.P++; s.SW += aSets; s.SL += hSets; s.GW += aGames; s.GL += hGames;
      if (aSets > hSets) { s.W++; s.Pts += 3; } else { s.L++; }
    }
  }

  return standings.sort((a, b) =>
    b.Pts - a.Pts || (b.SW - b.SL) - (a.SW - a.SL) || (b.GW - b.GL) - (a.GW - a.GL)
  );
}

// Build initial knockout matches from group standings.
// count = how many teams per group to take; fromPos = starting rank offset (0 for winners, advancePerGroup for consolation).
export function buildKnockoutPairings(
  groupStandings: { name: string; standings: GroupStanding[] }[],
  count: number,
  fromPos = 0,
): { homeTeamNames: string[]; awayTeamNames: string[]; bracketSlot: number }[] {
  const G = groupStandings.length;
  const byPos: GroupStanding[][] = [];
  for (let pos = 0; pos < count; pos++) {
    byPos.push(groupStandings.map(g => g.standings[fromPos + pos]).filter(Boolean));
  }

  const matches: { homeTeamNames: string[]; awayTeamNames: string[]; bracketSlot: number }[] = [];
  let slot = 1;

  if (count >= 2 && G >= 2) {
    // Cross-group pairing: group[i] pos1 vs group[G-1-i] pos2
    const pos1 = byPos[0];
    const pos2 = [...byPos[1]].reverse();
    for (let i = 0; i < pos1.length; i++) {
      if (pos1[i] && pos2[i]) {
        matches.push({ homeTeamNames: pos1[i].names, awayTeamNames: pos2[i].names, bracketSlot: slot++ });
      }
    }
  } else {
    // Fallback: snake seeding across all available teams
    const all = byPos.flat();
    const lo = [...all].reverse();
    for (let i = 0; i < Math.floor(all.length / 2); i++) {
      matches.push({ homeTeamNames: all[i].names, awayTeamNames: lo[i].names, bracketSlot: slot++ });
    }
  }

  return matches;
}

// Determine which bracket round label to use given total match count
export function bracketRoundLabel(totalTeams: number): string {
  if (totalTeams <= 2) return "F";
  if (totalTeams <= 4) return "SF";
  return "QF";
}

// Next round label — handles both winners ("QF"/"SF"/"F") and consolation ("C-QF"/"C-SF"/"C-F")
export function nextBracketRound(current: string): string | null {
  const prefix = current.startsWith("C-") ? "C-" : "";
  const base = current.startsWith("C-") ? current.slice(2) : current;
  if (base === "QF") return `${prefix}SF`;
  if (base === "SF") return `${prefix}F`;
  return null;
}

export function teamLabel(names: string[]): string {
  return names.join(" & ");
}
