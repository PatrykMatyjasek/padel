"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  parseTeams, divideIntoGroups, computeGroupStandings,
  parseSets, setsWon, matchWinner, teamLabel,
  type GroupStanding, type SetScore,
} from "@/lib/classic";

// ---------------------------------------------------------------------------
// Tennis set entry — button-based score picker with tiebreak support
// ---------------------------------------------------------------------------

const SET_SCORE_OPTIONS: [number, number][] = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6],
];

interface SetEntry {
  home: number;
  away: number;
  homeTb?: number;
  awayTb?: number;
}

function TbStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground truncate max-w-[56px]">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded bg-muted hover:bg-muted/70 text-xs font-bold transition-colors shrink-0">−</button>
      <span className="w-5 text-center font-bold tabular-nums text-sm shrink-0">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-muted hover:bg-muted/70 text-xs font-bold transition-colors shrink-0">+</button>
    </div>
  );
}

function SetEntryPanel({
  setNum, value, onChange, homeName, awayName,
}: {
  setNum: number;
  value: SetEntry | null;
  onChange: (v: SetEntry) => void;
  homeName: string;
  awayName: string;
}) {
  const isTb = value != null && ((value.home === 7 && value.away === 6) || (value.home === 6 && value.away === 7));

  const isSelected = (h: number, a: number) => value?.home === h && value?.away === a;

  const scoreBtn = (h: number, a: number) => (
    <button
      key={`${h}-${a}`}
      type="button"
      onClick={() => onChange({ home: h, away: a })}
      className={[
        "px-2.5 py-2 text-xs font-bold rounded-lg transition-all",
        isSelected(h, a)
          ? "bg-primary text-primary-foreground shadow-sm scale-105"
          : "bg-muted hover:bg-primary/10 text-foreground",
      ].join(" ")}
    >
      {h}-{a}
    </button>
  );

  return (
    <div className="rounded-xl border p-3 space-y-3 bg-background">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Set {setNum}</p>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground truncate font-medium">{homeName} wins</p>
        <div className="flex flex-wrap gap-1.5">
          {SET_SCORE_OPTIONS.map(([w, l]) => scoreBtn(w, l))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground truncate font-medium">{awayName} wins</p>
        <div className="flex flex-wrap gap-1.5">
          {SET_SCORE_OPTIONS.map(([w, l]) => scoreBtn(l, w))}
        </div>
      </div>

      {isTb && (
        <div className="pt-1 border-t space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Tiebreak score</p>
          <div className="flex flex-wrap gap-4">
            <TbStepper label={homeName} value={value?.homeTb ?? 0} onChange={v => onChange({ ...value!, homeTb: v })} />
            <TbStepper label={awayName} value={value?.awayTb ?? 0} onChange={v => onChange({ ...value!, awayTb: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

function TennisSetEntry({
  homeName, awayName, setsToWin,
  onSave, onCancel,
}: {
  homeName: string; awayName: string;
  setsToWin: number;
  onSave: (sets: SetScore[]) => void;
  onCancel: () => void;
}) {
  const maxSets = setsToWin * 2 - 1;
  const [entries, setEntries] = useState<(SetEntry | null)[]>(Array(maxSets).fill(null));

  const updateEntry = (i: number, v: SetEntry) => setEntries(prev => prev.map((e, idx) => idx === i ? v : e));

  // Determine how many sets to show (progressive: show next only after current entered)
  let visibleCount = 1;
  let hW = 0, aW = 0;
  for (let i = 0; i < maxSets; i++) {
    const e = entries[i];
    if (!e) break;
    if (e.home > e.away) hW++;
    else aW++;
    if (hW >= setsToWin || aW >= setsToWin) { visibleCount = i + 1; break; }
    visibleCount = i + 2;
  }
  visibleCount = Math.min(visibleCount, maxSets);

  const matchDone = hW >= setsToWin || aW >= setsToWin;
  const winnerName = matchDone ? (hW >= setsToWin ? homeName : awayName) : null;

  const handleSave = () => {
    const sets: SetScore[] = entries.slice(0, visibleCount)
      .filter((e): e is SetEntry => e !== null)
      .map(e => e.homeTb !== undefined && e.awayTb !== undefined
        ? [e.home, e.away, e.homeTb, e.awayTb]
        : [e.home, e.away]
      );
    onSave(sets);
  };

  return (
    <div className="border-t px-4 py-4 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">Enter set scores</p>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ✕ Cancel
        </button>
      </div>

      {Array.from({ length: visibleCount }, (_, i) => (
        <SetEntryPanel
          key={i}
          setNum={i + 1}
          value={entries[i]}
          onChange={v => updateEntry(i, v)}
          homeName={homeName}
          awayName={awayName}
        />
      ))}

      {winnerName && (
        <p className="text-sm font-semibold text-primary text-center">
          {winnerName} wins {hW}–{aW}
        </p>
      )}

      <Button size="sm" className="w-full" disabled={!matchDone} onClick={handleSave}>
        Save result
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single match row (for group or knockout)
// ---------------------------------------------------------------------------

function ClassicMatchRow({
  match, disabled, onSave, setsToWin = 2,
}: {
  match: any;
  disabled: boolean;
  onSave: (matchId: string, sets: SetScore[]) => void;
  setsToWin?: number;
}) {
  const [editing, setEditing] = useState(false);

  const homeName = teamLabel(match.homeTeam?.map((p: any) => p.name) ?? []);
  const awayName = teamLabel(match.awayTeam?.map((p: any) => p.name) ?? []);
  const sets = parseSets(match.setsJson);
  const locked = !!match.locked;
  const [hSets, aSets] = locked ? setsWon(sets) : [0, 0];

  const setDisplay = sets.map(([h, a, ht, at]) => {
    const base = `${h}–${a}`;
    const isTb = (h === 7 && a === 6) || (h === 6 && a === 7);
    return isTb && ht !== undefined && at !== undefined ? `${base} (${ht}–${at})` : base;
  }).join(", ");

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className={["font-semibold text-sm truncate flex-1 min-w-0", locked && hSets > aSets ? "text-primary" : ""].join(" ")}>
          {homeName}
        </span>

        <div className="shrink-0 text-center px-3">
          {locked ? (
            <div className="text-center">
              <span className="font-black text-lg tabular-nums text-primary">
                {hSets} <span className="text-muted-foreground font-light">:</span> {aSets}
              </span>
              <div className="text-xs text-muted-foreground mt-0.5">{setDisplay}</div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">vs</span>
          )}
        </div>

        <span className={["font-semibold text-sm truncate flex-1 min-w-0 text-right", locked && aSets > hSets ? "text-primary" : ""].join(" ")}>
          {awayName}
        </span>

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
              <Button size="sm" onClick={() => setEditing(true)}>Enter score</Button>
            ) : null}
          </div>
        )}
      </div>

      {editing && !disabled && (
        <TennisSetEntry
          homeName={homeName}
          awayName={awayName}
          setsToWin={setsToWin}
          onSave={(s) => { onSave(match.id, s); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group standings table
// ---------------------------------------------------------------------------

function GroupStandingsTable({ standings }: { standings: GroupStanding[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Team</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">P</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">W</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">L</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">SW</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">SL</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">GW</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">GL</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.names.join()} className={["border-t", i === 0 ? "font-semibold" : ""].join(" ")}>
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5">{teamLabel(s.names)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{s.P}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">{s.W}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{s.L}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{s.SW}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{s.SL}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{s.GW}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{s.GL}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary">{s.Pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground px-4 py-2 border-t">
        P=played · W=wins · L=losses · SW/SL=sets · GW/GL=games · Pts: W=3
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ClassicTournamentViewProps {
  tournament: any;
  scores: Record<string, { home: number | null; away: number | null; locked?: boolean; setsJson?: string }>;
  onSaveScore: (matchId: string, sets: SetScore[]) => void;
  disabled: boolean;
}

export default function ClassicTournamentView({
  tournament, scores, onSaveScore, disabled,
}: ClassicTournamentViewProps) {
  const [activeTab, setActiveTab] = useState<"groups" | "knockout">("groups");

  const rawTeams = parseTeams(tournament.teamsJson);
  const numGroups = tournament.numGroups ?? 1;
  const advancePerGroup = tournament.advancePerGroup ?? 2;
  const groups = divideIntoGroups(rawTeams, numGroups);

  const allMatches: any[] = tournament.matchScores ?? [];
  const groupMatches = allMatches.filter(m => m.phase === "group");
  const knockoutMatches = allMatches.filter(m => m.phase === "knockout");

  const allGroupLocked = groupMatches.length > 0 && groupMatches.every(m => scores[m.id]?.locked ?? m.locked);
  const hasKnockout = knockoutMatches.length > 0;

  const koRoundOrder = ["QF", "SF", "F"];
  const consolationRoundOrder = ["C-QF", "C-SF", "C-F"];

  const canAdvanceBracket = (roundOrder: string[]) => {
    const latest = roundOrder.slice().reverse().find(r => knockoutMatches.some(m => m.bracketRound === r));
    if (!latest) return false;
    const lm = knockoutMatches.filter(m => m.bracketRound === latest);
    if (!lm.every(m => scores[m.id]?.locked ?? m.locked)) return false;
    const next = latest.startsWith("C-")
      ? (latest === "C-QF" ? "C-SF" : latest === "C-SF" ? "C-F" : null)
      : (latest === "QF" ? "SF" : latest === "SF" ? "F" : null);
    return next !== null && !knockoutMatches.some(m => m.bracketRound === next);
  };
  const canAdvanceKo = canAdvanceBracket(koRoundOrder) || canAdvanceBracket(consolationRoundOrder);

  // Winner from final
  const finalMatch = knockoutMatches.find(m => m.bracketRound === "F");
  const finalScore = finalMatch ? scores[finalMatch.id] : null;
  const finalSets = parseSets(finalScore?.setsJson ?? finalMatch?.setsJson ?? null);
  const finalWinner = finalMatch && finalSets.length > 0 ? matchWinner(finalSets, tournament.setsToWin ?? 2) : null;
  const winnerTeam = finalWinner === 0 ? finalMatch?.homeTeam?.map((p: any) => p.name) : finalWinner === 1 ? finalMatch?.awayTeam?.map((p: any) => p.name) : null;

  const koRoundLabel = (r: string) => {
    if (r === "F") return "Final";
    if (r === "SF") return "Semifinals";
    if (r === "QF") return "Quarterfinals";
    if (r === "C-F") return "Consolation Final";
    if (r === "C-SF") return "Consolation Semifinals";
    if (r === "C-QF") return "Consolation Quarterfinals";
    return r;
  };
  const isConsolationRound = (r: string) => r.startsWith("C-");

  const allKoRoundOrder = [...koRoundOrder, ...consolationRoundOrder];

  const enrichedMatch = (m: any) => ({
    ...m,
    setsJson: scores[m.id]?.setsJson ?? m.setsJson,
    locked: scores[m.id]?.locked ?? m.locked,
  });

  return (
    <div className="space-y-4">
      {/* Winner banner */}
      {winnerTeam && (
        <div className="card p-4 bg-primary/5 border-primary/30 text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Tournament winner</p>
          <p className="text-xl font-black text-primary">🏆 {teamLabel(winnerTeam)}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {([
          { id: "groups", label: "Groups" },
          { id: "knockout", label: "Knockout" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {activeTab === "groups" && (
        <div className="space-y-8">
          {groups.map(g => {
            const gMatches = groupMatches.filter(m => m.groupName === g.name);
            const standings = computeGroupStandings(
              g.teams,
              gMatches.map(enrichedMatch),
            );
            const byRound: Record<number, any[]> = {};
            gMatches.forEach(m => { const r = m.round ?? 1; (byRound[r] ??= []).push(enrichedMatch(m)); });

            return (
              <div key={g.name} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Group {g.name}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <GroupStandingsTable standings={standings} />

                <div className="space-y-3">
                  {Object.entries(byRound).sort((a, b) => Number(a[0]) - Number(b[0])).map(([round, matches]) => (
                    <div key={round} className="space-y-2">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">
                        Round {round}
                      </p>
                      {matches.map(m => (
                        <ClassicMatchRow key={m.id} match={m} disabled={disabled} onSave={onSaveScore} setsToWin={tournament.setsToWin ?? 2} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Knockout tab */}
      {activeTab === "knockout" && (
        <div className="space-y-6">
          {!hasKnockout && !allGroupLocked && (
            <div className="card p-8 text-center text-muted-foreground text-sm space-y-1">
              <p className="font-medium">Complete all group matches to unlock the knockout stage</p>
              <p className="text-xs">{groupMatches.filter(m => scores[m.id]?.locked ?? m.locked).length} / {groupMatches.length} group matches done</p>
            </div>
          )}

          {!hasKnockout && allGroupLocked && (
            <div className="card p-8 text-center space-y-3">
              <p className="font-medium">Group stage complete!</p>
              <p className="text-sm text-muted-foreground">
                Top {advancePerGroup} from each of {numGroups} group{numGroups > 1 ? "s" : ""} advance
              </p>
            </div>
          )}

          {hasKnockout && (
            <div className="space-y-6">
              {/* Winners bracket */}
              {koRoundOrder.some(r => knockoutMatches.some(m => m.bracketRound === r)) && (
                <div className="space-y-5">
                  {koRoundOrder.filter(r => knockoutMatches.some(m => m.bracketRound === r)).map(round => {
                    const rMatches = knockoutMatches.filter(m => m.bracketRound === round)
                      .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0))
                      .map(enrichedMatch);
                    const allDone = rMatches.every(m => m.locked);
                    return (
                      <div key={round} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            {koRoundLabel(round)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                          {allDone && (
                            <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">✓ Complete</span>
                          )}
                        </div>
                        {rMatches.map(m => (
                          <ClassicMatchRow key={m.id} match={m} disabled={disabled} onSave={onSaveScore} setsToWin={tournament.setsToWin ?? 2} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Consolation bracket */}
              {consolationRoundOrder.some(r => knockoutMatches.some(m => m.bracketRound === r)) && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold px-2">Consolation bracket</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {consolationRoundOrder.filter(r => knockoutMatches.some(m => m.bracketRound === r)).map(round => {
                    const rMatches = knockoutMatches.filter(m => m.bracketRound === round)
                      .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0))
                      .map(enrichedMatch);
                    const allDone = rMatches.every(m => m.locked);
                    return (
                      <div key={round} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            {koRoundLabel(round)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                          {allDone && (
                            <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">✓ Complete</span>
                          )}
                        </div>
                        {rMatches.map(m => (
                          <ClassicMatchRow key={m.id} match={m} disabled={disabled} onSave={onSaveScore} setsToWin={tournament.setsToWin ?? 2} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
