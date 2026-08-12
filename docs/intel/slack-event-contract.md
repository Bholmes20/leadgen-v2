# Growth Intelligence → Slack event contract (future)

P1B does **not** implement Slack. It produces the structured, durable data a
future company-level command center (Alfred → James → shared workers) can render.
This document is the contract that consumer.

There is deliberately **no Lead-Gen Slack bot**. The Lead-Gen system only writes
operational facts to `intel_activity_events` and `intel_recommendations`; a
separate, company-level integration reads them and posts to Slack.

## Source of truth

| Slack surface        | Backing table / service                                  |
| -------------------- | -------------------------------------------------------- |
| `#worker-activity`   | `intel_activity_events` via `listRecentActivity()`       |
| `#growth-intelligence` | `intel_signals` via `listSignals()` + activity          |
| `#approvals`         | `intel_recommendations` (PROPOSED) via `listRecommendations('PROPOSED')` |
| `#exceptions`        | activity events with `severity in ('warning','critical')` and `DATA_INGESTION_FAILED` |
| `#command-center`    | `getSystemStatus()` snapshot                             |

## Activity event JSON (what a worker/Slack renderer receives)

Every row of `intel_activity_events` is already Slack-renderable. Fields:

```jsonc
{
  "id": "uuid",
  "created_at": "2026-08-12T14:00:00.000Z",
  "event_type": "SIGNAL_DETECTED",      // see ACTIVITY_EVENT_TYPES
  "actor_type": "system",                // system | worker | human
  "actor_name": "growth-engine",
  "system": "growth-intelligence",
  "target_type": "signal",
  "target_id": "rental-property-cleanout-augusta-ga",
  "market_id": "…", "niche_id": "…",
  "opportunity_id": null, "recommendation_id": null, "experiment_id": null, "signal_id": "…",
  "title": "HIGH_IMPRESSIONS_LOW_CTR — rental-property-cleanout-augusta-ga",
  "summary": "Strong search visibility but weak click-through — likely a title/meta opportunity.",
  "metadata": { "measured": { "impressions": 900, "ctr": 0.011 }, "threshold": { "highImpressions": 500, "lowCtr": 0.02 } },
  "severity": "notice",                  // info | notice | warning | critical
  "correlation_id": null                 // task/run id to group a worker run
}
```

**Discipline:** events contain operational facts and concise explanations only —
**never** private chain-of-thought or hidden model reasoning.

### Example rendered activity card

```
Growth Intelligence · SIGNAL_DETECTED
Augusta × Rental Property Cleanouts

Strong search visibility but weak click-through.
Evidence: impressions 900, CTR 1.1% (threshold 2%)

Next: recommendation evaluation
```

## Approval card JSON (from `intel_recommendations`)

A PROPOSED recommendation that requires approval maps to an approval card. The
approval action calls the existing gated service `approveRecommendation(id, approver)`
(APPROVAL_REQUIRED, fail-closed) — Slack buttons never bypass the permission layer.

```jsonc
{
  "id": "uuid",
  "type": "EXPAND_MARKET",
  "target": "property-cleanouts-thomson-ga",
  "reason": "HIGH_CONVERSION_LOW_TRAFFIC on … : Scale a proven converter",
  "evidence": { "signalId": "…", "measured": { … }, "threshold": { … } },
  "expected_impact": "Scale a proven converter",
  "confidence": 55,
  "priority": "medium",
  "effort": "medium",
  "est_cost": null,
  "status": "PROPOSED"
}
```

### Example rendered approval card

```
James — Growth Recommendation
Target: Thomson × Property Cleanouts
Recommendation: Run validation experiment
Evidence: … (measured + threshold)
Confidence: Medium
Estimated test cost: —
[APPROVE]  [REJECT]  [ASK JAMES]
```

`APPROVE` → `approveRecommendation(id, 'james')`. `REJECT` →
`updateRecommendationStatus(id, 'REJECTED', 'james')`. Both are auditable in
`intel_decisions` and emit `RECOMMENDATION_APPROVED` / `RECOMMENDATION_REJECTED`
activity events.

## Worker run summary (future `#worker-activity` header)

A worker run groups its events with a shared `correlation_id`. A summary post is
built from `getSystemStatus()` + the run's events:

```
Growth Worker · Task: Augusta SEO Review · Status: ANALYZING
Pages analyzed: 15 · Signals detected: 3 · Recommendations created: 2 · Approvals required: 0
```

## What P1B guarantees for this contract

- Durable, queryable events at every meaningful lifecycle point.
- Deterministic, explainable signals with measured values + thresholds.
- Recommendations deduplicated and explainable.
- Approval-required actions remain gated behind the permission layer — Slack is a
  presentation/command surface, not an authorization bypass.
