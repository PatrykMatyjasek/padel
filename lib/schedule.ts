function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateAmericano(players: any[]): any[] {
  const N = players.length;
  if (N % 2 !== 0 || N < 4) throw new Error("Player count must be even and >= 4");

  const rounds: any[] = [];
  const fixed = players[0];
  const rotating = players.slice(1);

  const numRounds = N - 1;

  for (let r = 0; r < numRounds; r++) {
    const round: any[] = [];
    const pairings: any[] = [];

    const rotated = [fixed, ...rotating.slice(r).concat(rotating.slice(0, r))];

    for (let i = 0; i < N / 2; i++) {
      const p1 = rotated[i];
      const p2 = rotated[N - 1 - i];
      pairings.push([p1, p2]);
    }

    // combine pairs into matches (2 pairs per match)
    for (let i = 0; i < pairings.length; i += 2) {
      if (i + 1 < pairings.length) {
        round.push({ teams: [pairings[i], pairings[i + 1]] });
      }
    }

    rounds.push(shuffle(round));
  }

  return rounds;
}

// Handles any N >= 4, including odd counts.
// Odd N gets a null "bye" slot appended so the circle method stays intact.
// Any pair that includes the bye slot is skipped — those players sit that round out.
// Each player ends up with exactly one solo bye (paired with null) across all rounds.
export function generateAmericanoFlex(players: any[]): any[] {
  const N = players.length;
  if (N < 4) throw new Error("Minimum 4 players required");

  // Pad to even with a null bye slot if needed
  const list: (any | null)[] = N % 2 === 0 ? [...players] : [...players, null];
  const M = list.length;

  const fixed = list[0];
  const rotating = list.slice(1);
  const rounds: any[] = [];

  for (let r = 0; r < M - 1; r++) {
    const rotated = [fixed, ...rotating.slice(r).concat(rotating.slice(0, r))];

    // Build pairs for this round, skipping any that involve the bye slot
    const pairs: any[][] = [];
    for (let i = 0; i < M / 2; i++) {
      const p1 = rotated[i];
      const p2 = rotated[M - 1 - i];
      if (p1 !== null && p2 !== null) {
        pairs.push([p1, p2]);
      }
    }

    // Group consecutive pairs into matches (2 pairs → 1 match, leftover pair = bye)
    const round: any[] = [];
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      round.push({ teams: [pairs[i], pairs[i + 1]] });
    }

    if (round.length > 0) rounds.push(shuffle(round));
  }

  return rounds;
}

export function generateMexicano(players: any[], roundsCount: number): any[] {
  const schedule: any[] = [];
  for (let r = 0; r < roundsCount; r++) {
    const round: any[] = [];
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) round.push({ teams: [[shuffled[i]], [shuffled[i + 1]]] });
    }
    schedule.push(shuffle(round));
  }
  return schedule;
}

export function calculatePlayerPoints(tournament: any, scores: any): Record<string, number> {
  const points: Record<string, number> = {};
  tournament.players.forEach((p: any) => { points[p] = 0; });

  const schedule =
    tournament.format === "AM"
      ? generateAmericano(tournament.players)
      : generateMexicano(tournament.players, tournament.mexicanoRounds);

  schedule.forEach((round: any, rIdx: number) => {
    round.forEach((match: any, mIdx: number) => {
      const matchId = `${tournament.id}-r${rIdx + 1}-m${mIdx + 1}`;
      const score = scores[matchId];
      if (!score) return;
      const [team1, team2] = match.teams;
      team1.forEach((p: any) => { points[p] += score.home; });
      team2.forEach((p: any) => { points[p] += score.away; });
    });
  });

  return points;
}
