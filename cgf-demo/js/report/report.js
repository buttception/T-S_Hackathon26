// End-of-training report (INTERFACES §9): built from a session record (§9.1) for one trainee.
//
//   Report.build(sessionRecord, trainee_id) -> { trainee_id, session_id, facts, narrative }
//   Report.narrate(facts)                   -> template narrative (numbers taken from facts only)
//   Report.validateNarrative(text, facts)   -> [] or a list of numbers that are not in facts
//   Report.finishSession(sessionRecord)     -> builds a report for every trainee in the crew (AI partners are skipped), appends their
//                                              history entries and returns the URL of the report page
//
// Code computes every figure. The narrative is a template; an LLM may later rephrase it, but any
// phrasing must pass validateNarrative, which rejects a number that does not appear in facts.
// Owner: Glenda (report lane).
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  const COMPETENCIES = (CGF.contracts && CGF.contracts.COMPETENCIES) ||
    ['hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'piracy_response'];
  const PRIOR = (CGF.contracts && CGF.contracts.PRIOR) || { alpha: 1, beta: 1 };

  const LABELS = {
    hail_discipline: 'Hail discipline', collision_avoidance: 'Collision avoidance', territorial_awareness: 'Territorial awareness',
    weapons_discipline: 'Weapons discipline', speed_management: 'Speed management', threat_evaluation: 'Threat evaluation',
    contact_detection: 'Contact detection', picture_reporting: 'Picture reporting', escalation_control: 'Escalation control',
    piracy_response: 'Piracy response'
  };
  // §4 event types, for the key-moments list
  const EVENT_LABELS = {
    hail_acknowledged: 'Acknowledged a hail', hail_ignored: 'Ignored a hail',
    safe_passage: 'Passed at a safe distance', close_quarters: 'Came into close quarters',
    left_territorial: 'Left foreign territorial waters', territorial_incursion: 'Entered foreign territorial waters',
    fc_restraint: 'Held fire-control radar', fc_radar_lock: 'Locked fire-control radar on a contact',
    pirate_speed_response: 'Raised speed when approached by pirates', pirate_slow_response: 'Stayed slow near pirates',
    tension_peak: 'CGF tension peaked', exercise_failed: 'Exercise failed'
  };
  const SEAT_LABELS = {
    pilot: 'Pilot', weapon: 'Weapon systems officer', weapons: 'Weapons', sensors: 'Sensors', navigation: 'Navigation',
    commander: 'Commander', driver: 'Driver'
  };

  // An AI partner (INTERFACES §3.2) is a crew entry with role "partner" and a partner_<seat> id. It is listed in the
  // report but never assessed: no report, no history entry, and its events count towards nobody's facts.
  const isPartnerId = id => /^partner_/.test(String(id == null ? '' : id));
  const isPartner = c => !!c && (c.role === 'partner' || isPartnerId(c.trainee_id));
  const partnersOf = record => (record.crew || []).filter(isPartner)
    .map(c => ({ seat: c.seat, trainee_id: c.trainee_id, derived_from: (c.derived_from && c.derived_from.trainee_id) || null }));
  const traineesOf = record => (record.crew || []).filter(c => !isPartner(c));
  const partnerLine = p => `AI partner in the ${SEAT_LABELS[p.seat] ? SEAT_LABELS[p.seat].toLowerCase() : p.seat || 'unknown'} seat` +
    (p.derived_from ? `, based on ${p.derived_from}` : '');

  const MIN_EVENTS = 2, STRONG_FROM = 0.7, WEAK_TO = 0.4;   // a session verdict needs 2+ events
  const round2 = v => Math.round(v * 100) / 100;
  const mean = c => c.alpha / (c.alpha + c.beta);

  // ------------------------------------------------------------ profile at session start
  // The stored profile is still the session-start profile when the report is built: JL's
  // competency update runs after the report (INTERFACES §9).
  function profileOf(trainee_id) {
    try {
      const raw = window.localStorage && localStorage.getItem('cgf.profile.' + trainee_id);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable: fall through to the seeded profile */ }
    const seeded = ((window.CGF_FIXTURES || {}).profiles || []).find(p => p.trainee_id === trainee_id);
    return seeded || { trainee_id, sessions_completed: 0, competencies: {}, updated_at_session: null };
  }

  function checkRecord(r) {
    const errs = [];
    if (!r || typeof r !== 'object') return ['session record: must be an object'];
    if (typeof r.session_id !== 'string' || !r.session_id) errs.push('session record: session_id required');
    if (!Array.isArray(r.crew)) errs.push('session record: crew must be an array');
    if (!Array.isArray(r.events)) errs.push('session record: events must be an array');
    if (!Array.isArray(r.adjustments)) errs.push('session record: adjustments must be an array');
    return errs;
  }

  // ------------------------------------------------------------ facts
  function facts(record, trainee_id, profile) {
    const comps = (profile && profile.competencies) || {};
    const competency_means_start = {};
    for (const k of COMPETENCIES) competency_means_start[k] = round2(mean(comps[k] || PRIOR));

    const events_by_competency = {};
    for (const e of record.events) {
      if (e.trainee_id !== trainee_id || !e.competency || (e.outcome !== 'success' && e.outcome !== 'fail')) continue;
      const c = events_by_competency[e.competency] = events_by_competency[e.competency] || { success: 0, fail: 0 };
      c[e.outcome]++;
    }

    // The competency the adaptation pressed most often; ties go to the contract order
    const counts = {};
    for (const a of record.adjustments) if (a.target_competency) counts[a.target_competency] = (counts[a.target_competency] || 0) + 1;
    let top_target = null;
    for (const k of COMPETENCIES) if (counts[k] && (!top_target || counts[k] > counts[top_target])) top_target = k;

    return { competency_means_start, competency_means_end: null, events_by_competency, adjustments_count: record.adjustments.length, top_target };
  }

  // ------------------------------------------------------------ narrative (template)
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const rate = c => c.success / (c.success + c.fail);

  function narrate(f) {
    const parts = [];
    // Adjustments act on the whole crew's CGFs, so this sentence describes the session, not the trainee
    if (f.adjustments_count === 0) parts.push('The CGFs were not adjusted during this session.');
    else parts.push(`The crew's CGFs were adjusted ${plural(f.adjustments_count, 'time', 'times')}` +
      `${f.top_target ? `, mostly to exercise ${LABELS[f.top_target].toLowerCase()}` : ''}.`);

    const seen = Object.entries(f.events_by_competency).filter(([, c]) => c.success + c.fail > 0)
      .sort((a, b) => rate(a[1]) - rate(b[1]));
    if (!seen.length) { parts.push('No assessed events were recorded for this trainee.'); return parts.join(' '); }
    for (const [k, c] of seen)
      parts.push(`${LABELS[k]}: ${plural(c.success, 'success', 'successes')} and ${plural(c.fail, 'failure', 'failures')}, from a profile mean of ${f.competency_means_start[k]} at the start.`);
    // Same thresholds as the report view: strength from 0.7, focus area at 0.4 or below, 2 events minimum
    const firm = seen.filter(([, c]) => c.success + c.fail >= MIN_EVENTS);
    const strongest = firm.filter(([, c]) => rate(c) >= STRONG_FROM).pop(), weakest = firm.find(([, c]) => rate(c) <= WEAK_TO);
    if (strongest) parts.push(`Strongest this session: ${LABELS[strongest[0]].toLowerCase()}.`);
    if (weakest) parts.push(`Focus area: ${LABELS[weakest[0]].toLowerCase()}.`);
    return parts.join(' ');
  }

  // Numbers in the text that stand on their own (not inside ids like trainee_c01 or s_20261030_01)
  const NUMBER_RE = /(?<![\w.])\d+(?:\.\d+)?(?![\w.]\d)/g;
  function numbersIn(value, out) {
    out = out || [];
    if (typeof value === 'number') out.push(value);
    else if (value && typeof value === 'object') for (const v of Object.values(value)) numbersIn(v, out);
    return out;
  }
  function validateNarrative(text, f) {
    const allowed = numbersIn(f);
    return (String(text).match(NUMBER_RE) || []).map(Number).filter(n => !allowed.some(a => Math.abs(a - n) < 1e-9));
  }

  // ------------------------------------------------------------ build
  function buildWith(record, trainee_id, profile) {
    const errs = checkRecord(record);
    if (errs.length) throw new Error(errs.join('; '));
    if (isPartnerId(trainee_id)) throw new Error(`${trainee_id} is an AI partner: partners get no report`);
    if (!traineesOf(record).some(c => c.trainee_id === trainee_id)) throw new Error(`trainee ${trainee_id} is not in the crew of ${record.session_id}`);
    const f = facts(record, trainee_id, profile);
    const narrative = narrate(f);
    const bad = validateNarrative(narrative, f);
    if (bad.length) throw new Error('narrative has numbers absent from facts: ' + bad.join(', '));
    return { trainee_id, session_id: record.session_id, facts: f, narrative };
  }
  const build = (record, trainee_id) => buildWith(record, trainee_id, profileOf(trainee_id));

  // History entry for one crew member (INTERFACES §9.1)
  function entryFor(record, report) {
    return { session_id: record.session_id, trainee_id: report.trainee_id, scenario: record.scenario, mode: record.mode,
      outcome: record.outcome, report, top_target: report.facts.top_target, competency_means_end: null };
  }

  // The page the host opens when a run ends. The session record travels in the URL hash, because under
  // file:// some browsers give each page its own storage; the history store is the copy that persists.
  const reportUrl = record => 'report.html?session=' + encodeURIComponent(record.session_id) +
    '#record=' + encodeURIComponent(JSON.stringify(record));

  function finishSession(record) {
    const reports = traineesOf(record).map(c => build(record, c.trainee_id));   // partners are listed, not reported
    const entries = reports.map(r => entryFor(record, r));
    if (CGF.History) entries.forEach(e => CGF.History.append(e));
    return { reports, entries, url: reportUrl(record) };
  }

  CGF.Report = { MIN_EVENTS, STRONG_FROM, WEAK_TO, COMPETENCIES, LABELS, EVENT_LABELS, SEAT_LABELS, build, buildWith, facts, narrate, validateNarrative,
    isPartner, isPartnerId, partnersOf, traineesOf, partnerLine, entryFor, reportUrl, finishSession, profileOf, checkRecord, mean };
})();
