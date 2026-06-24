"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PadelTournamentBuilder from "@/components/PadelTournamentBuilder";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Tab = "tournaments" | "players" | "series" | "stats" | "new";
type StatsFormat = "all" | "AM" | "MX" | "CL";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function HomePage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("tournaments");
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ name: "", description: "", pointsRule: "all", topN: "", dropWorst: "" });
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [statsFormat, setStatsFormat] = useState<StatsFormat>("all");

  useEffect(() => {
    if (tab === "tournaments") {
      fetch("/api/tournaments").then((r) => r.json()).then(setTournaments);
    }
    if (tab === "players") {
      fetch("/api/players").then((r) => r.json()).then(setPlayers);
    }
    if (tab === "stats" && session) {
      fetch("/api/stats").then((r) => r.json()).then(setStats);
    }
    if (tab === "series" && session) {
      fetch("/api/series").then((r) => r.json()).then(setSeriesList);
    }
  }, [tab, session]);

  // Re-fetch tournaments when session changes (login/logout)
  useEffect(() => {
    fetch("/api/tournaments").then((r) => r.json()).then(setTournaments);
  }, [session]);

  const addPlayer = async () => {
    const name = playerName.trim();
    if (!name) return;
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const newPlayer = await res.json();
      setPlayers((prev) => [...prev, newPlayer]);
      setPlayerName("");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "tournaments", label: "Tournaments" },
    { id: "players", label: "Players" },
    ...(session ? [{ id: "series" as Tab, label: "Series" }] : []),
    ...(session ? [{ id: "stats" as Tab, label: "Statistics" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Guest banner */}
      {!session && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Register to save your tournaments and access them from any device.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Register</Button></Link>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b flex gap-0 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tournaments */}
      {tab === "tournaments" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">
              {session ? `${session.user.name}'s Tournaments` : "Tournaments"}
            </h1>
            <Button onClick={() => setTab("new")} size="sm" className="shrink-0">
              + New tournament
            </Button>
          </div>
          {tournaments.length === 0 ? (
            <div className="card p-10 text-center space-y-4">
              <p className="font-medium text-muted-foreground">No tournaments yet</p>
              <Button onClick={() => setTab("new")} size="lg" className="w-full sm:w-auto">
                + Create your first tournament
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Series */}
      {tab === "series" && session && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">Series</h1>
            <Button size="sm" className="shrink-0" onClick={() => setShowSeriesForm(true)}>
              + Create series
            </Button>
          </div>

          {showSeriesForm && (
            <form
              className="card p-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setCreatingSeries(true);
                const res = await fetch("/api/series", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: seriesForm.name,
                    description: seriesForm.description || undefined,
                    pointsRule: seriesForm.pointsRule,
                    topN: seriesForm.pointsRule === "top_n" && seriesForm.topN ? Number(seriesForm.topN) : undefined,
                    dropWorst: seriesForm.pointsRule === "drop_worst" && seriesForm.dropWorst ? Number(seriesForm.dropWorst) : undefined,
                  }),
                });
                if (res.ok) {
                  const created = await res.json();
                  setSeriesList((prev) => [created, ...prev]);
                  setShowSeriesForm(false);
                  setSeriesForm({ name: "", description: "", pointsRule: "all", topN: "", dropWorst: "" });
                }
                setCreatingSeries(false);
              }}
            >
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-3">
                  <input
                    required
                    type="text"
                    placeholder="Series name"
                    className="border rounded-md px-3 py-2 text-sm w-full bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={seriesForm.name}
                    onChange={(e) => setSeriesForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    className="border rounded-md px-3 py-2 text-sm w-full bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={2}
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <select
                      className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={seriesForm.pointsRule}
                      onChange={(e) => setSeriesForm((f) => ({ ...f, pointsRule: e.target.value }))}
                    >
                      <option value="all">All points</option>
                      <option value="top_n">Top N</option>
                      <option value="drop_worst">Drop worst</option>
                    </select>
                    {seriesForm.pointsRule === "top_n" && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Top N"
                        className="border rounded-md px-3 py-2 text-sm w-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={seriesForm.topN}
                        onChange={(e) => setSeriesForm((f) => ({ ...f, topN: e.target.value }))}
                      />
                    )}
                    {seriesForm.pointsRule === "drop_worst" && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Drop worst"
                        className="border rounded-md px-3 py-2 text-sm w-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={seriesForm.dropWorst}
                        onChange={(e) => setSeriesForm((f) => ({ ...f, dropWorst: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button type="submit" size="sm" disabled={creatingSeries}>
                    {creatingSeries ? "Creating…" : "Create"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowSeriesForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {seriesList.length === 0 ? (
            <div className="card p-10 text-center space-y-4">
              <p className="font-medium text-muted-foreground">No series yet</p>
              <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowSeriesForm(true)}>
                + Create your first series
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {seriesList.map((s) => <SeriesCard key={s.id} series={s} />)}
            </div>
          )}
        </section>
      )}

      {/* Players */}
      {tab === "players" && (
        <section className="space-y-4">
          <h1 className="text-xl font-bold">Players</h1>
          {!session ? (
            <div className="border rounded-lg p-10 text-center text-muted-foreground space-y-3">
              <p className="font-medium">Sign in to manage your player roster</p>
              <p className="text-sm">Your players are saved to your account and available across all your tournaments.</p>
              <div className="flex justify-center gap-2">
                <Link href="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
                <Link href="/register"><Button size="sm">Register</Button></Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Player name"
                  className="border rounded-md px-3 py-2 text-sm flex-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                />
                <Button size="sm" onClick={addPlayer}>Add</Button>
              </div>
              {players.length === 0 ? (
                <EmptyState text="No players yet" hint="Add a player by typing a name above" />
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Player</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium">
                            <Link href={`/players/${p.id}`} className="hover:text-primary transition-colors">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link href={`/players/${p.id}`} className="text-sm text-primary hover:underline">Details →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Statistics */}
      {tab === "stats" && session && (
        <section className="space-y-6">
          <h1 className="text-xl font-bold">Statistics</h1>
          {!stats ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Summary cards — always show all-time totals */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Tournaments" value={stats.totals.tournaments} />
                <StatCard label="Matches played" value={stats.totals.matchesPlayed} />
                <StatCard label="Players" value={stats.totals.players} />
              </div>

              {/* Format filter tabs */}
              <div className="border-b flex gap-0 overflow-x-auto scrollbar-none">
                {([
                  { id: "all", label: "All formats" },
                  { id: "AM", label: `Americano (${stats.byFormat.AM.totals.tournaments})` },
                  { id: "MX", label: `Mexicano (${stats.byFormat.MX.totals.tournaments})` },
                  { id: "CL", label: `Classic (${stats.byFormat.CL.totals.tournaments})` },
                ] as { id: StatsFormat; label: string }[]).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatsFormat(f.id)}
                    className={[
                      "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 whitespace-nowrap",
                      statsFormat === f.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Leaderboard for selected format */}
              {(() => {
                const view = statsFormat === "all" ? { players: stats.players, totals: stats.totals } : stats.byFormat[statsFormat];
                const formatLabel = statsFormat === "all" ? "All-time" : statsFormat === "AM" ? "Americano" : statsFormat === "MX" ? "Mexicano" : "Classic";
                return view.players.length === 0 ? (
                  <EmptyState
                    text="No match data yet"
                    hint={statsFormat === "all" ? "Save scores in your tournaments to see player rankings here" : `No scored matches in ${formatLabel} tournaments yet`}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-semibold">{formatLabel} leaderboard</h2>
                      {statsFormat !== "all" && (
                        <span className="text-xs text-muted-foreground">
                          {view.totals.tournaments} {view.totals.tournaments === 1 ? "tournament" : "tournaments"} · {view.totals.matchesPlayed} matches
                        </span>
                      )}
                    </div>
                    <div className="card overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[420px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Player</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pts</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">M</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Avg</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">W</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">T</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">🏆</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">🥇</th>
                            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {view.players.map((p: any, i: number) => (
                            <tr key={p.id} className={["border-t", i === 0 ? "font-semibold" : ""].join(" ")}>
                              <td className="px-4 py-2.5 text-muted-foreground">
                                {MEDALS[i] ?? i + 1}
                              </td>
                              <td className="px-4 py-2.5">
                                <Link href={`/players/${p.id}`} className="hover:text-primary transition-colors">
                                  {p.name}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{p.points}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{p.matches}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                                {p.matches > 0 ? (p.points / p.matches).toFixed(1) : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.wins}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{p.tournamentsPlayed}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.podiums}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.tournamentWins}</td>
                              <td className="px-4 py-2.5 text-right">
                                <Link href={`/players/${p.id}`} className="text-sm text-primary hover:underline">Details →</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground px-1">
                      M = matches played · Avg = pts/match · W = match wins · T = tournaments · 🏆 = podium finishes (top 3) · 🥇 = tournament wins — podiums and titles from closed tournaments only
                    </p>
                  </div>
                );
              })()}
            </>
          )}
        </section>
      )}

      {/* New tournament */}
      {tab === "new" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("tournaments")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">New tournament</h1>
          </div>
          <PadelTournamentBuilder
            tournaments={tournaments}
            setTournaments={setTournaments}
            onCreated={() => setTab("tournaments")}
          />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

function SeriesCard({ series }: { series: any }) {
  const ruleLabel = series.pointsRule === "all" ? "All points"
    : series.pointsRule === "top_n" ? `Top ${series.topN}`
    : `Drop worst ${series.dropWorst}`;

  return (
    <Link href={`/series/${series.id}`} className="block">
      <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow min-h-[100px]">
        <div className="flex items-start justify-between">
          <span className="font-semibold truncate">{series.name}</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 ml-2">{ruleLabel}</span>
        </div>
        {series.description && <p className="text-sm text-muted-foreground line-clamp-2">{series.description}</p>}
        <p className="text-sm text-muted-foreground">{series._count.tournaments} {series._count.tournaments === 1 ? "tournament" : "tournaments"}</p>
        <div className="flex justify-end mt-auto">
          <span className="text-sm text-primary font-medium">Details →</span>
        </div>
      </div>
    </Link>
  );
}

function TournamentCard({ tournament }: { tournament: any }) {
  const date = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString("en-GB")
    : null;
  const formatLabel = tournament.format === "AM" ? "Americano" : tournament.format === "MX" ? "Mexicano" : "Classic";
  const playerCount = tournament.players?.length ?? 0;
  const matches = tournament.matchScores ?? [];
  const played = matches.filter((m: any) => m.locked).length;

  const hasDrawn = matches.length > 0;
  const statusLabel = tournament.isClosed ? "Closed" : hasDrawn ? "Active" : "Upcoming";
  const statusClass = tournament.isClosed
    ? "bg-muted text-muted-foreground"
    : hasDrawn
    ? "bg-primary/10 text-primary"
    : "bg-yellow-100 text-yellow-800";

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block">
      <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow min-h-[120px]">
        {tournament.series && (
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded w-fit">Part of {tournament.series.name}</span>
        )}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{tournament.name}</span>
            <span className={statusClass + " text-xs px-2 py-0.5 rounded-full font-medium"}>{statusLabel}</span>
          </div>
          <span className="text-sm text-muted-foreground shrink-0">{date}</span>
        </div>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {tournament.location && <span>{tournament.location}</span>}
          <span>{formatLabel}</span>
          <span>{playerCount} {playerCount === 1 ? "player" : "players"}</span>
          {matches.length > 0 && <span>{played}/{matches.length} matches played</span>}
        </div>
        <div className="flex justify-end mt-auto">
          <span className="text-sm text-primary font-medium">Details →</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="card p-10 text-center text-muted-foreground">
      <p className="font-medium">{text}</p>
      <p className="text-sm mt-1">{hint}</p>
    </div>
  );
}
