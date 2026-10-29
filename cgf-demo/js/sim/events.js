// Simulation events (docs/INTERFACES.md §4), raised from the engine's hooks while a training session is
// configured. Nothing is emitted for ordinary free play, so the runtime behaves as before outside a session.
//
//   CGF.simEvents.configure({ session_id, crew: [{seat, trainee_id}], platformType })   start a session's log
//   CGF.simEvents.drain()   events raised since the last drain (CGF.step returns these)
//   CGF.simEvents.log()     every event of the session so far
//
// Each competency event names the seat that caused it (§4 "seat"): the first seat, in seat order, whose focus
// list (fixtures/platforms.js seatFocus) contains the competency.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  // §4 event types: competency and outcome
  const TYPES = {
    hail_acknowledged:     ['hail_discipline', 'success'],
    hail_ignored:          ['hail_discipline', 'fail'],
    safe_passage:          ['collision_avoidance', 'success'],
    close_quarters:        ['collision_avoidance', 'fail'],
    left_territorial:      ['territorial_awareness', 'success'],
    territorial_incursion: ['territorial_awareness', 'fail'],
    fc_restraint:          ['weapons_discipline', 'success'],
    fc_radar_lock:         ['weapons_discipline', 'fail'],
    pirate_speed_response: ['piracy_response', 'success'],
    pirate_slow_response:  ['piracy_response', 'fail'],
    tension_peak:          [null, null],
    exercise_failed:       [null, null]
  };
  // Used only if fixtures/platforms.js is not loaded; the fixture is the source (provisional mapping)
  const SEAT_FOCUS_FALLBACK = {
    fighter: { pilot: ['collision_avoidance', 'territorial_awareness', 'hail_discipline'], weapon: ['weapons_discipline', 'piracy_response'] },
    warship: { weapons: ['weapons_discipline'], sensors: ['piracy_response'], navigation: ['collision_avoidance', 'territorial_awareness', 'hail_discipline'] },
    tank:    { commander: ['hail_discipline', 'weapons_discipline', 'piracy_response'], driver: ['collision_avoidance', 'territorial_awareness'] }
  };

  // Detection thresholds, in the scenario's distance units before range scaling
  const ENCOUNTER = 4;        // a vessel this close counts as an encounter to pass safely
  const CLOSE_QUARTERS = 1;   // passing closer than this is a collision-avoidance failure
  const RESTRAINT_S = 60;     // holding fire-control for this long after a unit escalates to Harass or above
  const PIRATE_WINDOW_S = 120;
  const PEAK = 80, PEAK_REARM = 60;

  let S = null; // session state

  function seatFocus(platformType) {
    const F = window.CGF_FIXTURES, t = F && F.platformTypes && F.platformTypes[platformType];
    return (t && t.seatFocus) || SEAT_FOCUS_FALLBACK[platformType] || {};
  }

  // The seat that owns a competency: the first seat, in crew order, whose focus includes it
  function seatFor(competency, crew, platformType) {
    if (!competency) return null;
    const focus = seatFocus(platformType);
    const m = crew.find(c => (focus[c.seat] || []).includes(competency));
    return m || crew[0] || null;
  }

  const round = v => Math.round(v * 100) / 100;

  function raise(type, unit, detail) {
    if (!S) return;
    const [competency, outcome] = TYPES[type];
    const member = seatFor(competency, S.crew, S.platformType);
    const ev = {
      event_id: `e_${String(++S.n).padStart(6, '0')}`,
      t: round(CGF.sim.t),
      session_id: S.session_id,
      trainee_id: competency && member ? member.trainee_id : null,
      seat: competency && member ? member.seat : null,
      type, competency, outcome,
      unit_id: unit ? unit.name : null,
      detail: detail || {}
    };
    S.all.push(ev); S.queue.push(ev);
    CGF.emit('sim:event', ev);
  }

  function configure(opts) {
    S = {
      session_id: opts.session_id, crew: opts.crew.map(c => ({ seat: c.seat, trainee_id: c.trainee_id })),
      platformType: opts.platformType, n: 0, all: [], queue: [],
      enc: {}, inZone: false, zone: null, restraint: [], pirates: {}, peaks: {}, warnings: {}
    };
  }

  const sameDomain = u => CGF.domainOf(u) === (CGF.sim.own.domain || CGF.scenario.domain);
  const armed = u => u.role === 'cgf' && CGF.harnessOf(u).armed;
  const isRaider = u => u.role === 'cgf' && CGF.scenario.forces[u.force].kind === 'non-state';

  function onStep() {
    if (!S || !CGF.sim) return;
    const sim = CGF.sim, o = sim.own, k = CGF.rangeScale(), t = sim.t;

    // collision avoidance: each encounter ends in either a safe passage or close quarters
    for (const u of sim.units) {
      if (!sameDomain(u)) continue;
      const d = U.dist(o, u), e = S.enc[u.name];
      if (!e) { if (d < ENCOUNTER * k) S.enc[u.name] = { min: d, closeRaised: false }; continue; }
      e.min = Math.min(e.min, d);
      if (e.done) { if (d > ENCOUNTER * 1.5 * k) delete S.enc[u.name]; continue; }   // a new approach is a new encounter
      if (!e.closeRaised && d < CLOSE_QUARTERS * k) { e.closeRaised = true; raise('close_quarters', u, { range: round(d) }); }
      if (U.rangeRate(o, u) > 0 && d > e.min + 0.2 * k) {          // passed: the range is opening again
        if (!e.closeRaised) raise('safe_passage', u, { cpa: round(e.min) });
        e.done = true;
      }
    }

    // territorial awareness: entering any foreign claimed zone is a lapse; leaving it again is a recovery
    const foreign = CGF.zonesAt(o).filter(z => z.owner !== o.force);
    if (foreign.length && !S.inZone) { S.inZone = true; S.zone = foreign[0].name; raise('territorial_incursion', null, { zone: foreign[0].name }); }
    else if (!foreign.length && S.inZone) { S.inZone = false; raise('left_territorial', null, { zone: S.zone }); }

    // weapons discipline: holding fire-control after a unit escalates to Harass or above
    S.restraint = S.restraint.filter(r => {
      if (sim.fcTarget) return false;                               // fired up meanwhile: the lock already counted
      if (t >= r.until) { raise('fc_restraint', r.unit, { held_s: RESTRAINT_S }); return false; }
      return true;
    });

    // piracy response: did the ship speed up once raiders started closing?
    for (const u of sim.units.filter(isRaider)) {
      const p = S.pirates[u.name], hi = CGF.scaledRanges(CGF.harnessOf(u)).highSpeedKts;
      if (u.stateIdx >= 1 && !p) S.pirates[u.name] = { until: t + PIRATE_WINDOW_S, done: false };
      else if (p && !p.done) {
        if (o.spd >= hi) { p.done = true; raise('pirate_speed_response', u, { speed: round(o.spd) }); }
        else if (t >= p.until) { p.done = true; raise('pirate_slow_response', u, { speed: round(o.spd) }); }
      } else if (p && p.done && u.stateIdx === 0) delete S.pirates[u.name];
    }

    // live-signal events with no competency: tension crossing the peak line
    for (const u of sim.units.filter(armed)) {
      if (u.tension >= PEAK && !S.peaks[u.name]) { S.peaks[u.name] = true; raise('tension_peak', u, { tension: round(u.tension) }); }
      else if (u.tension < PEAK_REARM) S.peaks[u.name] = false;
    }
  }

  // Hail discipline: every warning is answered (acknowledged) or not. Unanswered counts once, whichever comes
  // first: the engine's ignore timer, a newer warning from the same unit, or the unit escalating past it.
  const closeWarning = (u, type, reason) => {
    if (!S) return;
    const w = S.warnings[u.name];
    if (type === 'hail_acknowledged') { delete S.warnings[u.name]; raise(type, u, w ? { answered_after_s: round(CGF.sim.t - w.t) } : {}); return; }
    if (!w) return;
    delete S.warnings[u.name];
    raise('hail_ignored', u, { reason });
  };
  CGF.on('sim:warn', u => { if (!S) return; closeWarning(u, 'hail_ignored', 'superseded'); S.warnings[u.name] = { t: CGF.sim.t }; });
  CGF.on('sim:hail-ack', u => closeWarning(u, 'hail_acknowledged'));
  CGF.on('sim:hail-ignored', u => closeWarning(u, 'hail_ignored', 'no answer'));
  CGF.on('sim:fc', (u, on) => { if (on) raise('fc_radar_lock', u, {}); });
  CGF.on('sim:fail', u => raise('exercise_failed', u, {}));
  CGF.on('sim:state', (u, from, to) => {
    if (!S) return;
    const st = CGF.harnessOf(u).states[to];
    if (S.warnings[u.name] && !st.warn) {
      if (to > from) closeWarning(u, 'hail_ignored', 'escalated');
      else delete S.warnings[u.name];                              // stood down: the warning lapses, no evidence
    }
    if (!armed(u) || to <= from) return;
    if (CGF.levelOf(u) >= 0.75 && !CGF.sim.fcTarget) S.restraint.push({ unit: u, until: CGF.sim.t + RESTRAINT_S });
  });
  CGF.on('sim:step', onStep);
  CGF.on('reset', () => { S = null; });   // a new scenario load ends the session's log until it is configured again

  CGF.simEvents = {
    TYPES, configure, seatFor, seatFocus,
    active: () => !!S,
    drain: () => { if (!S) return []; const q = S.queue; S.queue = []; return q; },
    log: () => (S ? S.all.slice() : [])
  };
})();
