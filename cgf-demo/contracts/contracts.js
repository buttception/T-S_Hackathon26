// Contract validators for docs/INTERFACES.md §1 (enumerations), §2 (envelope), §3 (scenario config) and
// §5 (trainee profile). Each validate* returns an array of error strings; an empty array means valid.
// Unknown fields are errors: cross-lane data carries exactly the contract fields, nothing ad hoc.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  /**
   * @typedef {{min: number, max: number, base: number}} EnvelopeEntry
   * @typedef {Object<string, EnvelopeEntry>} Envelope
   * @typedef {{alpha: number, beta: number}} Beta
   * @typedef {{trainee_id: string, sessions_completed: number, competencies: Object<string, Beta>,
   *            updated_at_session: (string|null)}} Profile
   * @typedef {{scenario_id: string, scenario: string, seed: number, mode: ('adaptive'|'fixed'),
   *            duration_s: number, eval_interval_s: number, envelope: Envelope,
   *            trainee: {trainee_id: string, agent_profile: string}}} ScenarioConfig
   */

  const COMPETENCIES = ['hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'piracy_response'];
  const MODES = ['adaptive', 'fixed'];
  // Hard ranges from the Setup tab sliders (js/ui.js). Weight multipliers default to 1.0; 0..3 is provisional.
  const SETTING_RANGES = {
    aggression: [0.2, 2.5], sensitivity: [0.2, 2], reaction_delay_s: [0, 120], calm_down_rate: [0.2, 3], detection: [5, 40]
  };
  const WEIGHT_RANGE = [0, 3];
  const PRIOR = { alpha: 1, beta: 1 };
  const EVIDENCE_MIN = 8;   // alpha + beta at which a competency has enough evidence
  const ID_RE = /^[a-z0-9_]+$/;

  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const isStr = v => typeof v === 'string' && v.length > 0;
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const extraKeys = (o, allowed, where) => Object.keys(o).filter(k => !allowed.includes(k)).map(k => `${where}: unknown field "${k}"`);

  function rangeOf(setting) {
    if (SETTING_RANGES[setting]) return SETTING_RANGES[setting];
    if (/^weight\.[A-Za-z]+$/.test(setting)) return WEIGHT_RANGE;
    return null;
  }

  function validateEnvelope(env) {
    if (!isObj(env)) return ['envelope: must be an object'];
    const errs = [];
    for (const [k, e] of Object.entries(env)) {
      const r = rangeOf(k), at = `envelope.${k}`;
      if (!r) { errs.push(`${at}: unknown setting`); continue; }
      if (!isObj(e)) { errs.push(`${at}: must be {min, max, base}`); continue; }
      errs.push(...extraKeys(e, ['min', 'max', 'base'], at));
      if (![e.min, e.max, e.base].every(isNum)) { errs.push(`${at}: min, max and base must be numbers`); continue; }
      if (!(e.min <= e.base && e.base <= e.max)) errs.push(`${at}: needs min <= base <= max`);
      if (e.min < r[0] || e.max > r[1]) errs.push(`${at}: must sit inside ${r[0]}..${r[1]}`);
    }
    return errs;
  }

  function validateProfile(p) {
    if (!isObj(p)) return ['profile: must be an object'];
    const errs = extraKeys(p, ['trainee_id', 'sessions_completed', 'competencies', 'updated_at_session'], 'profile');
    if (!isStr(p.trainee_id) || !ID_RE.test(p.trainee_id)) errs.push('profile.trainee_id: lower-case id required');
    if (!Number.isInteger(p.sessions_completed) || p.sessions_completed < 0) errs.push('profile.sessions_completed: integer >= 0 required');
    if (!isObj(p.competencies)) errs.push('profile.competencies: must be an object');
    else for (const [k, c] of Object.entries(p.competencies)) {
      if (!COMPETENCIES.includes(k)) { errs.push(`profile.competencies.${k}: unknown competency`); continue; }
      if (!isObj(c) || !isNum(c.alpha) || !isNum(c.beta) || c.alpha <= 0 || c.beta <= 0) errs.push(`profile.competencies.${k}: alpha and beta must be numbers > 0`);
      else errs.push(...extraKeys(c, ['alpha', 'beta'], `profile.competencies.${k}`));
    }
    if (p.updated_at_session !== null && !isStr(p.updated_at_session)) errs.push('profile.updated_at_session: string or null');
    return errs;
  }

  // opts.scenarios: optional list of known scenario ids to check "scenario" against
  function validateScenarioConfig(c, opts) {
    if (!isObj(c)) return ['config: must be an object'];
    const errs = extraKeys(c, ['scenario_id', 'scenario', 'seed', 'mode', 'duration_s', 'eval_interval_s', 'envelope', 'trainee'], 'config');
    if (!isStr(c.scenario_id)) errs.push('config.scenario_id: required');
    if (!isStr(c.scenario)) errs.push('config.scenario: required');
    else if (opts && opts.scenarios && !opts.scenarios.includes(c.scenario)) errs.push(`config.scenario: "${c.scenario}" is not loaded`);
    if (!Number.isInteger(c.seed) || c.seed < 0) errs.push('config.seed: integer >= 0 required');
    if (!MODES.includes(c.mode)) errs.push(`config.mode: one of ${MODES.join(', ')}`);
    if (!isNum(c.duration_s) || c.duration_s <= 0) errs.push('config.duration_s: number > 0 required');
    if (!isNum(c.eval_interval_s) || c.eval_interval_s <= 0) errs.push('config.eval_interval_s: number > 0 required');
    else if (isNum(c.duration_s) && c.eval_interval_s >= c.duration_s) errs.push('config.eval_interval_s: must be less than duration_s');
    errs.push(...validateEnvelope(c.envelope));
    const t = c.trainee;
    if (!isObj(t)) errs.push('config.trainee: must be an object');
    else {
      errs.push(...extraKeys(t, ['trainee_id', 'agent_profile'], 'config.trainee'));
      if (!isStr(t.trainee_id) || !ID_RE.test(t.trainee_id)) errs.push('config.trainee.trainee_id: lower-case id required');
      if (!isStr(t.agent_profile)) errs.push('config.trainee.agent_profile: required');
    }
    return errs;
  }

  CGF.contracts = { COMPETENCIES, MODES, SETTING_RANGES, WEIGHT_RANGE, PRIOR, EVIDENCE_MIN,
    validateEnvelope, validateProfile, validateScenarioConfig };
})();
