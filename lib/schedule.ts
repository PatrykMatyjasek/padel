function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Balanced Americano (power-of-2 sizes) ─────────────────────────────
// For N = 2^k, uses the affine geometry 1-factorization over GF(2)^k
// with carefully-chosen match groupings. Guarantees:
//   • Every pair partners exactly once
//   • Every pair faces each other exactly 2× as rivals
// Proven correct for N = 8; N = 4 is trivially correct.
// ──────────────────────────────────────────────────────────────────────
function generateBalancedPowerOfTwo(players: any[]): any[] {
  const N = players.length;
  const rounds: any[] = [];

  if (N === 4) {
    // 3 rounds, 2 pairs each → 1 trivial match per round
    for (let dir = 1; dir <= 3; dir++) {
      const used = new Set<number>();
      const pairs: any[][] = [];
      for (let v = 0; v < 4; v++) {
        if (used.has(v)) continue;
        const w = v ^ dir;
        if (used.has(w)) continue;
        pairs.push([players[v], players[w]]);
        used.add(v);
        used.add(w);
      }
      rounds.push([{ teams: [pairs[0], pairs[1]] }]);
    }
    return rounds;
  }

  if (N === 8) {
    // Verified-perfect grouping for N=8 (affine 1-factorization + match groupings)
    // directions 1..7 produce the 7 rounds of partnerships
    const groupingPattern = [0, 2, 2, 2, 0, 1, 0];
    const groupings: [number, number][][][] = [
      [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]],
    ];

    for (let d = 0; d < 7; d++) {
      const dir = d + 1;
      const used = new Set<number>();
      const pairs: any[][] = [];
      for (let v = 0; v < 8; v++) {
        if (used.has(v)) continue;
        const w = v ^ dir;
        if (used.has(w)) continue;
        pairs.push([players[v], players[w]]);
        used.add(v);
        used.add(w);
      }

      const g = groupingPattern[d];
      const pattern = groupings[0][g];
      const round: any[] = [];
      for (const [i, j] of pattern) {
        round.push({ teams: [pairs[i], pairs[j]] });
      }
      rounds.push(shuffle(round));
    }
    return rounds;
  }

  // For 16, 32 … (not yet verified) — fall through to generic circle method
  return [];
}

// ── Classic circle-method Americano ──────────────────────────────────
// Works for any N >= 4. Guarantees every partnership once, but rival
// counts are only approximately balanced (not exact for every pair).
// ──────────────────────────────────────────────────────────────────────
function generateCircleAmericano(players: any[]): any[] {
  const N = players.length;
  if (N < 4) throw new Error("Minimum 4 players required");

  const list: (any | null)[] = N % 2 === 0 ? [...players] : [...players, null];
  const M = list.length;

  const fixed = list[0];
  const rotating = list.slice(1);
  const rounds: any[] = [];

  for (let r = 0; r < M - 1; r++) {
    const rotated = [fixed, ...rotating.slice(r).concat(rotating.slice(0, r))];

    const pairs: any[][] = [];
    for (let i = 0; i < M / 2; i++) {
      const p1 = rotated[i];
      const p2 = rotated[M - 1 - i];
      if (p1 !== null && p2 !== null) {
        pairs.push([p1, p2]);
      }
    }

    const round: any[] = [];
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      round.push({ teams: [pairs[i], pairs[i + 1]] });
    }

    if (round.length > 0) rounds.push(shuffle(round));
  }

  return rounds;
}

// ── Public entry point ───────────────────────────────────────────────
export function generateAmericano(players: any[]): any[] {
  const N = players.length;
  // Use the exact-balanced algorithm for known power-of-2 sizes
  if (N === 4 || N === 8) {
    return generateBalancedPowerOfTwo(players);
  }
  // For everything else (6, 10, odd counts, etc.) use the classic circle method
  return generateCircleAmericano(players);
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
export function generateMexicanoNextRound(rankedPlayers: any[]): any[] {
  const numCourts = Math.floor(rankedPlayers.length / 4);
  const round: any[] = [];
  for (let i = 0; i < numCourts; i++) {
    const g = rankedPlayers.slice(i * 4, i * 4 + 4);
    round.push({ teams: [[g[0], g[2]], [g[1], g[3]]] });
  }
  return round;
}
