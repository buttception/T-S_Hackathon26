// Contract validators for docs/INTERFACES.md §1 (enumerations), §2 (envelope), §3 (scenario config), §3.1
// (allocation) and §5 (trainee profile). Each validate* returns an array of error strings; empty means valid.
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
   * @typedef {{seat: string, trainee_id: string, agent_profile: string}} CrewMember
   * @typedef {{scenario_id: string, scenario: string, seed: number, mode: ('adaptive'|'fixed'),
   *            duration_s: number, eval_interval_s: number, envelope: Envelope,
   *            platform: {type: string, model: string}, crew: CrewMember[]}} ScenarioConfig
   */

  // The competency catalog (INTERFACES §1). Which seat exercises which ones is in fixtures/platforms.js (seatFocus).
  const COMPETENCIES = [
    'hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'speed_management',
    'threat_evaluation', 'contact_detection', 'picture_reporting', 'escalation_control'
  ];
  const MODES = ['adaptive', 'fixed'];
  // Platform types and their trainee seats, in seat order (INTERFACES §1). A seat is a trainee station.
  const SEATS_BY_TYPE = { fighter: ['pilot', 'weapon'], warship: ['weapons', 'sensors', 'navigation'], tank: ['commander', 'driver'] };
  const DOMAIN_BY_TYPE = { fighter: 'air', warship: 'sea', tank: 'land' };
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
    const errs = extraKeys(p, ['trainee_id', 'name', 'sessions_completed', 'competencies', 'updated_at_session'], 'profile');
    if (!isStr(p.trainee_id) || !ID_RE.test(p.trainee_id)) errs.push('profile.trainee_id: lower-case id required');
    // The display name is optional (profiles saved before it existed have none). It is a synthetic sample name.
    if (p.name !== undefined && (!isStr(p.name) || p.name.length > 40)) errs.push('profile.name: a string of 1 to 40 characters');
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

  function validatePlatform(p) {
    if (!isObj(p)) return ['config.platform: must be {type, model}'];
    const errs = extraKeys(p, ['type', 'model'], 'config.platform');
    if (!SEATS_BY_TYPE[p.type]) errs.push(`config.platform.type: one of ${Object.keys(SEATS_BY_TYPE).join(', ')}`);
    if (!isStr(p.model)) errs.push('config.platform.model: required');
    return errs;
  }

  // The crew must fill exactly the seats of the platform type, in order, with a different trainee in each seat.
  function validateCrew(crew, type) {
    const seats = SEATS_BY_TYPE[type];
    if (!Array.isArray(crew)) return ['config.crew: must be an array'];
    if (!seats) return [];   // the platform error already says why
    const errs = [];
    if (crew.length !== seats.length) errs.push(`config.crew: a ${type} has ${seats.length} seats (${seats.join(', ')}), got ${crew.length}`);
    crew.forEach((m, i) => {
      const at = `config.crew[${i}]`;
      if (!isObj(m)) { errs.push(`${at}: must be {seat, trainee_id, agent_profile}`); return; }
      errs.push(...extraKeys(m, ['seat', 'trainee_id', 'agent_profile'], at));
      if (m.seat !== seats[i]) errs.push(`${at}.seat: expected "${seats[i]}"`);
      if (!isStr(m.trainee_id) || !ID_RE.test(m.trainee_id)) errs.push(`${at}.trainee_id: lower-case id required`);
      if (!isStr(m.agent_profile)) errs.push(`${at}.agent_profile: required`);
    });
    const ids = crew.filter(isObj).map(m => m.trainee_id);
    if (new Set(ids).size !== ids.length) errs.push('config.crew: a trainee cannot fill two seats');
    return errs;
  }

  // opts.scenarios: optional list of known scenario ids to check "scenario" against
  // opts.domainOf: optional fn(scenario id) -> 'sea' | 'land' | 'air' to check the scenario fits the platform type
  function validateScenarioConfig(c, opts) {
    if (!isObj(c)) return ['config: must be an object'];
    const errs = extraKeys(c, ['scenario_id', 'scenario', 'seed', 'mode', 'duration_s', 'eval_interval_s', 'envelope', 'platform', 'crew'], 'config');
    if (!isStr(c.scenario_id)) errs.push('config.scenario_id: required');
    if (!isStr(c.scenario)) errs.push('config.scenario: required');
    else if (opts && opts.scenarios && !opts.scenarios.includes(c.scenario)) errs.push(`config.scenario: "${c.scenario}" is not loaded`);
    if (!Number.isInteger(c.seed) || c.seed < 0) errs.push('config.seed: integer >= 0 required');
    if (!MODES.includes(c.mode)) errs.push(`config.mode: one of ${MODES.join(', ')}`);
    if (!isNum(c.duration_s) || c.duration_s <= 0) errs.push('config.duration_s: number > 0 required');
    if (!isNum(c.eval_interval_s) || c.eval_interval_s <= 0) errs.push('config.eval_interval_s: number > 0 required');
    else if (isNum(c.duration_s) && c.eval_interval_s >= c.duration_s) errs.push('config.eval_interval_s: must be less than duration_s');
    errs.push(...validateEnvelope(c.envelope));
    errs.push(...validatePlatform(c.platform));
    errs.push(...validateCrew(c.crew, isObj(c.platform) ? c.platform.type : null));
    if (opts && opts.domainOf && isStr(c.scenario) && isObj(c.platform) && DOMAIN_BY_TYPE[c.platform.type]
        && opts.domainOf(c.scenario) !== DOMAIN_BY_TYPE[c.platform.type])
      errs.push(`config.scenario: "${c.scenario}" is a ${opts.domainOf(c.scenario)} scenario; a ${c.platform.type} needs a ${DOMAIN_BY_TYPE[c.platform.type]} one`);
    return errs;
  }

  // INTERFACES §3.1. The two panes of a side-by-side run: the settings they share once, and one crew per pane.
  //   { allocation_id, created_at_session, shared: {scenario, seed, mode, duration_s, eval_interval_s, envelope,
  //     platform}, slots: [{pane: 'A', crew}, {pane: 'B', crew}] }
  const PANES = ['A', 'B'];
  const SHARED_KEYS = ['scenario', 'seed', 'mode', 'duration_s', 'eval_interval_s', 'envelope', 'platform'];

  // Pure. The §3 scenario config of each pane, in pane order. Call it on a structurally valid allocation.
  function expandAllocation(a) {
    return a.slots.map(slot => Object.assign({ scenario_id: `${a.allocation_id}_${slot.pane}` },
      JSON.parse(JSON.stringify(a.shared)), { crew: JSON.parse(JSON.stringify(slot.crew)) }));
  }

  // Structure first, then every derived config against §3, then the checks that span the panes.
  function validateAllocation(a, opts) {
    if (!isObj(a)) return ['allocation: must be an object'];
    const errs = extraKeys(a, ['allocation_id', 'created_at_session', 'shared', 'slots'], 'allocation');
    if (!isStr(a.allocation_id) || !ID_RE.test(a.allocation_id)) errs.push('allocation.allocation_id: lower-case id required');
    if (a.created_at_session !== null && !isStr(a.created_at_session)) errs.push('allocation.created_at_session: string or null');
    if (!isObj(a.shared)) errs.push('allocation.shared: must be an object');
    else {
      errs.push(...extraKeys(a.shared, SHARED_KEYS, 'allocation.shared'));
      for (const k of SHARED_KEYS) if (!(k in a.shared)) errs.push(`allocation.shared.${k}: required`);
    }
    if (!Array.isArray(a.slots) || a.slots.length !== PANES.length || a.slots.some((s, i) => !isObj(s) || s.pane !== PANES[i]))
      errs.push(`allocation.slots: exactly ${PANES.length} entries, panes ${PANES.join(' and ')} in order`);
    else a.slots.forEach(s => errs.push(...extraKeys(s, ['pane', 'crew'], `allocation.slots[${s.pane}]`)));
    if (errs.length) return errs;

    expandAllocation(a).forEach((c, i) => errs.push(...validateScenarioConfig(c, opts).map(m => `pane ${PANES[i]}: ${m}`)));
    const ids = a.slots.flatMap(s => (Array.isArray(s.crew) ? s.crew : []).filter(isObj).map(m => m.trainee_id));
    if (new Set(ids).size !== ids.length) errs.push('allocation: a trainee cannot be in two seats');
    return errs;
  }

  CGF.contracts = { COMPETENCIES, MODES, PANES, SEATS_BY_TYPE, DOMAIN_BY_TYPE, SETTING_RANGES, WEIGHT_RANGE, PRIOR, EVIDENCE_MIN,
    validateEnvelope, validateProfile, validatePlatform, validateCrew, validateScenarioConfig, validateAllocation, expandAllocation };
})();
