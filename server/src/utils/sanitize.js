// Never trust LLM output: coerce to a known shape before storing or returning it.
export const LEVELS = ['low', 'medium', 'high', 'critical'];
export const CATEGORIES = ['Pothole', 'Road Damage', 'Water Leakage', 'Street Lights', 'Garbage', 'Flooding', 'Infrastructure', 'other'];
export const DEPARTMENTS = {
  Pothole: 'Highways & Public Works Department', 'Road Damage': 'Highways & Public Works Department',
  'Water Leakage': 'Water Supply & Drainage Board', 'Street Lights': 'Municipal Electrical Department',
  Garbage: 'Sanitation Department', Flooding: 'Storm Water Drain Department', Infrastructure: 'Public Works Department',
  other: 'Municipal Corporation',
};

export const DEFAULT_STEPS = {
  Pothole: '**Traffic Diversion**: Deploy caution barricades around the defect.\n**Cavity Cleaning**: Remove water, silt, and broken gravel.\n**Bitumen Compaction**: Fill with cold/hot mix asphalt and compact flush.',
  'Road Damage': '**Safety Barricading**: Place reflective cones along the perimeter.\n**Base Assessment**: Inspect foundation gravel and sub-base stability.\n**Pavement Resurfacing**: Lay bituminous overlay or patch concrete.',
  'Water Leakage': '**Main Valve Isolation**: Shut off the upstream supply gate.\n**Excavation**: Expose the ruptured section of the conduit.\n**Coupling & Pressure Test**: Replace damaged pipe section and verify flow.',
  'Street Lights': '**Circuit Isolation**: Trip the relevant feeder pillar breaker.\n**Continuity Inspection**: Check lamp cabling and relay terminals.\n**Fixture Replacement**: Install replacement LED fixture and verify timer.',
  Garbage: '**Sanitation Dispatch**: Deploy municipal compactor truck.\n**Waste Clearance**: Clear accumulated trash and sanitize ground.\n**Disposal Route**: Transport waste to designated sorting facility.',
  Flooding: '**Drain Clearance**: Remove debris clogging roadside catchpits.\n**Pump Deployment**: Station dewatering pumps at low-lying points.\n**Desilting**: Clear stormwater culvert to restore gravity discharge.',
  Infrastructure: '**Safety Cordon**: Cordon off the structural defect zone.\n**Structural Audit**: Municipal engineer conducts visual load check.\n**Repair Procurement**: Issue work order for masonry/structural repair.',
  other: '**Field Verification**: Municipal inspector visits the site.\n**Departmental Routing**: Route complaint to the designated engineering wing.\n**Rectification Notice**: Issue work permit for timely resolution.',
};

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const level = (v, fallback = 'medium') => (LEVELS.includes(String(v).toLowerCase()) ? String(v).toLowerCase() : fallback);

export function sanitizeIssueReport(ai = {}) {
  const isValid = ai.isValid !== false;
  const rejectionReason = str(ai.rejectionReason, 250);
  if (!isValid) {
    return {
      isValid: false,
      rejectionReason: rejectionReason || 'This image does not appear to show a public infrastructure or civic issue. Please upload a clear photo of the problem.',
    };
  }
  const category = CATEGORIES.includes(ai.category) ? ai.category : 'other';
  const priority = Math.round(Number(ai.priority));
  const rawSteps = Array.isArray(ai.steps)
    ? ai.steps.map((s) => str(s, 240)).filter(Boolean).join('\n')
    : str(ai.steps, 1000);

  return {
    isValid: true,
    category,
    severity: level(ai.severity),
    risk: level(ai.risk),
    description: str(ai.description, 500),
    department: str(ai.department, 80) || DEPARTMENTS[category],
    priority: Number.isFinite(priority) ? Math.min(10, Math.max(1, priority)) : 5,
    fixTime: str(ai.fix_time ?? ai.fixTime, 40) || '24–48 hours',
    steps: rawSteps || DEFAULT_STEPS[category] || DEFAULT_STEPS.other,
  };
}

/** Model proposes components; amounts are rescaled to sum to the budget and shares are recomputed. */
export function sanitizeTenderBreakdown(ai = {}, budget) {
  const rows = (Array.isArray(ai.table) ? ai.table : []).slice(0, 8)
    .map((r) => ({ component: str(r.component, 120), specs: str(r.specs, 160), summary: str(r.summary, 240), raw: Math.max(0, Number(r.amount) || 0) }))
    .filter((r) => r.component && r.raw > 0);
  const total = rows.reduce((s, r) => s + r.raw, 0);
  if (!rows.length || !total || !(budget > 0)) return null;

  let allocated = 0;
  const table = rows.map((r, i) => {
    const amount = i === rows.length - 1 ? budget - allocated : Math.round((r.raw / total) * budget);
    allocated += amount;
    return { component: r.component, specs: r.specs, summary: r.summary, amount, share: `${((amount / budget) * 100).toFixed(1)}%` };
  });

  const feas = ai.feasibility || {};
  const allowedVerdicts = ['within_benchmark', 'flagged_variance', 'human_audit_needed'];
  const verdict = allowedVerdicts.includes(feas.verdict) ? feas.verdict : 'human_audit_needed';
  const feasibility = {
    verdict,
    summary: str(feas.summary, 300) || (verdict === 'within_benchmark' ? 'Project budget and item allocations fall within standard engineering rate benchmarks.' : 'Budget variance detected or additional documentation required.'),
    keyObservations: (Array.isArray(feas.keyObservations) ? feas.keyObservations : []).slice(0, 4).map((o) => str(o, 180)),
    citizenQuestions: (Array.isArray(feas.citizenQuestions) ? feas.citizenQuestions : []).slice(0, 3).map((q) => str(q, 200)),
  };

  return {
    estimate: true, // always shown to users as "AI-generated estimate, not an audit"
    table,
    warrantyNotes: str(ai.warrantyNotes, 400),
    checklist: (Array.isArray(ai.checklist) ? ai.checklist : []).slice(0, 5).map((c) => str(c, 200)),
    feasibility,
    generatedAt: new Date(),
  };
}

export function sanitizePrediction(ai = {}) {
  const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);
  return {
    prediction: str(ai.prediction, 240), hotspot: str(ai.hotspot, 120),
    urgent: str(ai.urgent, 120), recommendation: str(ai.recommendation, 240),
    trend: pick(ai.trend, ['increasing', 'stable', 'decreasing'], 'stable'),
    riskLevel: pick(ai.risk_level ?? ai.riskLevel, ['low', 'medium', 'high'], 'medium'),
  };
}
