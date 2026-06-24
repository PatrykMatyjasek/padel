"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ShareSeriesPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/series/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>;
  }

  if (!data || data.error) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Series not found or link is invalid.</p>
        <Link href="/"><Button>Go home</Button></Link>
      </div>
    );
  }

  const { series, standings, tournaments } = data;

  const ruleLabel =
    series.pointsRule === "all" ? "All points"
    : series.pointsRule === "top_n" ? `Top ${series.topN}`
    : `Drop worst ${series.dropWorst}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">Shared series</span>
        <span>·</span>
        <span>via Padel Manager</span>
      </div>

      <div className="card p-5 space-y-3">
        <h1 className="text-2xl font-bold">{series.name}</h1>
        {series.description && <p className="text-muted-foreground">{series.description}</p>}
        <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ruleLabel}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Copied!" : "Copy share link"}
          </Button>
          <Link href="/">
            <Button size="sm" variant="ghost">Open Padel Manager →</Button>
          </Link>
        </div>
      </div>

      {/* Standings */}
      {standings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Standings</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Player</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Points</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Tournaments</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((p: any, i: number) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2.5">{MEDALS[i] ?? i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{p.points}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.tournamentsPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tournaments */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tournaments ({tournaments.length})</h2>
        {tournaments.length === 0 ? (
          <div className="card p-8 text-center text-muted-foreground text-sm">No tournaments in this series yet</div>
        ) : (
          <div className="grid gap-3">
            {tournaments.map((t: any) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="block">
                <div className="card p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                  <div>
                    <span className="font-medium">{t.name}</span>
                    <p className="text-sm text-muted-foreground">{new Date(t.startDate).toLocaleDateString("en-GB")}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}