"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const MEDALS = ["🥇", "🥈", "🥉"];

function WinRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color =
    pct >= 60 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-primary">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/players/${id}/stats`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, session]);

  if (!session) {
    return (
      <div className="card p-10 text-center text-muted-foreground space-y-3">
        <p className="font-medium">Sign in to view player profiles</p>
        <Link href="/login"><Button size="sm">Sign in</Button></Link>
      </div>
    );
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="card p-10 text-center text-muted-foreground">
        <p className="font-medium">Player not found</p>
        <Link href="/"><Button variant="outline" size="sm" className="mt-3">Back</Button></Link>
      </div>
    );
  }

  const { player, stats, partners, rivals, tournaments } = data;

  const bestPartner = partners.filter((p: any) => p.matches >= 2).sort((a: any, b: any) => b.winRate - a.winRate)[0];
  const worstPartner = partners.filter((p: any) => p.matches >= 2).sort((a: any, b: any) => a.winRate - b.winRate)[0];
  const bestRival = rivals.filter((p: any) => p.matches >= 2).sort((a: any, b: any) => b.winRate - a.winRate)[0];
  const worstRival = rivals.filter((p: any) => p.matches >= 2).sort((a: any, b: any) => a.winRate - b.winRate)[0];

  const hasHighlights = bestPartner || worstPartner || bestRival || worstRival;

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          ← Back
        </Button>
      </Link>

      {/* Hero */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <p className="text-sm text-muted-foreground">Player profile</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Matches" value={stats.matches} />
        <StatCard label="Points" value={stats.points} sub={stats.matches > 0 ? `${(stats.points / stats.matches).toFixed(1)} avg` : undefined} />
        <StatCard label="Win rate" value={`${Math.round(stats.winRate * 100)}%`} sub={`${stats.wins} wins`} />
        <StatCard label="Tournaments" value={stats.tournamentsPlayed} />
      </div>

      {/* Achievements */}
      {(stats.tournamentWins > 0 || stats.podiums > 0) && (
        <Section title="Achievements">
          <div className="flex flex-wrap gap-3">
            {stats.tournamentWins > 0 && (
              <div className="card px-4 py-3 flex items-center gap-2">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="font-semibold text-sm">{stats.tournamentWins} Tournament {stats.tournamentWins === 1 ? "win" : "wins"}</p>
                  <p className="text-xs text-muted-foreground">Finished 1st place</p>
                </div>
              </div>
            )}
            {stats.podiums > 0 && (
              <div className="card px-4 py-3 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-semibold text-sm">{stats.podiums} Podium {stats.podiums === 1 ? "finish" : "finishes"}</p>
                  <p className="text-xs text-muted-foreground">Top 3 in a tournament</p>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Quick highlights */}
      {hasHighlights && (
        <Section title="Highlights">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bestPartner && bestPartner !== worstPartner && (
              <div className="card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Best partner</p>
                <p className="font-semibold">{bestPartner.name}</p>
                <WinRateBar rate={bestPartner.winRate} />
                <p className="text-xs text-muted-foreground">{bestPartner.wins}W / {bestPartner.matches - bestPartner.wins}L in {bestPartner.matches} matches</p>
              </div>
            )}
            {worstPartner && worstPartner !== bestPartner && (
              <div className="card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Worst partner</p>
                <p className="font-semibold">{worstPartner.name}</p>
                <WinRateBar rate={worstPartner.winRate} />
                <p className="text-xs text-muted-foreground">{worstPartner.wins}W / {worstPartner.matches - worstPartner.wins}L in {worstPartner.matches} matches</p>
              </div>
            )}
            {bestRival && (
              <div className="card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Favourite opponent</p>
                <p className="font-semibold">{bestRival.name}</p>
                <WinRateBar rate={bestRival.winRate} />
                <p className="text-xs text-muted-foreground">{bestRival.wins}W / {bestRival.matches - bestRival.wins}L in {bestRival.matches} matches</p>
              </div>
            )}
            {worstRival && worstRival.id !== bestRival?.id && (
              <div className="card p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Toughest opponent</p>
                <p className="font-semibold">{worstRival.name}</p>
                <WinRateBar rate={worstRival.winRate} />
                <p className="text-xs text-muted-foreground">{worstRival.wins}W / {worstRival.matches - worstRival.wins}L in {worstRival.matches} matches</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Partners table */}
      {partners.length > 0 && (
        <Section title="Partner record">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Partner</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">M</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">W</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pts</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground w-32">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.matches}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.wins}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.points}</td>
                    <td className="px-4 py-2.5">
                      <WinRateBar rate={p.winRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Rivals table */}
      {rivals.length > 0 && (
        <Section title="Head-to-head vs opponents">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Opponent</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">M</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">W</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pts</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground w-32">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {rivals.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.matches}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.wins}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.points}</td>
                    <td className="px-4 py-2.5">
                      <WinRateBar rate={p.winRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Tournament history */}
      {tournaments.length > 0 && (
        <Section title="Tournament history">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tournament</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Points</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {t.rank !== null ? (MEDALS[t.rank - 1] ?? t.rank) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/tournaments/${t.id}`} className="hover:text-primary transition-colors">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{t.points}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={[
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        t.isClosed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                      ].join(" ")}>
                        {t.isClosed ? "Closed" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {stats.matches === 0 && (
        <div className="card p-10 text-center text-muted-foreground">
          <p className="font-medium">No match data yet</p>
          <p className="text-sm mt-1">Stats will appear once this player has scored matches</p>
        </div>
      )}
    </div>
  );
}
