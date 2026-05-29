function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Base circle-method generator. Supports any N >= 4 (even or odd).
// Odd N gets a null bye slot so the circle stays intact.
function baseCircleRounds(players: any[]): any[] {
  const N = players.length;
  if (N < 4) throw new Error("Minimum 4 players required");

  const list: (any | null)[] = N % 2 === 0 ? [...players] : [...players, null];
  const M = list.length;

  const fixed = list[0];
  const rotating = list.slice(1);
  const rounds: any[] = [];

  for (let r = 0; r < M - 1; r++) {
    const rotated = [fixed, ...rotating.slice(r).concat(rotating.slice(0, r))];

    // Pair opposite positions in the circle
    const pairs: any[][] = [];
    for (let i = 0; i < M / 2; i++) {
      const p1 = rotated[i];
      const p2 = rotated[M - 1 - i];
      if (p1 !== null && p2 !== null) {
        pairs.push([p1, p2]);
      }
    }

    // Consecutive pairs become rivals (2 pairs per match)
    const round: any[] = [];
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      round.push({ teams: [pairs[i], pairs[i + 1]] });
    }

    if (round.length > 0) rounds.push(shuffle(round));
  }

  return rounds;
}

// Classic Americano schedule for any N >= 4 (even or odd).
// Uses the circle method. Odd counts get a rotating bye.
export function generateAmericano(players: any[]): any[] {
  return baseCircleRounds(players);
}

// Backward-compatible alias
export function generateAmericanoFlex(players: any[]): any[] {
  return generateAmericano(players);
}

// Classic: round-robin for fixed teams within a group.
// Each team is [player1, player2]. Returns array of rounds.
export function generateGroupRoundRobin(teams: any[][]): any[][] {
  const list: (any[] | null)[] = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const M = list.length;
  const fixed = list[0];
  const rotating = list.slice(1);
  const rounds: any[][] = [];

  for (let r = 0; r < M - 1; r++) {
    const rotated = [fixed, ...rotating.slice(r).concat(rotating.slice(0, r))];
    const round: any[] = [];
    for (let i = 0; i < M / 2; i++) {
      const t1 = rotated[i];
      const t2 = rotated[M - 1 - i];
      if (t1 !== null && t2 !== null) round.push({ teams: [t1, t2] });
    }
    if (round.length > 0) rounds.push(round);
  }
  return rounds;
}

// Round 1: random draw. Groups of 4; within each group rank0&rank2 vs rank1&rank3.
export function generateMexicanoRound1(players: any[]): any[] {
  const shuffled = shuffle([...players]);
  const numCourts = Math.floor(shuffled.length / 4);
  const round: any[] = [];
  for (let i = 0; i < numCourts; i++) {
    const g = shuffled.slice(i * 4, i * 4 + 4);
    round.push({ teams: [[g[0], g[2]], [g[1], g[3]]] });
  }
  return round;
}

// Subsequent rounds: players already sorted by cumulative pts (desc).
// Same grouping: rank0&rank2 vs rank1&rank3 per court.
export function generateMexicanoNextRound(rankedPlayers: any[]): any[] {
  const numCourts = Math.floor(rankedPlayers.length / 4);
  const round: any[] = [];
  for (let i = 0; i < numCourts; i++) {
    const g = rankedPlayers.slice(i * 4, i * 4 + 4);
    round.push({ teams: [[g[0], g[2]], [g[1], g[3]]] });
  }
  return round;
}
