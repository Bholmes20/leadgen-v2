import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  recordEvidence,
  scoreOpportunityById,
  getOpportunity,
  transitionOpportunity,
  listDecisions,
  ApprovalRequiredError,
} from "../../lib/intel";

function freshOpportunity() {
  const suffix = `${Math.round(Math.random() * 1e9)}`;
  const m = upsertMarket({ city: `City${suffix}`, state: "GA" });
  const n = upsertNiche({ slug: `niche-${suffix}`, label: "Test Niche" });
  return discoverOpportunity(m.id, n.id);
}

test("discover creates a DISCOVERED opportunity and is idempotent per pair", () => {
  const m = upsertMarket({ city: "Dupe", state: "GA" });
  const n = upsertNiche({ slug: "dupe-niche", label: "Dupe" });
  const a = discoverOpportunity(m.id, n.id);
  const b = discoverOpportunity(m.id, n.id);
  assert.equal(a.id, b.id);
  assert.equal(a.stage, "DISCOVERED");
});

test("scoring advances DISCOVERED → SCORED and snapshots the score", () => {
  const opp = freshOpportunity();
  recordEvidence({ opportunity_id: opp.id, factor_key: "search_demand", value_num: 70, kind: "FACT" });
  const r = scoreOpportunityById(opp.id);
  const after = getOpportunity(opp.id)!;
  assert.equal(after.stage, "SCORED");
  assert.equal(after.score_overall, r.overall);
  assert.ok(after.score_components && after.score_reasons);
});

test("approval-gated transition to APPROVED_FOR_TEST fails closed without approval", () => {
  const opp = freshOpportunity();
  transitionOpportunity(opp.id, "RESEARCHING", { actor: "worker" });
  transitionOpportunity(opp.id, "SCORED", { actor: "worker" });
  transitionOpportunity(opp.id, "REVIEW", { actor: "worker" });

  assert.throws(
    () => transitionOpportunity(opp.id, "APPROVED_FOR_TEST", { actor: "worker" }),
    ApprovalRequiredError,
  );
  // still in REVIEW — the illegal action did not mutate stage
  assert.equal(getOpportunity(opp.id)!.stage, "REVIEW");

  const ok = transitionOpportunity(opp.id, "APPROVED_FOR_TEST", {
    actor: "james",
    approvedBy: "james",
    rationale: "budget approved",
  });
  assert.equal(ok.stage, "APPROVED_FOR_TEST");

  const decisions = listDecisions(opp.id);
  assert.ok(decisions.some((d) => d.to_state === "APPROVED_FOR_TEST" && d.permission_level === "APPROVAL_REQUIRED"));
});

test("illegal transitions are rejected", () => {
  const opp = freshOpportunity();
  assert.throws(() => transitionOpportunity(opp.id, "SCALE", { actor: "worker" }), /Illegal transition/);
});

test("full happy path DISCOVERED → SCALE (approvals where required)", () => {
  const opp = freshOpportunity();
  transitionOpportunity(opp.id, "RESEARCHING", { actor: "w" });
  transitionOpportunity(opp.id, "SCORED", { actor: "w" });
  transitionOpportunity(opp.id, "REVIEW", { actor: "w" });
  transitionOpportunity(opp.id, "APPROVED_FOR_TEST", { actor: "james", approvedBy: "james" });
  transitionOpportunity(opp.id, "TESTING", { actor: "w" });
  transitionOpportunity(opp.id, "VALIDATED", { actor: "w" });
  const scaled = transitionOpportunity(opp.id, "SCALE", { actor: "james", approvedBy: "james" });
  assert.equal(scaled.stage, "SCALE");
});
