# Connecting Google Search Console (operator setup)

P1C ships a **real** Search Console client (`lib/intel/growth/gscClient.ts`, zero
external dependencies). It stays **NOT_CONNECTED** and inert until the two
environment values below are set. Nothing is fabricated in the meantime.

## What to provide

Add to `.env.local` (never commit real values):

| Variable | Meaning |
| --- | --- |
| `GSC_SITE_URL` | The **verified** property, exactly as it appears in Search Console. Domain property: `sc-domain:eseeent.com`. URL-prefix property: `https://leads.eseeent.com/`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The service-account key JSON — raw JSON **or** base64 of the JSON. |

Alternative to inline JSON: `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` = absolute path to
the key file (kept outside git).

## Least-privilege setup

1. In Google Cloud, create a **service account** (no roles needed on the project).
2. Create a **JSON key** for it.
3. Enable the **Search Console API** for the project.
4. In Search Console → the property → **Settings → Users and permissions**, add the
   service account's email as a user with **Restricted** (read) access.

The client requests only the read-only scope
`https://www.googleapis.com/auth/webmasters.readonly`.

## Verify

Once set, from the worker surface:

```ts
import { hasGscCredentials, runGscIngestion, getSeoPerformance } from "@/lib/intel";
hasGscCredentials();            // true
await runGscIngestion();        // { status: "SUCCESS", rowsIngested: N, ... }
getSeoPerformance(28);          // connection: "CONNECTED", real totals
```

- Initial history: `backfillSearchConsole({ days: 180 })`.
- Daily incremental: `ingestSearchConsole()` (uses the `intel_ingestion_state` cursor).
- Recovery/debug: `ingestSearchConsoleRange("2026-06-01", "2026-06-30")`.

Re-ingesting overlapping windows is **idempotent** (unique on
`property,date,page,query,country,device`).

## Security

Credentials are read from env only. They are **never** logged, rendered in the
dashboard, embedded in activity events, included in error messages (HTTP status
codes only), or committed to git. Search Console reflects **our observed Google
performance** — it is not absolute search volume, and the code never presents it
as such.
