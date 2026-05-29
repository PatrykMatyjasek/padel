import { generateAmericano } from '../lib/schedule.ts';

const players = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Player ${i + 1}`,
}));

const schedule = generateAmericano(players);

console.log('═══════════════════════════════════════════════════════');
console.log('  PROOF: Balanced Americano for 8 Players');
console.log('═══════════════════════════════════════════════════════\n');

for (let r = 0; r < schedule.length; r++) {
  console.log(`Round ${r + 1}:`);
  for (const match of schedule[r]) {
    const t1 = match.teams[0].map(p => p.name).join(' + ');
    const t2 = match.teams[1].map(p => p.name).join(' + ');
    console.log(`  ${t1}  vs  ${t2}`);
  }
  console.log();
}

// Partnership verification
const part = new Map();
for (const round of schedule) {
  for (const match of round) {
    for (const team of match.teams) {
      const key = [team[0].id, team[1].id].sort((a, b) => a - b).join('-');
      part.set(key, (part.get(key) ?? 0) + 1);
    }
  }
}

console.log('══ Partnership Check ══');
console.log(`  Total unique pairs: ${part.size} / 28`);
let allOne = true;
for (const [k, v] of part) {
  if (v !== 1) { allOne = false; console.log(`  FAIL: ${k} partnered ${v}x`); }
}
console.log(`  ${allOne ? '✓ All 28 pairs partner exactly ONCE' : 'See failures above'}\n`);

// Opponent verification
const opp = new Map();
for (const round of schedule) {
  for (const match of round) {
    const [a, b] = match.teams;
    for (const pA of a) {
      for (const pB of b) {
        const key = [pA.id, pB.id].sort((a, b) => a - b).join('-');
        opp.set(key, (opp.get(key) ?? 0) + 1);
      }
    }
  }
}

console.log('══ Rival / Opponent Check ══');
console.log(`  Total unique rival pairs: ${opp.size} / 28`);
let allTwo = true;
const dist = new Map();
for (let i = 1; i <= 8; i++) {
  for (let j = i + 1; j <= 8; j++) {
    const key = [i, j].join('-');
    const cnt = opp.get(key) ?? 0;
    dist.set(cnt, (dist.get(cnt) ?? 0) + 1);
    if (cnt !== 2) {
      allTwo = false;
      console.log(`  FAIL: Player ${i} vs Player ${j} met ${cnt}x rivals`);
    }
  }
}
console.log(`  Distribution: ${JSON.stringify(Object.fromEntries(dist))}`);
console.log(`  ${allTwo ? '✓ All 28 pairs oppose exactly TWICE' : 'See failures above'}`);
