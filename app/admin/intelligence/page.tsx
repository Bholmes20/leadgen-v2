export const dynamic = 'force-dynamic'

// Read-only Opportunity + Growth Intelligence dashboard.
//
// This page ONLY reads the intel_* services — it takes no consequential action
// (no publish, spend, or deploy). Its job is to answer the three recurring
// questions transparently: where are we winning, where are we losing, and where
// should we test next — and to always show the WHY behind every ranking.

import {
  listOpportunities,
  listRecommendations,
  parseComponents,
  parseReasons,
  getSystemStatus,
  getLeadPerformance,
  buildPagePerformance,
  listSignals,
  listRecentActivity,
  getSeoPerformance,
  getTopQueries,
  getTopPages,
  getResearchQueue,
  analyzeOpportunity,
  getOpportunityReport,
  SCORE_COMPONENTS,
  type OpportunityWithContext,
  type ScoreComponent,
  type MetricValue,
  type ConnectionState,
} from '@/lib/intel'

const COMPONENT_LABELS: Record<ScoreComponent, string> = {
  demand: 'Demand',
  competition: 'Competition Adv.',
  economics: 'Economics',
  fulfillment: 'Fulfillment',
  acquisition: 'Acquisition',
  strategic: 'Strategic Fit',
}

function scoreColor(v: number | null): string {
  if (v === null) return 'bg-gray-200'
  if (v >= 70) return 'bg-green-500'
  if (v >= 45) return 'bg-yellow-500'
  return 'bg-red-400'
}

