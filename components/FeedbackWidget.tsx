"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= n ? "text-yellow-400" : "text-muted-foreground/30"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export default function FeedbackWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const reset = () => {
    setRating(0);
    setMessage("");
    setDone(false);
    if (!session?.user) { setName(""); setEmail(""); }
  };

  const handleOpen = () => {
    reset();
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, rating: rating || null, name, email, page: pathname }),
    });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed bottom-5 right-4 sm:right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          ref={panelRef}
          className="card w-[min(320px,calc(100vw-2rem))] shadow-xl border border-border overflow-hidden"
        >
          {done ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-2xl">🙏</p>
              <p className="font-semibold">Thank you for your feedback!</p>
              <p className="text-sm text-muted-foreground">It helps improve the app.</p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <p className="font-semibold text-sm">Share feedback</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">How would you rate your experience?</p>
                  <Stars value={rating} onChange={setRating} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Message *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="What do you think? Any suggestions?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {!session?.user && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Name</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Email</label>
                      <input
                        type="email"
                        placeholder="Optional"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" size="sm" className="w-full" disabled={submitting || !message.trim()}>
                  {submitting ? "Sending…" : "Send feedback"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        onClick={handleOpen}
        className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
      >
        💬 Feedback
      </button>
    </div>
  );
}
