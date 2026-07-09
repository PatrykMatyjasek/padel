"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface Score {
  home: number | null;
  away: number | null;
  locked?: boolean;
}

interface TournamentScheduleProps {
  tournament: any;
  scores: Record<string, Score>;
  onSaveScore: (matchId: string, homeScore: number, awayScore: number) => void;
}

export default function TournamentSchedule({
  tournament,
  scores,
  onSaveScore,
}: TournamentScheduleProps) {
  const matches: any[] = tournament?.matchScores ?? [];
  const disabled = !!tournament?.isClosed;

  if (!matches.length) {
    return (
      <div className="card p-8 text-center text-muted-foreground text-sm">
        No schedule generated
      </div>
    );
  }

  const byRound = matches.reduce<Record<number, any[]>>((acc, m) => {
    const r: number = m.round ?? 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});
  const roundNumbers = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  const maxPoints = tournament.pointsPerMatch ?? 21;
  const allPlayers: any[] = tournament?.players ?? [];

  return (
    <div className="space-y-8">
      {roundNumbers.map((roundNum) => {
        const roundMatches = byRound[roundNum];
        const allSaved = roundMatches.every((m) => scores[m.id]?.locked);

        const activePlayers = new Set<string>();
        roundMatches.forEach((m: any) => {
          m.homeTeam?.forEach((p: any) => activePlayers.add(p.id));
          m.awayTeam?.forEach((p: any) => activePlayers.add(p.id));
        });
        const sittingOut = allPlayers.filter((p) => !activePlayers.has(p.id));

        return (
          <div key={roundNum} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Round {roundNum}
              </span>
              <div className="flex-1 h-px bg-border" />
              {allSaved && (
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">
                  ✓ Completed
                </span>
              )}
            </div>

            {sittingOut.length > 0 && (
              <p className="text-xs text-muted-foreground px-1">
                Sitting out: {sittingOut.map((p) => p.name).join(", ")}
              </p>
            )}

            {roundMatches.map((match: any) => (
              <MatchRow
                key={match.id}
                match={match}
                score={scores[match.id]}
                disabled={disabled}
                maxPoints={maxPoints}
                onSave={(h, a) => onSaveScore(match.id, h, a)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ScorePicker({
  label,
  value,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  max: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const minScore = max % 2 === 0 ? max / 2 : Math.floor(max / 2) + 1;
  const nums = Array.from({ length: max - minScore + 1 }, (_, i) => i + minScore);

  return (
    <div className="space-y-3 flex-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
        {label}
      </p>
      {value !== null && (
        <p className="text-5xl font-black tabular-nums text-center text-foreground leading-none">
          {value}
        </p>
      )}
      {!disabled && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {nums.map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={[
                "rounded-xl py-3 text-base font-bold transition-all",
                value === n
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-muted hover:bg-muted/70 text-foreground",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRow({
  match,
  score,
  disabled,
  maxPoints,
  onSave,
}: {
  match: any;
  score: Score | undefined;
  disabled: boolean;
  maxPoints: number;
  onSave: (home: number, away: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  const locked = !!score?.locked;
  const savedHome = score?.home ?? null;
  const savedAway = score?.away ?? null;

  const homePlayers = match.homeTeam?.map((p: any) => p.name).join(" & ") || "—";
  const awayPlayers = match.awayTeam?.map((p: any) => p.name).join(" & ") || "—";

  const handlePick = (homeScore: number, awayScore: number) => {
    onSave(homeScore, awayScore);
    setEditing(false);
  };

  return (
    <div className="card overflow-hidden">
      {/* Match header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-sm truncate">{homePlayers}</span>
        </div>

        {/* Score display or VS */}
        <div className="shrink-0 text-center px-3">
          {locked && savedHome !== null && savedAway !== null ? (
            <span className="font-black text-lg tabular-nums text-primary">
              {savedHome} <span className="text-muted-foreground font-light">:</span> {savedAway}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">vs</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-semibold text-sm truncate text-right">{awayPlayers}</span>
        </div>

        {!disabled && (
          <div className="ml-3 shrink-0">
            {locked && !editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Edit
              </button>
            ) : !locked && !editing ? (
              <Button size="sm" onClick={() => setEditing(true)}>
                Enter score
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* Score picker (expanded) */}
      {editing && !disabled && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {maxPoints % 2 === 0 ? "Tap a team's score (draws allowed)" : "Tap the winning team's score"}
            </p>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <ScorePicker
              label={homePlayers}
              value={savedHome}
              max={maxPoints}
              onChange={(v) => handlePick(v, maxPoints - v)}
              disabled={false}
            />
            <div className="h-px sm:h-auto sm:w-px bg-border shrink-0 sm:self-stretch" />
            <ScorePicker
              label={awayPlayers}
              value={savedAway}
              max={maxPoints}
              onChange={(v) => handlePick(maxPoints - v, v)}
              disabled={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
