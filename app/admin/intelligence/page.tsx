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
