# ADR-007: Offline-first PWA strategy

**Status**: Proposed  
**Date**: 2026-06-20

---

## Context

Padel clubs often have poor or no WiFi on the courts. Organizers must enter match scores during the event, which currently requires an active network connection to every `PUT /api/match-scores/[id]` call. If connectivity drops mid-tournament, score entry is blocked.

The app already has a `manifest.ts` (PWA manifest), but no service worker and no offline capability. The question is how much offline support to build and at what complexity cost.

---

## Decision drivers

- The critical offline scenario is **score entry during a live tournament**. Everything else (tournament creation, player management, stats) can wait for connectivity.
- The organizer is the only person entering scores — it is a single-writer scenario per device. No concurrent writes from multiple devices need to be reconciled for the offline case.
- Must work on iOS Safari (service workers are supported since iOS 11.3 but have stricter limitations than Android Chrome).
- The Next.js App Router does not include built-in service worker support — a separate library is needed.
- Implementation complexity must be proportional to the benefit: full offline-first is a large investment; "survive a 5-minute WiFi drop" is achievable at much lower cost.

---

## Considered options

### Option A — No offline support (current)

Do nothing.

Pros: No complexity.  
Cons: Organizers lose score entry capability when WiFi drops.

---

### Option B — Optimistic UI with local state (no service worker)

Scores entered in the UI are applied immediately to local React state (optimistic update). The API call happens in the background. If it fails, the UI shows an error and retries automatically (exponential backoff, up to 3 retries). The score stays in local state during retries.

Pros:
- No service worker.
- No background sync API.
- Works on all browsers including aggressive iOS PWA restrictions.
- Perceived as "instant" for the organizer even on slow connections.
- Failed writes are surfaced to the user as a recoverable error, not a page crash.

Cons:
- State is lost on page refresh. If the organizer refreshes while offline, entered-but-unsynced scores disappear.
- Does not handle the "phone goes into airplane mode for 10 minutes" scenario — retry loop will exhaust and show an error.

---

### Option C — Service worker with Background Sync (Workbox)

Add a service worker using [Workbox](https://developer.chrome.com/docs/workbox/) that:
1. Caches the tournament page shell for offline viewing.
2. Queues failed score-save requests in IndexedDB via the Background Sync API.
3. Replays queued requests when connectivity returns.

Pros:
- True offline score entry — requests are queued durably and survive page refresh.
- Tournament page is viewable offline (cached shell + last-known data).

Cons:
- Background Sync API is not supported on iOS Safari (as of iOS 17). On iOS, queued requests only replay when the tab is open and online — which is the same as Option B with better persistence.
- Workbox adds ~50 KB to the bundle and requires careful cache invalidation to avoid serving stale Next.js page bundles after deployments.
- Service workers are notoriously hard to debug, especially on iOS.
- Next.js App Router requires `next-pwa` or manual service worker registration — not first-class supported.

---

### Option D — IndexedDB write-behind with sync on reconnect (no service worker)

Replace the API call in the score-save handler with a two-step write:
1. Write the score to IndexedDB immediately (synchronous, offline-capable).
2. A background loop (polling `navigator.onLine`, or listening to `window.addEventListener('online', ...)`) drains the IndexedDB queue by replaying writes to the server.

Pros:
- Durable across page refreshes (IndexedDB persists).
- Works without a service worker — works on all browsers.
- The sync-on-reconnect event is well-supported and reliable.

Cons:
- More complex than Option B: requires an IndexedDB abstraction, a queue drain loop, conflict detection (what if the server already has a score for that match?).
- The organizer must keep the tab open for sync to happen (no Background Sync fallback on iOS).

---

## Decision

**Option B (optimistic UI with retry) immediately; Option D (IndexedDB queue) as follow-up if data loss is reported by users.**

Reasons:

- The overwhelming majority of connectivity issues at padel clubs are **brief drops** (1–30 seconds) as the organizer moves between courts. Optimistic UI with automatic retry handles this transparently.
- Option D (IndexedDB queue) adds meaningful complexity for a failure mode — page refresh while offline — that is unlikely to occur in practice during score entry (organizers are actively using the page).
- Option C (service worker + Background Sync) provides genuine value only on Android Chrome; on iOS it degrades to equivalent of Option B anyway. Not worth the maintenance burden at this scale.
- If data loss is reported as a real problem, the transition from Option B to Option D is additive — Option B's retry logic becomes the fallback for IndexedDB drain failures.

### Implementation of Option B

1. Score save call (`PUT /api/match-scores/[id]`) triggers an optimistic state update immediately.
2. The API call runs in the background. A retry wrapper retries on network error with 1 s, 2 s, 4 s backoff.
3. On final failure (3 retries exhausted), the UI shows a dismissible banner: "Score not saved — check your connection" with a manual "Retry" button.
4. The match row shows a "Saving…" / "Saved" / "Error" indicator.
5. On `window.online` event, automatically retry any pending saves.

### PWA installability (independent of offline)

Regardless of offline strategy, the app can be made installable (Add to Home Screen) by:
- Ensuring `manifest.ts` includes `display: "standalone"` and icon sizes ≥ 192px (already partially done).
- Adding a minimal service worker that only caches the app shell (no dynamic content caching). This is required by browsers to trigger the install prompt.

This minimal service worker has none of the complexity of Workbox and can be implemented as a static `public/sw.js` with a simple `install` + `fetch` handler that passes through to the network.

---

## Consequences

### Positive
- Score entry feels instant and survives brief WiFi drops without any user action.
- No service worker complexity for the common case.
- PWA installability can be enabled independently via a minimal SW.

### Negative / risks
- A page refresh while offline loses unsaved scores. The retry banner must be prominent enough that organizers notice and don't reload before saves complete.
- The `navigator.onLine` event is not 100% reliable — it reflects link-layer connectivity, not actual server reachability. A failed request is still the definitive signal.

---

## Links

- Related: ADR-003 (real-time updates) — the polling mechanism should pause when `navigator.onLine === false` to avoid spurious errors in the console.
