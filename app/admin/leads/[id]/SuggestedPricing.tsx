"use client";

// Admin-only "Suggested Pricing" panel on the lead detail page. Internal guidance to
// help Brandon quote faster — it never sends anything to the customer and never renders
// on a public page. The copy buttons drop a number into the editable Quote amount field
// (and a summary into the Quote notes field); Brandon always overrides the final quote.

import { useState } from "react";
import {
  PRICING_BANDS,
  ACCESS_ADJUSTMENTS,
  PRICING_STRATEGY,
  formatBand,
  formatAdjustment,
  type PricingSuggestion,
} from "@/lib/pricing";

// The Quote form inputs on the page are uncontrolled (defaultValue), so writing .value
// directly sticks and submits with the form. We dispatch an input event so anything
// listening stays in sync.
function fillQuoteAmount(dollars: number) {
  const el = document.getElementById("quote_amount_input") as HTMLInputElement | null;
  if (!el) return;
  el.value = dollars.toFixed(2);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

function appendQuoteNote(text: string) {
  const el = document.getElementById("quote_notes_input") as HTMLTextAreaElement | null;
  if (!el) return;
  el.value = el.value ? `${el.value}\n${text}` : text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export default function SuggestedPricing({ suggestion }: { suggestion: PricingSuggestion }) {
  const { recommended, alternates, adjustments, range, notes, simple } = suggestion;
  const [copied, setCopied] = useState<string | null>(null);

  function flash(label: string) {
    setCopied(label);
    window.setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
  }

  function applyAmount(dollars: number, label: string) {
    fillQuoteAmount(dollars);
    flash(label);
  }

  function copySummaryToNotes() {
    if (!recommended) return;
    const parts = [`Internal guide: ${recommended.label} ${formatBand(recommended)}`];
    if (adjustments.length) {
      parts.push(`access: ${adjustments.map((a) => `${a.label} ${formatAdjustment(a)}`).join(", ")}`);
    }
    if (range) parts.push(`→ suggested ${formatBand(range)}`);
    appendQuoteNote(parts.join(" · "));
    flash("notes");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Suggested Pricing</h2>
        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Internal only
        </span>
      </div>

      {/* Primary suggested range + quick-copy into the editable quote field */}
      {range ? (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xs text-gray-500">Suggested range</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">{formatBand(range)}</span>
            {adjustments.length > 0 && (
              <span className="text-xs text-gray-400">(includes access adjustments)</span>
            )}
            {simple && (
              <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full uppercase">
                Clear match
              </span>
            )}
          </div>
          {recommended && (
            <p className="mt-1 text-xs text-gray-500">
              Based on <span className="font-medium text-gray-700">{recommended.label}</span>{" "}
              ({formatBand(recommended)} curbside base)
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyAmount(range.low, "low")}
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Use ${range.low.toLocaleString()} → quote
            </button>
            <button
              type="button"
              onClick={() => applyAmount(range.high, "high")}
              className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Use ${range.high.toLocaleString()}
              {range.openEnded ? "+" : ""} → quote
            </button>
            <button
              type="button"
              onClick={copySummaryToNotes}
              className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Copy summary → notes
            </button>
            {copied && (
              <span className="text-xs text-green-600">
                {copied === "notes" ? "Added to notes ✓" : `Set quote to ${copied} end ✓`}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Fills the editable Quote amount below — adjust before saving or sending.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
          No standard band for this request — pick the closest band from the reference
          below and quote manually.
        </p>
      )}

      {/* Other possible matches — alternate bands, collapsed by default */}
      {alternates.length > 0 && (
        <details className="mt-4 group">
          <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            Other possible matches ({alternates.length})
          </summary>
          <p className="mt-1 text-[11px] text-gray-400">
            Use one of these instead if the recommended band doesn&apos;t fit the photos.
          </p>
          <ul className="mt-2 space-y-1.5">
            {alternates.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-lg border border-gray-100 px-3 py-2"
              >
                <span className="text-gray-800">{b.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-gray-900">{formatBand(b)}</span>
                  <button
                    type="button"
                    onClick={() => applyAmount(b.low, "low")}
                    className="text-[11px] text-gray-500 underline hover:text-gray-800"
                  >
                    use low
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAmount(b.high, "high")}
                    className="text-[11px] text-gray-500 underline hover:text-gray-800"
                  >
                    use high
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Access adjustments to consider */}
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Access adjustments to consider</p>
        {adjustments.length > 0 ? (
          <ul className="space-y-1">
            {adjustments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{a.label}</span>
                <span className="font-medium tabular-nums text-gray-900">{formatAdjustment(a)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">None — curbside / easy access.</p>
        )}
      </div>

      {/* Why */}
      {notes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Why</p>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Full reference — collapsed by default */}
      <details className="mt-4 group">
        <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none">
          Full pricing reference
        </summary>
        <div className="mt-3 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Base bands</p>
            <ul className="space-y-1 text-xs">
              {PRICING_BANDS.map((b) => (
                <li key={b.id} className="flex justify-between gap-2">
                  <span className="text-gray-600">{b.label}</span>
                  <span className="tabular-nums text-gray-800">{formatBand(b)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Access adjustments</p>
            <ul className="space-y-1 text-xs">
              {ACCESS_ADJUSTMENTS.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="text-gray-600">{a.label}</span>
                  <span className="tabular-nums text-gray-800">{formatAdjustment(a)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">Strategy</p>
            <ul className="space-y-1 text-xs text-gray-500 list-disc pl-4">
              {PRICING_STRATEGY.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
