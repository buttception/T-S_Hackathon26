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

  // ---- INTERFACES §4 simulation event, §7 adjustment record, §9.1 session record (runtime output)

  // type -> [competency, outcome], the table in §4. A null competency means the event does not update a profile.
  const EVENT_TYPES = {
    hail_acknowledged: ['hail_discipline', 'success'], hail_ignored: ['hail_discipline', 'fail'],
    safe_passage: ['collision_avoidance', 'success'], close_quarters: ['collision_avoidance', 'fail'],
    left_territorial: ['territorial_awareness', 'success'], territorial_incursion: ['territorial_awareness', 'fail'],
    fc_restraint: ['weapons_discipline', 'success'], fc_radar_lock: ['weapons_discipline', 'fail'],
    pirate_speed_response: ['speed_management', 'success'], pirate_slow_response: ['speed_management', 'fail'],
    tension_peak: [null, null], exercise_failed: [null, null]
  };
  const EVENT_KEYS = ['event_id', 't', 'session_id', 'trainee_id', 'seat', 'type', 'competency', 'outcome', 'unit_id', 'detail'];
  const ADJUSTMENT_KEYS = ['adjustment_id', 't', 'session_id', 'force', 'setting', 'old', 'new', 'requested', 'clamped',
    'target_competency', 'seat', 'pressure_direction', 'source', 'policy', 'evidence_event_ids', 'explanation'];
  const RECORD_KEYS = ['session_id', 'pane', 'scenario', 'seed', 'mode', 'platform', 'crew', 'outcome', 'duration_s', 'events', 'adjustments'];
  const ADJUSTMENT_SOURCES = ['engine', 'instructor_steer'], POLICIES = ['rules_v1', 'bandit_v2'], DIRECTIONS = ['up', 'down'];
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

  // seats: optional list of seat ids the event's seat must belong to (the crew of the session)
  function validateEvent(e, seats) {
    if (!isObj(e)) return ['event: must be an object'];
    const errs = extraKeys(e, EVENT_KEYS, 'event');
    for (const k of EVENT_KEYS) if (!(k in e)) errs.push(`event.${k}: required`);
    if (!isStr(e.event_id)) errs.push('event.event_id: required');
    if (!isNum(e.t) || e.t < 0) errs.push('event.t: number >= 0 required');
    if (!isStr(e.session_id)) errs.push('event.session_id: required');
    const row = EVENT_TYPES[e.type];
    if (!row) { errs.push(`event.type: one of ${Object.keys(EVENT_TYPES).join(', ')}`); return errs; }
    if (e.competency !== row[0]) errs.push(`event.competency: ${e.type} is ${row[0] === null ? 'null' : `"${row[0]}"`}`);
    if (e.outcome !== row[1]) errs.push(`event.outcome: ${e.type} is ${row[1] === null ? 'null' : `"${row[1]}"`}`);
    if (row[0] !== null) {   // a competency event names the seat and the trainee in it
      if (!isStr(e.seat)) errs.push('event.seat: a competency event needs a seat');
      if (!isStr(e.trainee_id)) errs.push('event.trainee_id: a competency event needs a trainee');
    } else {
      if (e.seat !== null) errs.push('event.seat: null for a crew-wide event');
      if (e.trainee_id !== null && !isStr(e.trainee_id)) errs.push('event.trainee_id: string or null');
    }
    if (isStr(e.seat) && seats && !seats.includes(e.seat)) errs.push(`event.seat: "${e.seat}" is not a seat of this crew`);
    if (e.unit_id !== null && !isStr(e.unit_id)) errs.push('event.unit_id: string or null');
    if (!isObj(e.detail)) errs.push('event.detail: must be an object');
    return errs;
  }

  // opts.envelope: optional envelope; then `new` must sit inside the setting's min..max (invariant 1)
  function validateAdjustment(a, opts) {
    if (!isObj(a)) return ['adjustment: must be an object'];
    const errs = extraKeys(a, ADJUSTMENT_KEYS, 'adjustment');
    for (const k of ADJUSTMENT_KEYS) if (!(k in a)) errs.push(`adjustment.${k}: required`);
    for (const k of ['adjustment_id', 'session_id', 'force']) if (!isStr(a[k])) errs.push(`adjustment.${k}: required`);
    if (!isNum(a.t) || a.t < 0) errs.push('adjustment.t: number >= 0 required');
    if (!isStr(a.setting) || !rangeOf(a.setting)) errs.push('adjustment.setting: a known setting (INTERFACES §2)');
    for (const k of ['old', 'new', 'requested']) if (!isNum(a[k])) errs.push(`adjustment.${k}: number required`);
    if (typeof a.clamped !== 'boolean') errs.push('adjustment.clamped: boolean required');
    else if (isNum(a.new) && isNum(a.requested) && a.clamped === near(a.new, a.requested)) errs.push('adjustment.clamped: true exactly when requested differs from new');
    if (!COMPETENCIES.includes(a.target_competency)) errs.push('adjustment.target_competency: a catalog competency');
    if (a.seat !== null && !isStr(a.seat)) errs.push('adjustment.seat: string or null');
    if (!DIRECTIONS.includes(a.pressure_direction)) errs.push(`adjustment.pressure_direction: one of ${DIRECTIONS.join(', ')}`);
    if (!ADJUSTMENT_SOURCES.includes(a.source)) errs.push(`adjustment.source: one of ${ADJUSTMENT_SOURCES.join(', ')}`);
    if (!POLICIES.includes(a.policy)) errs.push(`adjustment.policy: one of ${POLICIES.join(', ')}`);
    if (!Array.isArray(a.evidence_event_ids) || !a.evidence_event_ids.every(isStr)) errs.push('adjustment.evidence_event_ids: array of event ids');
    if (a.explanation !== null && !isStr(a.explanation)) errs.push('adjustment.explanation: null or a string');
    const env = opts && opts.envelope && opts.envelope[a.setting];
    if (env && isNum(a.new) && (a.new < env.min - 1e-9 || a.new > env.max + 1e-9)) errs.push(`adjustment.new: ${a.new} is outside the envelope ${env.min}..${env.max}`);
    return errs;
  }

  // opts.envelope: optional, passed to every adjustment check
  function validateSessionRecord(r, opts) {
    if (!isObj(r)) return ['record: must be an object'];
    const errs = extraKeys(r, RECORD_KEYS, 'record');
    for (const k of RECORD_KEYS) if (!(k in r)) errs.push(`record.${k}: required`);
    if (!isStr(r.session_id)) errs.push('record.session_id: required');
    if (r.pane !== null && !(typeof r.pane === 'string' && /^[A-Z]$/.test(r.pane))) errs.push('record.pane: one capital letter (A or B on the host page), or null for a local run');
    if (!isStr(r.scenario)) errs.push('record.scenario: required');
    if (!Number.isInteger(r.seed) || r.seed < 0) errs.push('record.seed: integer >= 0 required');
    if (!MODES.includes(r.mode)) errs.push(`record.mode: one of ${MODES.join(', ')}`);
    if (!SEATS_BY_TYPE[r.platform]) errs.push(`record.platform: the platform type, one of ${Object.keys(SEATS_BY_TYPE).join(', ')}`);
    if (!['success', 'fail'].includes(r.outcome)) errs.push('record.outcome: success or fail');
    if (!isNum(r.duration_s) || r.duration_s < 0) errs.push('record.duration_s: number >= 0 required');
    const seats = SEATS_BY_TYPE[r.platform];
    if (!Array.isArray(r.crew)) errs.push('record.crew: must be an array');
    else {
      if (seats) {
        if (r.crew.length !== seats.length) errs.push(`record.crew: a ${r.platform} has ${seats.length} seats, got ${r.crew.length}`);
        r.crew.forEach((m, i) => {
          if (!isObj(m)) { errs.push(`record.crew[${i}]: must be {seat, trainee_id}`); return; }
          errs.push(...extraKeys(m, ['seat', 'trainee_id'], `record.crew[${i}]`));
          if (m.seat !== seats[i]) errs.push(`record.crew[${i}].seat: expected "${seats[i]}"`);
          if (!isStr(m.trainee_id) || !ID_RE.test(m.trainee_id)) errs.push(`record.crew[${i}].trainee_id: lower-case id required`);
        });
      }
    }
    const crew = Array.isArray(r.crew) ? r.crew.filter(isObj) : [];
    if (!Array.isArray(r.events)) errs.push('record.events: must be an array');
    else r.events.forEach((e, i) => {
      errs.push(...validateEvent(e, seats).map(m => `record.events[${i}]: ${m}`));
      if (isObj(e) && e.session_id !== r.session_id) errs.push(`record.events[${i}].session_id: must equal the record's`);
      if (isObj(e) && isStr(e.seat) && !crew.some(m => m.seat === e.seat && m.trainee_id === e.trainee_id))
        errs.push(`record.events[${i}]: trainee ${e.trainee_id} is not in seat ${e.seat} of this crew`);
    });
    if (!Array.isArray(r.adjustments)) errs.push('record.adjustments: must be an array');
    else r.adjustments.forEach((a, i) => {
      errs.push(...validateAdjustment(a, opts).map(m => `record.adjustments[${i}]: ${m}`));
      if (isObj(a) && a.session_id !== r.session_id) errs.push(`record.adjustments[${i}].session_id: must equal the record's`);
      if (isObj(a) && isStr(a.seat) && seats && !seats.includes(a.seat)) errs.push(`record.adjustments[${i}].seat: "${a.seat}" is not a seat of this crew`);
    });
    return errs;
  }

  CGF.contracts = { COMPETENCIES, MODES, PANES, SEATS_BY_TYPE, DOMAIN_BY_TYPE, SETTING_RANGES, WEIGHT_RANGE, PRIOR, EVIDENCE_MIN,
    EVENT_TYPES, validateEnvelope, validateProfile, validatePlatform, validateCrew, validateScenarioConfig, validateAllocation, expandAllocation,
    validateEvent, validateAdjustment, validateSessionRecord };
})();
