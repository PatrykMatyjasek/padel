"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import TournamentDetails from "@/components/TournamentDetails";
import TournamentSchedule from "@/components/TournamentSchedule";
import TournamentScoreTable from "@/components/TournamentScoreTable";
import ClassicTournamentView from "@/components/ClassicTournamentView";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import type { SetScore } from "@/lib/classic";

interface Score {
  home: number | null;
  away: number | null;
  locked?: boolean;
  setsJson?: string;
}

export default function ClientPage({ id }: { id: string }) {
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [activeSection, setActiveSection] = useState<"schedule" | "table">("schedule");
  const [generating, setGenerating] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [generatingKo, setGeneratingKo] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    const [tRes, mRes] = await Promise.all([
      fetch(`/api/tournaments/${id}`),
      fetch(`/api/match-scores?tid=${id}`),
    ]);
    const [tData, mData] = await Promise.all([tRes.json(), mRes.json()]);
    setTournament(tData);

    const map: Record<string, Score> = {};
    (mData || []).forEach((m: any) => {
      map[m.id] = { home: m.homeScore, away: m.awayScore, locked: m.locked, setsJson: m.setsJson };
    });
    setScores(map);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveScore = (matchId: string, homeScore: number, awayScore: number) => {
    if (tournament?.isClosed) return;
    const updated: Score = { home: homeScore, away: awayScore, locked: true };
    setScores((prev) => ({ ...prev, [matchId]: updated }));
    fetch(`/api/match-scores/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore }),
    });
  };

  const saveTennisSets = (matchId: string, sets: SetScore[]) => {
    if (tournament?.isClosed) return;
    const setsJson = JSON.stringify(sets);
    const [homeScore, awayScore] = sets.reduce<[number, number]>(
      ([h, a], [hg, ag]) => hg > ag ? [h + 1, a] : ag > hg ? [h, a + 1] : [h, a],
      [0, 0]
    );
    setScores(prev => ({ ...prev, [matchId]: { home: homeScore, away: awayScore, locked: true, setsJson } }));
    fetch(`/api/match-scores/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setsJson }),
    });
  };

  const toggleClose = async () => {
    const action = tournament.isClosed ? "reopen" : "close";
    if (!confirm(`${action === "close" ? "Close" : "Reopen"} this tournament?`)) return;
    setClosing(true);
    await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: !tournament.isClosed }),
    });
    await load();
    setClosing(false);
  };

  const generateSchedule = async (force = false) => {
    setGenerating(true);
    try {
      const url = `/api/tournaments/${id}/generate-schedule${force ? "?force=true" : ""}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate schedule");
        return;
      }
      await load();
    } catch {
      alert("Error generating schedule");
    } finally {
      setGenerating(false);
    }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const generateKnockout = async () => {
    setGeneratingKo(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/generate-knockout`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate knockout");
        return;
      }
      await load();
    } catch {
      alert("Error generating knockout");
    } finally {
      setGeneratingKo(false);
    }
  };

  const generateNextRound = async () => {
    setGeneratingNext(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/generate-next-round`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate next round");
        return;
      }
      await load();
    } catch {
      alert("Error generating next round");
    } finally {
      setGeneratingNext(false);
    }
  };

  const hasSchedule = (tournament.matchScores?.length ?? 0) > 0;

  const isMexicano = tournament.format === "MX";
  const allMatches: any[] = tournament.matchScores ?? [];
  const maxRound = allMatches.length > 0 ? Math.max(...allMatches.map((m: any) => m.round)) : 0;
  const currentRoundComplete =
    maxRound > 0 && allMatches.filter((m: any) => m.round === maxRound).every((m: any) => scores[m.id]?.locked);
  const canGenerateNextRound =
    isMexicano && hasSchedule && currentRoundComplete && maxRound < tournament.mexicanoRounds && !tournament.isClosed;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": tournament.name,
    "description": `${tournament.format === "AM" ? "Americano" : tournament.format === "MX" ? "Mexicano" : "Classic"} padel tournament`,
    "sport": "Padel",
    "eventStatus": "https://schema.org/EventScheduled",
    "startDate": tournament.startDate ? new Date(tournament.startDate).toISOString() : undefined,
    "location": tournament.location ? { "@type": "Place", "name": tournament.location } : undefined,
    "organizer": { "@type": "Person", "name": "Padel Manager" },
    "participant": tournament.players?.map((p: any) => ({ "@type": "Person", "name": p.name })),
  };

  return (
    <div className="space-y-6">
      <JsonLd data={schema} />
      <Link href="/">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          ← Back
        </Button>
      </Link>

      <TournamentDetails tournament={tournament} />

      {/* Close / Reopen — only for the tournament owner */}
      {session?.user?.id && tournament.userId === session.user.id && (
        <div className="flex justify-end">
          {tournament.isClosed ? (
            <Button variant="outline" size="sm" onClick={toggleClose} disabled={closing}>
              {closing ? "Reopening…" : "↺ Reopen tournament"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={toggleClose}
              disabled={closing}
            >
              {closing ? "Closing…" : "✓ Close tournament"}
            </Button>
          )}
        </div>
      )}

      {/* Classic format: integrated group + knockout view */}
      {tournament.format === "CL" && (
        <div className="space-y-4">
          {!hasSchedule && !tournament.isClosed ? (
            <div className="card p-10 text-center space-y-3">
              <p className="font-medium">Generate group stage</p>
              <p className="text-sm text-muted-foreground">
                Classic · {tournament.numGroups ?? 1} group{(tournament.numGroups ?? 1) > 1 ? "s" : ""} · {tournament.players?.length ?? 0} players
              </p>
              <Button onClick={() => generateSchedule(false)} disabled={generating}>
                {generating ? "Generating…" : "Generate groups"}
              </Button>
            </div>
          ) : (
            <>
              {!tournament.isClosed && (
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {(() => {
                    const gm = (tournament.matchScores ?? []).filter((m: any) => m.phase === "group");
                    const km = (tournament.matchScores ?? []).filter((m: any) => m.phase === "knockout");
                    const allGroupDone = gm.length > 0 && gm.every((m: any) => scores[m.id]?.locked ?? m.locked);

                    const checkAdvance = (rounds: string[]) => {
                      const latest = rounds.slice().reverse().find((r: string) => km.some((m: any) => m.bracketRound === r)) ?? null;
                      if (!latest) return { can: false, next: null as string | null };
                      const allDone = km.filter((m: any) => m.bracketRound === latest).every((m: any) => scores[m.id]?.locked ?? m.locked);
                      const map: Record<string, string> = { QF: "SF", SF: "F", "C-QF": "C-SF", "C-SF": "C-F" };
                      const next = map[latest] ?? null;
                      return { can: allDone && next !== null && !km.some((m: any) => m.bracketRound === next), next };
                    };

                    const winners = checkAdvance(["QF", "SF", "F"]);
                    const consolation = checkAdvance(["C-QF", "C-SF", "C-F"]);
                    const canAdvance = winners.can || consolation.can;
                    const nextLabel = winners.can && consolation.can
                      ? "next rounds"
                      : winners.can ? winners.next
                      : consolation.next?.replace("C-", "Consolation ");

                    if (!km.length && allGroupDone) {
                      return (
                        <Button size="sm" onClick={generateKnockout} disabled={generatingKo}>
                          {generatingKo ? "Generating…" : "Generate knockout bracket"}
                        </Button>
                      );
                    }
                    if (canAdvance) {
                      return (
                        <Button size="sm" onClick={generateKnockout} disabled={generatingKo}>
                          {generatingKo ? "Generating…" : `Generate ${nextLabel}`}
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-muted-foreground"
                    disabled={generating}
                    onClick={() => { if (confirm("Regenerate? All scores will be deleted.")) generateSchedule(true); }}
                  >
                    {generating ? "Generating…" : "↺ Regenerate"}
                  </Button>
                </div>
              )}
              <ClassicTournamentView
                tournament={tournament}
                scores={scores}
                onSaveScore={saveTennisSets}
                disabled={!!tournament.isClosed}
              />
            </>
          )}
        </div>
      )}

      {/* Americano / Mexicano: existing schedule + standings tabs */}
      {tournament.format !== "CL" && (
        <>
          {/* Section toggle */}
          <div className="border-b flex gap-0">
            {(["schedule", "table"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={[
                  "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                  activeSection === s
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                ].join(" ")}
              >
                {s === "schedule" ? "Schedule" : "Standings"}
              </button>
            ))}
          </div>

          {activeSection === "schedule" && (
            !hasSchedule && !tournament.isClosed ? (
              <div className="card p-10 text-center space-y-3">
                <p className="font-medium">Schedule not generated yet</p>
                <p className="text-sm text-muted-foreground">
                  {tournament.format === "AM" ? "Americano" : "Mexicano"} · {tournament.players?.length ?? 0} players
                </p>
                <Button onClick={() => generateSchedule(false)} disabled={generating}>
                  {generating ? "Generating…" : "Generate schedule"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!tournament.isClosed && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {canGenerateNextRound ? (
                      <Button size="sm" onClick={generateNextRound} disabled={generatingNext}>
                        {generatingNext ? "Generating…" : `Generate round ${maxRound + 1}`}
                      </Button>
                    ) : <div />}
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-muted-foreground"
                      disabled={generating}
                      onClick={() => { if (confirm("Regenerate schedule? All existing scores will be deleted.")) generateSchedule(true); }}
                    >
                      {generating ? "Generating…" : "↺ Regenerate"}
                    </Button>
                  </div>
                )}
                <TournamentSchedule tournament={tournament} scores={scores} onSaveScore={saveScore} />
              </div>
            )
          )}

          {activeSection === "table" && (
            <TournamentScoreTable tournament={tournament} scores={scores} />
          )}
        </>
      )}
    </div>
  );
}