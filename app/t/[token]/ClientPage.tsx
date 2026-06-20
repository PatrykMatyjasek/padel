"use client";

import React, { useState, useEffect, useCallback } from "react";
import TournamentDetails from "@/components/TournamentDetails";
import TournamentSchedule from "@/components/TournamentSchedule";
import TournamentScoreTable from "@/components/TournamentScoreTable";

interface Score {
  home: number | null;
  away: number | null;
  locked?: boolean;
}

export default function ClientPage({ token }: { token: string }) {
  const [tournament, setTournament] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [activeSection, setActiveSection] = useState<"schedule" | "table">("schedule");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/share/${token}`);
    if (!res.ok) { setNotFound(true); return; }
    const data = await res.json();
    setTournament(data);
    const map: Record<string, Score> = {};
    (data.matchScores || []).forEach((m: any) => {
      map[m.id] = { home: m.homeScore, away: m.awayScore, locked: m.locked };
    });
    setScores(map);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveScore = (matchId: string, homeScore: number, awayScore: number) => {
    if (tournament?.isClosed) return;
    setScores((prev) => ({ ...prev, [matchId]: { home: homeScore, away: awayScore, locked: true } }));
    fetch(`/api/match-scores/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore }),
    });
  };

  if (notFound) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="font-medium">Tournament not found</p>
        <p className="text-sm mt-1">This share link may be invalid or expired.</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TournamentDetails tournament={tournament} />

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
        <TournamentSchedule
          tournament={tournament}
          scores={scores}
          onSaveScore={saveScore}
        />
      )}

      {activeSection === "table" && (
        <TournamentScoreTable tournament={tournament} scores={scores} />
      )}
    </div>
  );
}