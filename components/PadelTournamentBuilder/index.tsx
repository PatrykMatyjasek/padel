"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PadelTournamentBuilderProps {
  tournaments: any[];
  setTournaments: (t: any[]) => void;
  onCreated?: () => void;
}

const BLANK = {
  name: "",
  location: "",
  startDate: "",
  format: "AM",
  courts: 2,
  pointsPerMatch: 21,
  mexicanoRounds: 5,
  players: [] as string[],
};

export default function PadelTournamentBuilder({
  tournaments,
  setTournaments,
  onCreated,
}: PadelTournamentBuilderProps) {
  const [form, setForm] = useState(BLANK);
  const [playerName, setPlayerName] = useState("");
  const [existingPlayers, setExistingPlayers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => setExistingPlayers(data.map((p: any) => p.name)));
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addPlayer = (name?: string) => {
    const n = (name || playerName).trim();
    if (!n || form.players.includes(n)) return;
    set("players", [...form.players, n]);
    setPlayerName("");
  };

  const removePlayer = (i: number) =>
    set("players", form.players.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!form.name.trim()) return alert("Tournament name is required");
    if (!form.startDate) return alert("Start date is required");
    if (form.players.length < 4) return alert("Add at least 4 players");

    setSaving(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setTournaments([...tournaments, saved]);
      setForm(BLANK);
      if (saved.shareToken) {
        setShareToken(saved.shareToken);
      } else {
        onCreated?.();
      }
    } catch (err) {
      alert(`Failed to create tournament: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const available = existingPlayers.filter((p) => !form.players.includes(p));

  // Share link screen shown after successful creation
  if (shareToken) {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/t/${shareToken}`;
    return (
      <div className="border rounded-lg p-6 space-y-4 max-w-xl">
        <div className="space-y-1">
          <h2 className="font-semibold text-lg">Tournament created!</h2>
          <p className="text-sm text-muted-foreground">
            Share this link so anyone can view and enter scores — no login required.
          </p>
        </div>
        <div className="flex gap-2">
          <input readOnly className="input flex-1 text-sm" value={shareUrl} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
          >
            Copy
          </Button>
        </div>
        <Button onClick={() => { setShareToken(null); onCreated?.(); }}>
          Go to tournaments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Basic info */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Information
        </legend>
        <FormRow label="Tournament name">
          <input
            type="text"
            className="input"
            placeholder="e.g. Spring Tournament 2025"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormRow>
        <FormRow label="Location">
          <input
            type="text"
            className="input"
            placeholder="e.g. London, Club XYZ"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </FormRow>
        <FormRow label="Start date">
          <input
            type="date"
            className="input"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </FormRow>
      </fieldset>

      {/* Settings */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Settings
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Format">
            <select className="input" value={form.format} onChange={(e) => set("format", e.target.value)}>
              <option value="AM">Americano</option>
              <option value="MX">Mexicano</option>
            </select>
          </FormRow>
          <FormRow label="Courts">
            <input
              type="number"
              min={1}
              className="input"
              value={form.courts}
              onChange={(e) => set("courts", parseInt(e.target.value) || 1)}
            />
          </FormRow>
          <FormRow label="Points per match">
            <input
              type="number"
              min={1}
              className="input"
              value={form.pointsPerMatch}
              onChange={(e) => set("pointsPerMatch", parseInt(e.target.value) || 21)}
            />
          </FormRow>
          {form.format === "MX" && (
            <FormRow label="Rounds">
              <input
                type="number"
                min={1}
                className="input"
                value={form.mexicanoRounds}
                onChange={(e) => set("mexicanoRounds", parseInt(e.target.value) || 5)}
              />
            </FormRow>
          )}
        </div>
      </fieldset>

      {/* Players */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Players ({form.players.length})
        </legend>
        <div className="flex gap-2">
          {available.length > 0 && (
            <select className="input flex-1" value="" onChange={(e) => addPlayer(e.target.value)}>
              <option value="">Select existing player</option>
              {available.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <input
            type="text"
            placeholder="New player"
            className="input flex-1"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          />
          <Button variant="outline" size="sm" onClick={() => addPlayer()}>Add</Button>
        </div>

        {form.players.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {form.players.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm">
                <span>{p}</span>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                  onClick={() => removePlayer(i)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {form.players.length > 0 && form.players.length % 2 !== 0 && (
          <p className="text-sm text-muted-foreground">
            Odd number of players — one player will sit out each round
          </p>
        )}
      </fieldset>

      <Button onClick={create} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Creating…" : "Create tournament"}
      </Button>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
