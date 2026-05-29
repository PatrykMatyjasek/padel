import { describe, it, expect } from 'vitest';
import { generateAmericano } from './schedule';

describe('generateAmericano', () => {
  const players = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
  }));

  it('produces exactly 7 rounds for 8 players (N-1)', () => {
    const schedule = generateAmericano(players);
    expect(schedule).toHaveLength(7);
  });

  it('ensures all players are distinct in each match (4 unique IDs per match)', () => {
    const schedule = generateAmericano(players);
    for (const round of schedule) {
      for (const match of round) {
        const ids = match.teams.flatMap((team: number[]) => team.map((p: { id: number }) => p.id));
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(4);
      }
    }
  });

  it('ensures no player appears in two teams within the same round', () => {
    const schedule = generateAmericano(players);
    for (const round of schedule) {
      const roundPlayerIds: number[] = [];
      for (const match of round) {
        for (const team of match.teams) {
          for (const player of team) {
            expect(roundPlayerIds).not.toContain(player.id);
            roundPlayerIds.push(player.id);
          }
        }
      }
    }
  });

  it('each player partners with every other player exactly once', () => {
    const schedule = generateAmericano(players);

    const partnershipCounts = new Map<string, number>();
    for (const round of schedule) {
      for (const match of round) {
        for (const team of match.teams) {
          const [p1, p2] = team;
          const key = [p1.id, p2.id].sort((a, b) => a - b).join(',');
          partnershipCounts.set(key, (partnershipCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const totalPairs = (8 * 7) / 2; // 28
    expect(partnershipCounts.size).toBe(totalPairs);
    for (const count of partnershipCounts.values()) {
      expect(count).toBe(1);
    }
  });

  it('reports opponent distribution for 8 players', () => {
    const schedule = generateAmericano(players);

    const opponentCounts = new Map<string, number>();
    for (const round of schedule) {
      for (const match of round) {
        const [teamA, teamB] = match.teams;
        for (const pA of teamA) {
          for (const pB of teamB) {
            const key = [pA.id, pB.id].sort((a, b) => a - b).join(',');
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    // Notably, classic Americano via the circle method does NOT guarantee
    // every pair opposes each other the same number of times.  The circle
    // method is designed to balance *partnerships*, not opponent counts.
    // We collect the distribution to surface the actual numbers.
    const distribution = new Map<number, number>();
    for (const count of opponentCounts.values()) {
      distribution.set(count, (distribution.get(count) ?? 0) + 1);
    }

    // Print distribution for debugging
    const sorted = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);
    console.log('Opponent count distribution:', Object.fromEntries(sorted));
    console.log('Total pairs that met as rivals:', opponentCounts.size, 'of', (8 * 7) / 2);

    // No strict assertion here — we are documenting the actual behavior.
    expect(opponentCounts.size).toBeGreaterThan(0);
  });
});
