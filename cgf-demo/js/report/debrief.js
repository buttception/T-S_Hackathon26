// Debrief: why the CGFs acted as they did for one trainee, and how this session calibrates their next one.
//
//   Debrief.why(sessionRecord, trainee_id)         -> { seat, mode, phases[], crew_phases, lines[] }
//   Debrief.next(trainee_id, {record, seat})       -> { target, mean, evidence, reason, pending, trend, lines[] }
//
// why() groups the adjustments that served the trainee's seat into phases (same target, same direction) and
// explains each from the trainee's own events: the CGFs got sharper while the trainee was missing the target
// (remediation, INTERFACES §6) and eased off once they met it. next() applies the target rule of INTERFACES
// §5.1 to the trainee's profile, so the instructor sees which competency the CGFs will press next time and why.
//
// This is a view on the session record and the history, not part of the §9 report: the report keeps exactly
// its contract fields. Every number here is computed by code; there is no LLM step. Owner: Glenda (report lane).
// Needs js/report/report.js and js/history/history.js; reads fixtures/platforms.js for the seat focus.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};
  const R = CGF.Report;
  const EVIDENCE_MIN = (CGF.contracts && CGF.contracts.EVIDENCE_MIN) || 8;
  const PRIOR = (CGF.contracts && CGF.contracts.PRIOR) || { alpha: 1, beta: 1 };
  const round2 = v => Math.round(v * 100) / 100;
  const lower = k => (R.LABELS[k] || String(k).replace(/_/g, ' ')).toLowerCase();

  // What a setting change does to the CGFs' behaviour: [when the value rises, when it falls]
  const BEHAVIOUR = {
    aggression: ['escalated more readily', 'escalated less readily'],
    sensitivity: ['reacted to smaller provocations', 'needed bigger provocations to react'],
    reaction_delay_s: ['took longer to react', 'reacted faster'],
    calm_down_rate: ['calmed down faster', 'stayed tense for longer'],
    detection: ['spotted contacts from further out', 'spotted contacts only at shorter range'],
    'weight.ignoredWarning': ['took ignored hails more seriously', 'took ignored hails less seriously'],
    'weight.cpa': ['reacted harder to close approaches', 'tolerated closer approaches'],
    'weight.proximity': ['reacted harder to being crowded', 'tolerated being crowded'],
    'weight.territorial': ['reacted harder to territorial incursions', 'tolerated territorial incursions more'],
    'weight.contiguous': ['reacted harder to entries into the contiguous zone', 'tolerated the contiguous zone more'],
    'weight.fcRadar': ['reacted harder to fire-control radar locks', 'tolerated fire-control radar locks more'],
    'weight.slowSpeed': ['pressed harder on slow transits', 'pressed less on slow transits']
  };
  function behaviour(setting, oldV, newV) {
    const b = BEHAVIOUR[setting] || [`raised ${setting}`, `lowered ${setting}`];
    return newV >= oldV ? b[0] : b[1];
  }

  const seatOf = (record, id) => (record.crew.find(c => c.trainee_id === id) || {}).seat || null;
  const seatFocus = (platform, seat) => {
    const t = ((window.CGF_FIXTURES || {}).platformTypes || {})[platform];
    return (t && t.seatFocus && t.seatFocus[seat]) || [];
  };

  // An adjustment served this trainee if it names their seat. Older records have no seat on adjustments;
  // then it served them if its evidence events are theirs.
  function served(adj, id, seat, eventsById) {
    if (adj.seat) return adj.seat === seat;
    return (adj.evidence_event_ids || []).some(eid => (eventsById[eid] || {}).trainee_id === id);
  }

  // ------------------------------------------------------------ why the CGFs acted as they did
  function why(record, id) {
    const seat = seatOf(record, id);
    const eventsById = {};
    for (const e of record.events) eventsById[e.event_id] = e;
    const mine = record.adjustments.filter(a => served(a, id, seat, eventsById)).slice().sort((a, b) => a.t - b.t);
    const crew_phases = record.adjustments.length - mine.length;

    // Consecutive adjustments with the same target, direction and source form one phase
    const phases = [];
    for (const a of mine) {
      const last = phases[phases.length - 1];
      if (last && last.target === a.target_competency && last.direction === a.pressure_direction && last.source === a.source) last.adjustments.push(a);
      else phases.push({ target: a.target_competency, direction: a.pressure_direction, source: a.source, adjustments: [a] });
    }

    for (const p of phases) {
      p.t0 = p.adjustments[0].t; p.t1 = p.adjustments[p.adjustments.length - 1].t;
      // Net change per setting across the phase, in the order first touched
      const net = {};
      for (const a of p.adjustments) {
        if (!net[a.setting]) net[a.setting] = { setting: a.setting, old: a.old, new: a.new, clamped: false };
        net[a.setting].new = a.new;
        net[a.setting].clamped = net[a.setting].clamped || !!a.clamped;
      }
      p.changes = Object.values(net).map(c => Object.assign(c, { behaviour: behaviour(c.setting, c.old, c.new) }));
      // The trainee's own target events up to the end of the phase (the evidence the policy saw)
      const ids = new Set(p.adjustments.flatMap(a => a.evidence_event_ids || []));
      const ev = record.events.filter(e => ids.has(e.event_id) && e.trainee_id === id);
      p.evidence = { success: ev.filter(e => e.outcome === 'success').length, fail: ev.filter(e => e.outcome === 'fail').length,
        moments: ev.map(e => ({ t: e.t, type: e.type, outcome: e.outcome })) };
      // And what the trainee did on the target in the session up to that point
      const sofar = record.events.filter(e => e.trainee_id === id && e.competency === p.target && e.t <= p.t1);
      p.so_far = { success: sofar.filter(e => e.outcome === 'success').length, fail: sofar.filter(e => e.outcome === 'fail').length };
      p.reason = reason(p);
    }

    return { trainee_id: id, session_id: record.session_id, seat, mode: record.mode, phases, crew_phases, lines: summary(record, id, phases, crew_phases) };
  }

  function reason(p) {
    const comp = lower(p.target), n = p.evidence.success + p.evidence.fail;
    const did = p.changes.map(c => c.behaviour).join(', ');
    if (p.source === 'instructor_steer') return `The instructor steered the CGFs onto ${comp}, so they ${did}.`;
    if (p.direction === 'up' && !n) return `There was no recent ${comp} evidence yet, and it was the trainee's weakest focus competency, so the CGFs ${did} to create a chance to practise it.`;
    if (p.direction === 'up') return `The trainee handled ${p.evidence.success} of their last ${n} ${comp} events, still missing the target, so the CGFs ${did} to keep pressing it.`;
    if (p.direction === 'down') return `The trainee handled ${p.evidence.success} of their last ${n} ${comp} events, now meeting the target, so the CGFs ${did} to ease off.`;
    return `The CGFs ${did}.`;
  }

  function summary(record, id, phases, crew_phases) {
    if (record.mode === 'fixed') return ['Fixed mode: the CGFs kept their settings for the whole run, so their behaviour reflects the scenario only, not this trainee.'];
    if (!phases.length) return [crew_phases
      ? 'The CGFs did not adjust for this trainee; every adjustment in this run served a crewmate’s seat.'
      : 'The CGFs did not need to adjust during this run.'];
    const ups = phases.filter(p => p.direction === 'up').length, downs = phases.filter(p => p.direction === 'down').length;
    const lines = [];
    const targets = [...new Set(phases.map(p => p.target))];
    lines.push(`The CGFs adapted to this trainee in ${phases.length} ${phases.length === 1 ? 'phase' : 'phases'}, aimed at ${targets.map(lower).join(' and ')}.`);
    if (ups && downs) lines.push('They got sharper while the trainee was missing the target and eased off once the trainee started meeting it.');
    else if (ups) lines.push('They only got sharper: the trainee had not yet met the target by the end of the run.');
    else lines.push('They only eased off: the trainee was already meeting the target.');
    return lines;
  }

  // ------------------------------------------------------------ calibration for the next session
  // The profile the next session will start from. If this trainee's latest session has not been through the
  // competency update yet (competency_means_end is null), add its events, as the Beta update of INTERFACES §5
  // would, and mark the result as pending.
  function nextProfile(id) {
    const base = R.profileOf(id), comps = {};
    for (const [k, b] of Object.entries(base.competencies || {})) comps[k] = { alpha: b.alpha, beta: b.beta };
    const latest = CGF.History ? CGF.History.list(id).slice(-1)[0] : null;
    const storedAfter = base.updated_at_session && latest && base.updated_at_session === latest.session_id;
    const pending = !!(latest && latest.competency_means_end == null && !storedAfter);
    if (pending) for (const [k, c] of Object.entries(latest.report.facts.events_by_competency || {})) {
      const b = comps[k] = comps[k] || { alpha: PRIOR.alpha, beta: PRIOR.beta };
      b.alpha += c.success; b.beta += c.fail;
    }
    return { comps, pending, latest };
  }

  function next(id, opts) {
    opts = opts || {};
    const { comps, pending, latest } = nextProfile(id);
    const seat = opts.seat || (opts.record ? seatOf(opts.record, id) : null);
    const focus = opts.record && seat ? seatFocus(opts.record.platform, seat) : [];
    const enough = k => comps[k] && comps[k].alpha + comps[k].beta >= EVIDENCE_MIN;
    const m = k => comps[k].alpha / (comps[k].alpha + comps[k].beta);
    const weakest = list => list.filter(enough).sort((a, b) => m(a) - m(b))[0] || null;

    // INTERFACES §5.1: weakest with enough evidence among the seat's competencies, else overall
    let target = weakest(focus), why_target = 'weakest_in_seat';
    if (!target) { target = weakest(Object.keys(comps)); why_target = 'weakest_overall'; }
    if (!target) why_target = 'no_evidence';

    const overall = weakest(Object.keys(comps));
    const ranked = Object.keys(comps).filter(enough).sort((a, b) => m(a) - m(b));
    const strongest = ranked.length > 1 ? ranked[ranked.length - 1] : null;
    const entries = CGF.History ? CGF.History.list(id) : [];
    const trend = target ? trendOf(entries, target, round2(m(target))) : null;
    const thin = Object.keys(comps).filter(k => !enough(k) && (focus.length ? focus.includes(k) : true));

    const out = { trainee_id: id, seat, target, reason: why_target, pending,
      mean: target ? round2(m(target)) : null, evidence: target ? comps[target].alpha + comps[target].beta : 0,
      overall, overall_mean: overall ? round2(m(overall)) : null,
      strongest, strongest_mean: strongest ? round2(m(strongest)) : null, thin, trend, sessions: entries.length };
    out.lines = nextLines(out, latest);
    return out;
  }

  // How the target competency moved across the trainee's sessions, and how often the CGFs pressed it
  function trendOf(entries, k, now) {
    if (!entries.length) return null;
    const first = entries[0].report.facts.competency_means_start[k];
    const pressed = entries.filter(e => e.top_target === k).length;
    let practised = 0;
    for (const e of entries) { const c = (e.report.facts.events_by_competency || {})[k]; if (c) practised += c.success + c.fail; }
    return { first: first == null ? null : first, now, pressed, practised, sessions: entries.length };
  }

  function nextLines(o, latest) {
    const lines = [];
    if (!o.target) {
      lines.push('No competency has enough evidence yet, so the next session starts by exposing the trainee broadly; the CGFs will pick a target once events build up.');
      return lines;
    }
    const where = o.reason === 'weakest_in_seat' && o.seat ? ` among the ${R.SEAT_LABELS[o.seat] || o.seat} seat’s competencies` : '';
    lines.push(`Next session${where ? ' in the same seat' : ''} the CGFs will start by pressing ${lower(o.target)}: it is the trainee’s weakest competency${where}, at ${o.mean} from ${o.evidence} pieces of evidence.`);
    if (o.trend && o.trend.sessions > 1 && o.trend.first != null) {
      const dir = o.trend.now > o.trend.first ? 'up from' : o.trend.now < o.trend.first ? 'down from' : 'unchanged from';
      const pressed = o.trend.pressed ? `the CGFs made it their main target in ${o.trend.pressed} of those sessions` : 'the CGFs have not yet made it their main target';
      lines.push(`Over ${o.trend.sessions} sessions it has moved ${dir} ${o.trend.first}, across ${o.trend.practised} assessed events; ${pressed}.`);
    }
    if (o.overall && o.overall !== o.target)
      lines.push(`${R.LABELS[o.overall] || o.overall} is still the trainee\u2019s weakest overall (${o.overall_mean}); it is pressed whenever they sit in a seat that exercises it.`);
    lines.push('While the trainee keeps missing the target the CGFs escalate sooner and react harder in that area; once the trainee handles it consistently they ease back toward the instructor’s base settings.');
    if (o.strongest && o.strongest !== o.target) lines.push(`${R.LABELS[o.strongest] || o.strongest} is the trainee’s strongest (${o.strongest_mean}), so the CGFs will not spend pressure there.`);
    if (o.thin.length) lines.push(`Not enough evidence yet for ${o.thin.map(lower).join(', ')}; these stay neutral until the trainee is tested on them.`);
    if (o.pending && latest) lines.push(`Includes this session (${latest.session_id}) ahead of the competency update.`);
    return lines;
  }

  CGF.Debrief = { BEHAVIOUR, behaviour, why, next, nextProfile, served };
})();
