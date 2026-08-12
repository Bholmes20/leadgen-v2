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
  listMarkets,
  listNiches,
  integrationStatus,
  parseComponents,
  parseReasons,
  SCORE_COMPONENTS,
  type OpportunityWithContext,
  type ScoreComponent,
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
  const proposed = recommendations.filter((r) => r.status === 'PROPOSED')
  const integrations = integrationStatus()
  const markets = listMarkets()
  const niches = listNiches()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Opportunity &amp; Growth Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read-only. No page here publishes, spends, or deploys — those stay behind explicit approval.
        </p>
      </header>

      {/* Snapshot counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Markets', value: markets.length },
          { label: 'Niches', value: niches.length },
          { label: 'Opportunities', value: opportunities.length },
          { label: 'Open recommendations', value: proposed.length },
        ].map((s) => (
          <div key={s.label} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Integration status — honest data coverage */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Data coverage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {integrations.map((i) => (
            <div key={i.source} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 uppercase text-xs">{i.source}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    i.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {i.available ? 'connected' : 'not connected'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{i.reason}</p>
            </div>
          ))}
        </div>
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
    </div>
  )
}
