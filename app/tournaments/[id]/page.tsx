"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import TournamentDetails from "@/components/TournamentDetails";
import TournamentSchedule from "@/components/TournamentSchedule";
import TournamentScoreTable from "@/components/TournamentScoreTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Score {
  home: number | null;
  away: number | null;
  locked?: boolean;
}

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const { data: session } = useSession();
  const [tournament, setTournament] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [activeSection, setActiveSection] = useState<"schedule" | "table">("schedule");
  const [generating, setGenerating] = useState(false);
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
      map[m.id] = { home: m.homeScore, away: m.awayScore, locked: m.locked };
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

  const hasSchedule = (tournament.matchScores?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
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
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  disabled={generating}
                  onClick={() => {
                    if (confirm("Regenerate schedule? All existing scores will be deleted.")) {
                      generateSchedule(true);
                    }
                  }}
                >
                  {generating ? "Generating…" : "↺ Regenerate"}
                </Button>
              </div>
            )}
            <TournamentSchedule
              tournament={tournament}
              scores={scores}
              onSaveScore={saveScore}
            />
          </div>
        )
      )}

      {activeSection === "table" && (
        <TournamentScoreTable tournament={tournament} scores={scores} />
      )}
    </div>
  );
}
