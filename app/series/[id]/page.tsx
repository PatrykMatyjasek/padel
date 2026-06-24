"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [addingTournament, setAddingTournament] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async (seriesId: string) => {
    const [seriesRes, tournamentsRes] = await Promise.all([
      fetch(`/api/series/${seriesId}`),
      fetch(`/api/tournaments`),
    ]);
    const [seriesData, tournamentsData] = await Promise.all([seriesRes.json(), tournamentsRes.json()]);
    setData(seriesData);
    // Filter user's tournaments not already in a series
    setUserTournaments(
      (tournamentsData || []).filter(
        (t: any) => t.userId === session?.user?.id && !t.seriesId
      )
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (id && session) {
      load(id);
    } else if (id && !session) {
      setLoading(false);
    }
  }, [id, session, load]);

  const addTournament = async () => {
    if (!selectedTournament || !id) return;
    setAddingTournament(true);
    const res = await fetch(`/api/series/${id}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: selectedTournament }),
    });
    if (res.ok) {
      setSelectedTournament("");
      await load(id);
    }
    setAddingTournament(false);
  };

  const removeTournament = async (tid: string) => {
    if (!id || !confirm("Remove this tournament from the series?")) return;
    await fetch(`/api/series/${id}/tournaments/${tid}`, { method: "DELETE" });
    await load(id);
  };

  const saveEdit = async () => {
    if (!id) return;
    setSavingEdit(true);
    const res = await fetch(`/api/series/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      await load(id);
    }
    setSavingEdit(false);
  };

  const deleteSeries = async () => {
    if (!id || !confirm("Delete this series? Tournaments will not be deleted.")) return;
    const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    }
  };

  const copyShareLink = () => {
    if (!data?.series?.shareToken) return;
    const url = `${window.location.origin}/s/${data.series.shareToken}`;
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>;
  }

  if (!session || !data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Sign in to view this series.</p>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  const { series, standings, tournaments } = data;
  const isOwner = session?.user?.id === series.userId;

  const ruleLabel =
    series.pointsRule === "all" ? "All points"
    : series.pointsRule === "top_n" ? `Top ${series.topN}`
    : `Drop worst ${series.dropWorst}`;

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          ← Back
        </Button>
      </Link>

      {/* Header */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {editing ? (
            <div className="flex-1 space-y-3">
              <input
                className="border rounded-md px-3 py-2 text-lg font-bold w-full bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={editForm.name}
                onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
              />
              <textarea
                className="border rounded-md px-3 py-2 text-sm w-full bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={editForm.pointsRule}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, pointsRule: e.target.value }))}
                >
                  <option value="all">All points</option>
                  <option value="top_n">Top N</option>
                  <option value="drop_worst">Drop worst</option>
                </select>
                {editForm.pointsRule === "top_n" && (
                  <input
                    type="number" min="1"
                    className="border rounded-md px-3 py-2 text-sm w-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editForm.topN ?? ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, topN: Number(e.target.value) }))}
                  />
                )}
                {editForm.pointsRule === "drop_worst" && (
                  <input
                    type="number" min="1"
                    className="border rounded-md px-3 py-2 text-sm w-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editForm.dropWorst ?? ""}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, dropWorst: Number(e.target.value) }))}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">{series.name}</h1>
                {series.description && <p className="text-muted-foreground mt-1">{series.description}</p>}
                <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ruleLabel}</span>
              </div>
              {isOwner && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditForm({
                        name: series.name,
                        description: series.description,
                        pointsRule: series.pointsRule,
                        topN: series.topN,
                        dropWorst: series.dropWorst,
                      });
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={deleteSeries}>Delete</Button>
                </div>
              )}
            </>
          )}
        </div>

        {series.shareToken && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Share:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{`/s/${series.shareToken}`}</code>
            <Button size="sm" variant="ghost" onClick={copyShareLink}>Copy link</Button>
          </div>
        )}
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
              <div key={t.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/tournaments/${t.id}`} className="font-medium hover:text-primary transition-colors">
                    {t.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{new Date(t.startDate).toLocaleDateString("en-GB")}</p>
                </div>
                {isOwner && (
                  <Button size="sm" variant="ghost" onClick={() => removeTournament(t.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add tournament */}
        {isOwner && userTournaments.length > 0 && (
          <div className="flex gap-2 items-center">
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring flex-1"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
            >
              <option value="">Select a tournament to add…</option>
              {userTournaments.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button size="sm" onClick={addTournament} disabled={!selectedTournament || addingTournament}>
              {addingTournament ? "Adding…" : "Add"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}