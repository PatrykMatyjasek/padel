"use client";

import React from "react";

interface Score {
  home: number | null;
  away: number | null;
}

interface TournamentScoreTableProps {
  tournament: any;
  scores: Record<string, Score>;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TournamentScoreTable({ tournament, scores }: TournamentScoreTableProps) {
  const players: any[] = tournament?.players ?? [];
  const matches: any[] = tournament?.matchScores ?? [];

  if (!players.length) return null;

  // Accumulate points each player scored across all matches
  const points: Record<string, number> = {};
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};
  players.forEach((p) => { points[p.id] = 0; wins[p.id] = 0; losses[p.id] = 0; });

  matches.forEach((match: any) => {
    const s = scores[match.id];
    if (!s || s.home == null || s.away == null) return;
    const homeWon = s.home! > s.away!;
    const awayWon = s.away! > s.home!;
    match.homeTeam?.forEach((p: any) => {
      points[p.id] = (points[p.id] ?? 0) + s.home!;
      if (homeWon) wins[p.id] = (wins[p.id] ?? 0) + 1;
      if (awayWon) losses[p.id] = (losses[p.id] ?? 0) + 1;
    });
    match.awayTeam?.forEach((p: any) => {
      points[p.id] = (points[p.id] ?? 0) + s.away!;
      if (awayWon) wins[p.id] = (wins[p.id] ?? 0) + 1;
      if (homeWon) losses[p.id] = (losses[p.id] ?? 0) + 1;
    });
  });

  const ranked = [...players]
    .map((p) => ({ ...p, pts: points[p.id] ?? 0, w: wins[p.id] ?? 0, l: losses[p.id] ?? 0 }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w);

  const playedCount = matches.filter(
    (m) => scores[m.id]?.home != null && scores[m.id]?.away != null
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Standings</h2>
        <span className="text-xs text-muted-foreground">
          {playedCount} / {matches.length} matches
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[300px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Player</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pts</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">W</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">L</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className={["border-t", i === 0 && p.pts > 0 ? "font-semibold" : ""].join(" ")}>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="px-4 py-2.5">{p.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.pts}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">{p.w}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{p.l}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
