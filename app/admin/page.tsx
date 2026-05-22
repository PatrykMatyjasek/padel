"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-5 space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-primary">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const shortDate = label.slice(5); // "MM-DD"
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-xs tabular-nums text-muted-foreground">{value > 0 ? value : ""}</span>
      <div className="w-full flex flex-col justify-end" style={{ height: 48 }}>
        <div
          className="w-full bg-primary/70 rounded-t transition-all"
          style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{shortDate}</span>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "feedback">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !(session.user as any).isAdmin) {
      router.replace("/");
      return;
    }
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/feedback").then((r) => r.json()),
    ]).then(([stats, fb]) => {
      setData(stats);
      setFeedback(Array.isArray(fb) ? fb : []);
    }).finally(() => setLoading(false));
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!data) return null;

  const { totals, daily, topPages, recentSignups, recentTournaments } = data;
  const maxViews = Math.max(...daily.map((d: any) => d.views), 1);
  const maxSignups = Math.max(...daily.map((d: any) => d.signups), 1);

  const totalSignupsLast14 = daily.reduce((s: number, d: any) => s + d.signups, 0);
  const totalViewsLast14 = daily.reduce((s: number, d: any) => s + d.views, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Global platform statistics</p>
        </div>
        <div className="border-b flex gap-0 overflow-x-auto scrollbar-none">
          {(["overview", "feedback"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize shrink-0 whitespace-nowrap",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              {t}{t === "feedback" && feedback.length > 0 ? ` (${feedback.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (<>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Registered users" value={totals.users} />
        <StatCard label="Tournaments" value={totals.tournaments} sub={`${totals.activeTournaments} active`} />
        <StatCard label="Matches played" value={totals.matchesPlayed} />
        <StatCard label="Players in DB" value={totals.players} />
        <StatCard label="Page views (all)" value={totals.pageViews} />
        <StatCard label="New users (14d)" value={totalSignupsLast14} />
      </div>

      {/* Daily page views chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Page views — last 14 days</h2>
          <span className="text-xs text-muted-foreground">{totalViewsLast14} total</span>
        </div>
        <div className="card p-4">
          <div className="flex items-end gap-1 h-16">
            {daily.map((d: any) => (
              <MiniBar key={d.date} value={d.views} max={maxViews} label={d.date} />
            ))}
          </div>
        </div>
      </div>

      {/* Daily signups chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New signups — last 14 days</h2>
          <span className="text-xs text-muted-foreground">{totalSignupsLast14} total</span>
        </div>
        <div className="card p-4">
          <div className="flex items-end gap-1 h-16">
            {daily.map((d: any) => (
              <MiniBar key={d.date} value={d.signups} max={maxSignups} label={d.date} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top pages */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Top pages (all time)</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[280px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Path</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p: any) => (
                  <tr key={p.path} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground truncate max-w-[200px]">{p.path}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Recent signups</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[320px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((u: any) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[160px]">{u.email}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
                {recentSignups.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground text-xs">No signups yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tournaments */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Recent tournaments</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Owner</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Players</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Matches</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTournaments.map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/tournaments/${t.id}`} className="hover:text-primary transition-colors">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.ownerName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{t.playerCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{t.matchCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={[
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      t.isClosed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    ].join(" ")}>
                      {t.isClosed ? "Closed" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                    {new Date(t.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      </>)}

      {tab === "feedback" && (
        <div className="space-y-4">
          {feedback.length === 0 ? (
            <div className="card p-10 text-center text-muted-foreground">
              <p className="font-medium">No feedback yet</p>
              <p className="text-sm mt-1">Feedback submitted via the widget will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((f: any) => (
                <div key={f.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.rating && (
                        <span className="text-yellow-400 font-medium text-sm">
                          {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {f.name || "Anonymous"}
                        {f.email ? ` · ${f.email}` : ""}
                        {f.page ? ` · ${f.page}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(f.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <p className="text-sm">{f.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
