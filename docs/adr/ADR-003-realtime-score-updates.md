# ADR-003: Real-time score updates

**Status**: Proposed  
**Date**: 2026-06-20

---

## Context

The tournament view is a static fetch — the page renders match scores at load time and does not update until the user refreshes. This is acceptable for the organizer who is entering scores, but poor for:

- **Spectators** watching via the public share link (`/t/[token]`) on their phones.
- **Players** on other courts who want to see how other matches are going.
- The **Mexicano next-round flow**, where the organizer must see all current-round matches locked before triggering round generation — a live indicator of "N/M matches locked" avoids manual refreshing.

The question is how to push or pull updates efficiently without requiring new infrastructure.

---

## Decision drivers

- Must work on the public share page (`/t/[token]`) without auth.
- Must work on mobile browsers (the primary spectator device).
- Must not require a persistent stateful server (Next.js on serverless/edge would need an external broker for WebSockets).
- Low engineering complexity — this is a "nice to have" feature, not core to the app.
- Score updates happen infrequently (roughly once per 10–20 minutes per match in a live tournament). This is not a high-frequency stream.

---

## Considered options

### Option A — Client-side polling (setInterval)

The page re-fetches `/api/tournaments/[id]` or `/api/match-scores?tournamentId=X` every N seconds.

Pros:
- Zero server changes — works with existing REST endpoints.
- Works everywhere including old browsers and aggressively firewalled networks.
- Trivial to implement (one `useEffect` with `setInterval`).
- Can be paused when the tab is not visible (`document.visibilityState`).

Cons:
- Wasted requests when nothing has changed (no conditional fetching currently).
- Interval choice is a tradeoff: 10 s feels live; 30 s saves bandwidth.
- Not true "real-time" — latency = up to interval length.

Mitigation: use a short interval (10 s) and only poll when the tournament is not closed (`isClosed === false`). Add a `Last-Modified` header or `updatedAt` comparison to skip re-rendering when data hasn't changed.

---

### Option B — Server-Sent Events (SSE)

Add a `/api/tournaments/[id]/stream` endpoint that holds the HTTP connection open and pushes an event whenever a match score is updated.

Pros:
- True push — client receives the update the moment it happens.
- SSE is unidirectional (server → client) which is all we need.
- Works over HTTP/1.1; no WebSocket upgrade required.
- Native browser `EventSource` API; no client library needed.

Cons:
- Next.js App Router supports SSE via `ReadableStream` responses, but holding long-lived connections open conflicts with serverless function timeouts (Vercel functions time out at 10–60 s on most plans).
- Requires a pub/sub mechanism on the server side: when the score API writes a score, it must notify the stream endpoint. This needs either a shared in-memory store (breaks under multiple instances) or an external broker (Redis pub/sub, Upstash, etc.).
- More complex than polling — the additional infrastructure negates the simplicity advantage.

---

### Option C — WebSockets

Use a WebSocket connection for bidirectional real-time communication.

Pros:
- Full-duplex, lowest latency.

Cons:
- Complete overkill: we only need server → client (unidirectional).
- WebSocket servers are stateful; serverless platforms don't natively support them. Would require Pusher, Ably, or a standalone Node server.
- Highest complexity and cost of the three options.

Rejected for this use case.

---

## Decision

**Option A — Client-side polling with visibility-aware interval.**

Reasons:
- Score updates are infrequent. Polling at 10 s gives sub-10 s perceived latency, which is adequate for spectating padel matches. Nobody needs millisecond-accurate updates for a live score table.
- No server changes required. The existing REST endpoints already return correct data.
- Works in all environments including serverless deployment.
- SSE's apparent advantage (push vs pull) is not worth the operational complexity of a pub/sub broker at this scale.

### Implementation details

- Poll only when `tournament.isClosed === false`.
- Pause polling when `document.visibilityState === 'hidden'` (tab in background).
- Use a 10 s interval on the tournament detail page and the public share page.
- On reconnect after visibility becomes `'visible'`, fetch immediately before restarting the interval.
- Compare `tournament.updatedAt` from the response to the locally held value before re-rendering to avoid flickering on unchanged data.
- Display a small "Live" indicator (pulsing dot) when polling is active, so spectators know the view is auto-refreshing.

### Revisiting SSE

If the app moves to a persistent server (VPS / Railway / Fly.io with sticky connections) and usage patterns show high spectator traffic, SSE with Redis pub/sub is the natural next step. The polling approach is designed to be replaced with no API contract changes.

---

## Consequences

### Positive
- Spectators and players on shared links see scores update without manual reload.
- Organizer can see the round-completion indicator ("6/6 matches locked") without refreshing.
- Zero backend changes.

### Negative / risks
- Under heavy traffic, polling multiplies read load: 100 spectators × 10 s interval = 10 requests/s against a single tournament endpoint. Acceptable for current scale; watch query times if tournament size grows.
- Tabs left open indefinitely will poll forever. Stopping after `tournament.isClosed` becomes true caps the total request count per tournament.

---

## Links

- Related: ADR-001 — if stats are materialized, the tournament page fetch becomes cheaper to serve under polling load.
