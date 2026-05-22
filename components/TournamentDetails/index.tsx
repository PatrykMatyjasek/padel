"use client";

import React from "react";

export default function TournamentDetails({ tournament }: { tournament: any }) {
  const date = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString("en-GB")
    : "—";

  const items: { label: string; value: string }[] = [
    { label: "Location", value: tournament.location || "—" },
    { label: "Start date", value: date },
    { label: "Format", value: tournament.format === "AM" ? "Americano" : "Mexicano" },
    { label: "Courts", value: String(tournament.courts) },
    { label: "Points per match", value: String(tournament.pointsPerMatch) },
    ...(tournament.format === "MX"
      ? [{ label: "Rounds", value: String(tournament.mexicanoRounds) }]
      : []),
    { label: "Players", value: String(tournament.players?.length ?? 0) },
  ];

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <span
          className={[
            "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
            tournament.isClosed
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          ].join(" ")}
        >
          {tournament.isClosed ? "Closed" : "Active"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(({ label, value }) => (
          <div key={label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