function confidenceBadge(label: string | null): string {
  switch (label) {
    case 'High':
      return 'bg-green-100 text-green-800'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'Low':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function verdictBadge(v: string | null): string {
  switch (v) {
    case 'VALIDATE':
      return 'bg-blue-100 text-blue-800'
    case 'RESEARCH_MORE':
      return 'bg-amber-100 text-amber-800'
    case 'DEPRIORITIZE':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function connectionBadge(state: ConnectionState): string {
  switch (state) {
    case 'CONNECTED':
      return 'bg-green-100 text-green-800'
    case 'NOT_CONNECTED':
      return 'bg-gray-100 text-gray-500'
    case 'UNAVAILABLE':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function severityBadge(sev: string): string {
  switch (sev) {
    case 'critical':
      return 'bg-red-100 text-red-700'
    case 'warning':
      return 'bg-amber-100 text-amber-800'
    case 'notice':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// Render a MetricValue with its provenance so a number is never mistaken for a
// measured fact when it is derived/estimated/unknown.
function Metric({ label, m, unit }: { label: string; m: MetricValue; unit?: string }) {
  const display =
    m.value === null
      ? '—'
      : unit === '%'
        ? `${(m.value * 100).toFixed(1)}%`
        : unit === 'h'
          ? `${m.value.toFixed(1)}h`
          : String(m.value)
  const qualityColor =
    m.quality === 'MEASURED'
      ? 'text-green-700'
      : m.quality === 'DERIVED'
        ? 'text-blue-700'
        : m.quality === 'ESTIMATED'
          ? 'text-amber-700'
          : 'text-gray-400'
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="text-lg font-bold text-gray-900">{display}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className={`text-[10px] uppercase mt-1 font-medium ${qualityColor}`}>{m.quality}</div>
    </div>
  )
}

function SeoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className="text-[10px] uppercase mt-1 font-medium text-green-700">MEASURED</div>
    </div>
  )
}

function ComponentBars({ opp }: { opp: OpportunityWithContext }) {
  const components = parseComponents(opp)
  if (!components) return <p className="text-sm text-gray-400">Not scored yet.</p>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
      {SCORE_COMPONENTS.map((c) => {
        const v = components[c]
        return (
          <div key={c}>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{COMPONENT_LABELS[c]}</span>
              <span className="font-medium text-gray-900">{v ?? '—'}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded">
              <div className={`h-1.5 rounded ${scoreColor(v)}`} style={{ width: `${v ?? 0}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OpportunityCard({ opp }: { opp: OpportunityWithContext }) {
  const reasons = parseReasons(opp)
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            {opp.niche_label} — {opp.market_city}, {opp.market_state}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{opp.stage}</span>
            {opp.confidence_label && (
              <span className={`px-2 py-0.5 rounded ${confidenceBadge(opp.confidence_label)}`}>
                {opp.confidence_label} confidence
              </span>
            )}
            {opp.verdict && (
              <span className={`px-2 py-0.5 rounded ${verdictBadge(opp.verdict)}`}>{opp.verdict}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-gray-900">{opp.score_overall ?? '—'}</div>
          <div className="text-xs text-gray-400">/ 100</div>
        </div>
      </div>

      <div className="mt-3">
        <ComponentBars opp={opp} />
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Why this ranks here</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default async function IntelligencePage() {
  const opportunities = listOpportunities()
  const scored = opportunities.filter((o) => o.score_overall !== null)
  const unscored = opportunities.filter((o) => o.score_overall === null)
  const recommendations = listRecommendations()

  // P1B read-only views — all derived from real stored data; nothing is generated
  // or mutated on render.
  const status = getSystemStatus()
  const perf = getLeadPerformance()
  const pages = buildPagePerformance()
  const signals = listSignals('OPEN')
  const activity = listRecentActivity(20)

  const pagesWithLeads = pages.filter((p) => p.leads > 0)

  // P1C — Search Console + research (all read-only; analyzeOpportunity does not write).
  const seo = getSeoPerformance(28)
  const seoQueries = seo.hasData ? getTopQueries(28, 10) : []
  const seoPages = seo.hasData ? getTopPages(28, 10) : []
  const researchQueue = getResearchQueue()
  const analyses = opportunities.map((o) => ({ o, a: analyzeOpportunity(o.id) }))
  const researchReady = analyses.filter((x) => x.a.researchComplete).length
  const freshAgg = analyses.reduce(
    (acc, x) => ({
      fresh: acc.fresh + x.a.freshFactors,
      stale: acc.stale + x.a.staleFactors,
      missing: acc.missing + x.a.missingFactors,
    }),
    { fresh: 0, stale: 0, missing: 0 },
  )
  const REPORT_MIN_READY = 15

  // Per-opportunity evidence ("why are we considering X?") for the top scored
  // candidate — structured facts only, never a reasoning trace.
  const topScored = scored[0] ?? null
  const topReport = topScored ? getOpportunityReport(topScored.id) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Opportunity &amp; Growth Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read-only. No page here publishes, spends, or deploys — those stay behind explicit approval.
          Numbers are tagged <span className="text-green-700 font-medium">MEASURED</span> /{' '}
          <span className="text-blue-700 font-medium">DERIVED</span> /{' '}
          <span className="text-gray-400 font-medium">UNKNOWN</span> — never fabricated.
        </p>
      </header>

      {/* SYSTEM STATUS — counts + honest integration coverage */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">System status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Markets', value: status.counts.markets },
            { label: 'Niches', value: status.counts.niches },
            { label: 'Opportunities', value: status.counts.opportunities },
            { label: 'Leads', value: status.counts.leads },
            { label: 'Open signals', value: status.counts.openSignals },
            { label: 'Open recommendations', value: status.counts.openRecommendations },
            { label: 'Scored opportunities', value: status.counts.scoredOpportunities },
            { label: 'Activity events', value: status.counts.activityEvents },
          ].map((s) => (
            <div key={s.label} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {status.integrations.map((i) => (
            <div key={i.key} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 text-sm">{i.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${connectionBadge(i.state)}`}>
                  {i.state.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{i.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE MARKET PERFORMANCE — real leads only */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Live market performance{' '}
          <span className="text-sm font-normal text-gray-400">(all markets, measured leads)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="text-lg font-bold text-gray-900">{perf.totalLeads}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total leads</div>
            <div className="text-[10px] uppercase mt-1 font-medium text-green-700">MEASURED</div>
          </div>
          <Metric label="Contact rate" m={perf.conversion.contactRate} unit="%" />
          <Metric label="Quote rate" m={perf.conversion.quoteRate} unit="%" />
          <Metric label="Win rate" m={perf.conversion.winRate} unit="%" />
          <Metric label="Avg time-to-contact" m={perf.timeToContact} unit="h" />
          <Metric label="Revenue" m={perf.revenue} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="text-xs font-medium text-gray-500 mb-2">Leads by city</p>
            {perf.byCity.length === 0 ? (
              <p className="text-sm text-gray-400">No leads yet.</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {perf.byCity.map((d) => (
                  <li key={d.identifier} className="flex justify-between">
                    <span>
                      {d.identifier}
                      {!d.mapped && (
                        <span className="ml-2 text-[10px] uppercase text-amber-700">unmapped</span>
                      )}
                    </span>
                    <span className="font-medium">{d.leads}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="text-xs font-medium text-gray-500 mb-2">Attribution health</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex justify-between">
                <span>Unattributed leads</span>
                <span className="font-medium">{perf.unattributedLeads}</span>
              </li>
              <li className="flex justify-between">
                <span>City slug, no intel market</span>
                <span className="font-medium">{perf.unmappedCityLeads}</span>
              </li>
              <li className="flex justify-between">
                <span>Niche slug, no intel niche</span>
                <span className="font-medium">{perf.unmappedNicheLeads}</span>
              </li>
              <li className="flex justify-between text-gray-400">
                <span>Qualified leads</span>
                <span className="font-medium">UNKNOWN (no schema field)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PAGE PERFORMANCE — SEO registry × real lead outcomes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Page performance{' '}
          <span className="text-sm font-normal text-gray-400">
            ({pages.length} published pages · {pagesWithLeads.length} with leads)
          </span>
        </h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Page</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-right px-3 py-2 font-medium">Leads</th>
                <th className="text-right px-3 py-2 font-medium">Won</th>
                <th className="text-right px-3 py-2 font-medium">Recs</th>
                <th className="text-right px-3 py-2 font-medium">Exp</th>
                <th className="text-left px-3 py-2 font-medium">Search</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.slice(0, 30).map((p) => (
                <tr key={p.slug}>
                  <td className="px-3 py-2 text-gray-800">{p.path}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{p.pageType}</td>
                  <td className="px-3 py-2 text-right font-medium">{p.leads}</td>
                  <td className="px-3 py-2 text-right">{p.won}</td>
                  <td className="px-3 py-2 text-right">{p.recommendationCount}</td>
                  <td className="px-3 py-2 text-right">{p.experimentCount}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${connectionBadge(p.search.status)}`}>
                      {p.search.status === 'CONNECTED' ? 'GSC' : 'no GSC'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* GROWTH SIGNALS — deterministic, threshold-based */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Growth signals <span className="text-sm font-normal text-gray-400">({signals.length} open)</span>
        </h2>
        {signals.length === 0 ? (
          <p className="text-sm text-gray-500">
            No open signals. Signals fire from measured thresholds; those needing Search Console / GA4 are
            suppressed until connected (never fabricated).
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {signals.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900 text-sm">
                    {s.signal_type} <span className="text-gray-400">→</span> {s.target}
                  </span>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className={`px-2 py-0.5 rounded ${severityBadge(s.severity)}`}>{s.severity}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{s.data_quality}</span>
                    {s.confidence != null && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{s.confidence}%</span>
                    )}
                  </div>
                </div>
                {s.measured && (
                  <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                    measured: {s.measured} · threshold: {s.threshold}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEO PERFORMANCE — Search Console (honest connected state) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Search Console / SEO{' '}
          <span className="text-sm font-normal text-gray-400">(last {seo.window.days} days)</span>
        </h2>
        <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 text-sm">Search Console</span>
            <span className={`text-xs px-2 py-0.5 rounded ${connectionBadge(seo.connection)}`}>
              {seo.connection.replace('_', ' ').toLowerCase()}
            </span>
          </div>
          {seo.connection !== 'CONNECTED' ? (
            <p className="text-xs text-gray-500 mt-2">
              Connect Search Console to unlock impressions / clicks / CTR / position, comparison windows,
              and SEO signals. Set <code className="bg-gray-100 px-1 rounded">GSC_SITE_URL</code> +{' '}
              <code className="bg-gray-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> (see
              docs/intel/gsc-setup.md). No metrics are shown until real data exists.
            </p>
          ) : !seo.hasData ? (
            <p className="text-xs text-gray-500 mt-2">Connected — no ingested rows in this window yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <SeoStat label="Impressions" value={seo.totals.impressions.toLocaleString()} />
              <SeoStat label="Clicks" value={seo.totals.clicks.toLocaleString()} />
              <SeoStat label="CTR" value={seo.totals.ctr != null ? `${(seo.totals.ctr * 100).toFixed(1)}%` : '—'} />
              <SeoStat label="Avg position" value={seo.totals.position != null ? seo.totals.position.toFixed(1) : '—'} />
            </div>
          )}
        </div>
        {seo.hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-xs font-medium text-gray-500 mb-2">Top search queries</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {seoQueries.map((q) => (
                  <li key={q.key} className="flex justify-between gap-2">
                    <span className="truncate">
                      {q.key}
                      {q.branded ? <span className="ml-1 text-[10px] uppercase text-gray-400">brand</span> : null}
                      {q.commercial ? <span className="ml-1 text-[10px] uppercase text-blue-600">commercial</span> : null}
                    </span>
                    <span className="font-medium shrink-0">{q.impressions} impr</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-xs font-medium text-gray-500 mb-2">Top SEO pages</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {seoPages.map((p) => (
                  <li key={p.key} className="flex justify-between gap-2">
                    <span className="truncate">{p.path}</span>
                    <span className="font-medium shrink-0">{p.impressions} impr</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* OPPORTUNITY RESEARCH — queue, progress, freshness, report readiness */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Opportunity research</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-2xl font-bold text-gray-900">{researchQueue.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Research tasks</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-2xl font-bold text-gray-900">{researchReady}<span className="text-sm text-gray-400">/{REPORT_MIN_READY}</span></div>
            <div className="text-xs text-gray-500 mt-0.5">Ready for ranking</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-2xl font-bold text-gray-900">{freshAgg.fresh}</div>
            <div className="text-xs text-gray-500 mt-0.5">Fresh evidence</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-2xl font-bold text-gray-900">{freshAgg.stale}<span className="text-sm text-gray-400"> / {freshAgg.missing} missing</span></div>
            <div className="text-xs text-gray-500 mt-0.5">Stale evidence</div>
          </div>
        </div>
        <div className="border border-dashed border-gray-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Opportunity Report #1:</span>{' '}
            {researchReady >= REPORT_MIN_READY ? (
              <span className="text-green-700">READY — {researchReady} opportunities researched.</span>
            ) : (
              <span className="text-amber-700">
                RESEARCH INCOMPLETE — {researchReady}/{REPORT_MIN_READY} opportunities have complete, confident
                research. No ranking is produced (fake precision avoided).
              </span>
            )}
          </p>
        </div>
        {researchQueue.length === 0 ? (
          <p className="text-sm text-gray-500">
            No research tasks yet. Create tasks via the worker (<code className="bg-gray-100 px-1 rounded">createResearchTask</code>) to
            begin evidence collection for CITY × NICHE opportunities.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {researchQueue.map((t) => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-gray-800">{t.opportunity_id.slice(0, 8)} · {t.evidence_count} evidence</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{t.status}</span>
                  {t.assigned_actor && <span className="text-gray-400">{t.assigned_actor}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Where should we test next — top scored opportunities with the WHY */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Top opportunities <span className="text-sm font-normal text-gray-400">(where to test next)</span>
        </h2>
        {scored.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">
              No scored opportunities yet. Record research evidence for an opportunity and score it —
              component scores and reasons will appear here. (Seed a demo with{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">scripts/seed-intel.ts demo</code>.)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {scored.map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        )}
      </section>

      {/* OPPORTUNITY EVIDENCE — the "why are we considering X?" fact sheet */}
      {topReport && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Opportunity evidence{' '}
            <span className="text-sm font-normal text-gray-400">
              (why {topReport.market} · {topReport.niche})
            </span>
          </h2>
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-2xl font-bold text-gray-900 mr-2">
                {topReport.opportunityScore ?? '—'}
                <span className="text-sm text-gray-400">/100</span>
              </span>
              <span className={`px-2 py-0.5 rounded ${confidenceBadge(topReport.evidenceConfidenceLabel)}`}>
                {topReport.evidenceConfidenceLabel} confidence ({topReport.evidenceConfidence})
              </span>
              <span className={`px-2 py-0.5 rounded ${verdictBadge(topReport.verdict)}`}>{topReport.verdict}</span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                research {topReport.researchComplete ? 'complete' : 'incomplete'}
              </span>
              <span className={`px-2 py-0.5 rounded ${connectionBadge(topReport.seo.connection)}`}>
                SEO {topReport.seo.connection.replace('_', ' ').toLowerCase()}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {topReport.leads.attributedLeads} attributed leads
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Evidence <span className="text-gray-400">({topReport.evidence.length} observations)</span>
                </p>
                {topReport.evidence.length === 0 ? (
                  <p className="text-sm text-gray-400">No evidence recorded yet.</p>
                ) : (
                  <ul className="text-xs text-gray-700 space-y-1">
                    {topReport.evidence.slice(0, 8).map((e, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">
                          {e.factor_key}
                          <span className="ml-1 text-[10px] uppercase text-gray-400">{e.kind}</span>
                          {e.stale && <span className="ml-1 text-[10px] uppercase text-amber-700">stale</span>}
                        </span>
                        <span className="font-medium shrink-0">{e.value_num ?? e.value_text ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-gray-500 mt-2">
                  Fresh {topReport.freshness.fresh} · Stale {topReport.freshness.stale} · Missing{' '}
                  {topReport.freshness.missing}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Why this ranks here</p>
                {topReport.reasons.length === 0 ? (
                  <p className="text-sm text-gray-400">Not enough evidence to explain a ranking yet.</p>
                ) : (
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                    {topReport.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                {topReport.missingEvidence.length > 0 && (
                  <p className="text-[11px] text-amber-700 mt-2">
                    Missing/stale: {topReport.missingEvidence.slice(0, 8).join(', ')}
                    {topReport.missingEvidence.length > 8 ? '…' : ''}
                  </p>
                )}
                {topReport.activeSignals.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    {topReport.activeSignals.length} active signal(s) ·{' '}
                    {topReport.recommendations.length} proposed recommendation(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pipeline: unscored candidates */}
      {unscored.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Candidates in research <span className="text-sm font-normal text-gray-400">({unscored.length})</span>
          </h2>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {unscored.map((o) => (
              <div key={o.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-800">
                  {o.niche_label} — {o.market_city}, {o.market_state}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{o.stage}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendation queue — the future worker's operating queue */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommendation queue</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-500">
            No recommendations yet. The growth engine proposes these once live-market data is available.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {recommendations.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900 text-sm">
                    {r.type} <span className="text-gray-400">→</span> {r.target}
                  </span>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{r.priority}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{r.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY — the operational event stream (Slack-ready facts) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-500">
            No activity recorded yet. Discovering, scoring, transitioning, detecting signals, and creating
            recommendations all append durable events here (and, later, to Slack).
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {activity.map((e) => (
              <div key={e.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-900">
                    <span className="text-xs font-mono text-gray-400 mr-2">{e.event_type}</span>
                    {e.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    {e.actor_name && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{e.actor_name}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded ${severityBadge(e.severity)}`}>{e.severity}</span>
                    <span className="text-gray-400">{e.created_at.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                </div>
                {e.summary && <p className="text-xs text-gray-500 mt-0.5">{e.summary}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
