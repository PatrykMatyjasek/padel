# Architecture Decision Records

This directory documents significant architectural decisions for Padel Manager. Each ADR captures context, options considered, the decision taken, and its consequences.

## Status legend

| Status | Meaning |
|---|---|
| Proposed | Written, not yet reviewed or acted on |
| Accepted | Decision made, implementation pending |
| Implemented | Code exists for this decision |
| Superseded | Replaced by a later ADR |

## Index

| # | Title | Status | Depends on |
|---|---|---|---|
| [ADR-001](ADR-001-statistics-computation-strategy.md) | Statistics computation strategy | Proposed | — |
| [ADR-002](ADR-002-tournament-series-data-model.md) | Tournament series data model | Proposed | ADR-001 |
| [ADR-003](ADR-003-realtime-score-updates.md) | Real-time score updates | Proposed | — |
| [ADR-004](ADR-004-schema-normalization-json-blobs.md) | Schema normalization — setsJson / teamsJson | Implemented | — |
| [ADR-005](ADR-005-player-identity-and-public-profiles.md) | Player identity model and public profiles | Proposed | — |
| [ADR-006](ADR-006-skill-rating-system.md) | Skill rating system (Elo) | Proposed | ADR-001, ADR-004 |
| [ADR-007](ADR-007-offline-pwa.md) | Offline-first PWA strategy | Proposed | — |
| [ADR-008](ADR-008-classic-format-statistics.md) | Classic format statistics model | Proposed | ADR-001, ADR-004 |

## Recommended implementation order

```
ADR-004  ──►  ADR-001  ──►  ADR-002
(normalize      (PlayerStat    (series)
 JSON blobs)     snapshot)

ADR-005  ──►  (club accounts, future)
(player share
 + soft delete)

ADR-006  ──►  depends on ADR-001 + ADR-004
(Elo rating)

ADR-008  ──►  depends on ADR-001 + ADR-004
(Classic stats)

ADR-003  ──  independent
ADR-007  ──  independent
```

Start with ADR-004 (schema normalization) because it is purely additive and unblocks the most downstream work. ADR-001 and ADR-002 follow naturally. ADR-005 (public profiles) can be done in parallel. ADR-006 (Elo) should be last among the data-model changes.

ADR-003 (real-time polling) and ADR-007 (offline PWA) are frontend-only and can be slotted in at any point.
