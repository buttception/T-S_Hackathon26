// Runs an adaptive training session inside this runtime page (one runtime): the bridge between the simulation and
// the pure adaptation engine (js/adapt/adapt.js).
//
// A session starts when the link loads a scenario config (the 'link-init' event from link/runtime-link.js), or from the
// Reasoning tab for a local run without the host page. Then, every eval_interval_s of sim time:
//   simulation events since the last cycle -> Adapt.evaluate -> CGF.apply(adjustments)
// A training session always runs for its full duration_s, in both adaptive and fixed mode, so every run gives
// the same amount of evidence. Reaching a failure state is logged (an exercise_failed event) instead of ending
// the run early; at duration_s the run ends with outcome "fail" if that happened, otherwise "success".
// When the run ends, the session record (INTERFACES §9.1) is built, emitted as 'session-record' and kept for export.
//
// Note: INTERFACES §11 puts the engine in the host page. It runs here instead, in the runtime, because the host does not
// relay events or adjustments yet; Adapt is pure, so moving it to the host later needs no change to it.
(function () {
  'use strict';
  const CGF = window.CGF;

  // Envelope for local runs started from the Reasoning tab. Linked runs use the allocation's envelope as given.
  const LOCAL_ENVELOPE = {
    aggression:              { min: 0.6, max: 2.0, base: 1.0 },
    sensitivity:             { min: 0.6, max: 2.0, base: 1.0 },
    reaction_delay_s:        { min: 5,   max: 60,  base: 30 },
    calm_down_rate:          { min: 0.5, max: 2.0, base: 1.0 },    // runtime default 1 (CGF.params.decay); same as fixtures/envelope-default.js
    detection:               { min: 10,  max: 30,  base: 20 },     // runtime default 20 nm (CGF.params.detection)
    'weight.ignoredWarning': { min: 0.5, max: 2.5, base: 1.0 },
    'weight.cpa':            { min: 0.5, max: 2.0, base: 1.0 },
    'weight.team':           { min: 0.3, max: 2.0, base: 1.0 }    // teamwork of the opposition (js/sim/team.js)
  };

  let session = null, lastRecord = null;

  // The trainee's profile: the live one JL's competency update keeps in localStorage, else the seeded fixture
  function profileFor(id) {
    try {
      const p = JSON.parse(localStorage.getItem(`cgf.profile.${id}`) || 'null');
      if (p && p.competencies && typeof p.competencies === 'object') return p;
    } catch (e) { /* no storage or not JSON: use the fixture */ }
    const F = window.CGF_FIXTURES;
    return (F && F.profiles || []).find(p => p.trainee_id === id) || null;
  }

  // A session id that is unique per run. Wall-clock time is used here, outside the simulation, only for the id.
  function newSessionId() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `s_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  // Loads any agent profile files the crew names that are not registered yet (they are plain scripts)
  async function ensureAgents(config) {
    const missing = [...new Set(config.crew.map(c => c.agent_profile).filter(p => !CGF.traineeAgents[p]))];
    for (const p of missing) await CGF.util.loadScript(p);
  }

  // opts: { session_id, scripted (default true) }. Returns the error list (empty when started).
  function begin(config, opts) {
    const errs = CGF.contracts ? CGF.contracts.validateScenarioConfig(config) : [];
    if (errs.length) { CGF.log('Adaptive session not started: ' + errs.join('; '), 'alert'); return errs; }
    const session_id = opts.session_id || newSessionId();
    CGF.simEvents.configure({ session_id, crew: config.crew, platformType: config.platform.type });

    // Start every enveloped setting at its base (an initial setting, not an adjustment)
    for (const [k, e] of Object.entries(config.envelope)) CGF.settings.set(k, e.base, 'all');
    CGF.emit('params');

    if (opts.scripted !== false) {
      const missing = CGF.crewAgent.start(config);
      if (missing.length) { CGF.log(`Scripted crew not started: agent profile(s) ${missing.join(', ')} not loaded.`, 'alert'); return [`agents not loaded: ${missing.join(', ')}`]; }
    }

    const profiles = {};
    for (const m of config.crew.filter(c => c.role !== 'partner')) profiles[m.trainee_id] = profileFor(m.trainee_id);
    const adapt = CGF.Adapt.create({
      config, profiles, seatFocus: CGF.simEvents.seatFocus(config.platform.type), session_id,
    });
    CGF.Adapt.current = adapt;
    // Run to the full duration: failure states are logged by the engine's freeplay rule, not ending the run
    CGF.sim.mode = 'freeplay';
    CGF.emit('mode');
    session = { config, adapt, session_id, nextEval: config.eval_interval_s, seen: 0, ended: false, failed: false };
    CGF.log(`Adaptive session ${session_id}: ${config.mode} mode, ${config.crew.map(m => `${m.seat} ${m.trainee_id}`).join(', ')}.`, 'instr');
    CGF.emit('adapt:start', session);
    return [];
  }

  async function start(config, opts) {
    opts = opts || {};
    try { await ensureAgents(config); } catch (e) { CGF.log(`Could not load an agent profile: ${e.message}`, 'alert'); }
    return begin(config, opts);
  }

  function cycle(now) {
    const evs = CGF.simEvents.log().slice(session.seen);
    session.seen += evs.length;
    const adjustments = session.adapt.evaluate(evs, now);
    CGF.apply(adjustments);
    CGF.emit('adapt:cycle', { adjustments, live: session.adapt.liveState() });
  }

  function onStep() {
    if (!session || session.ended || !CGF.sim) return;
    const t = CGF.sim.t, c = session.config;
    while (t >= session.nextEval) { cycle(session.nextEval); session.nextEval += c.eval_interval_s; }
    if (t >= c.duration_s && !CGF.sim.outcome) {
      const kind = session.failed ? 'fail' : 'success';
      CGF.sim.mode = 'exercise';   // so the end is reported like any other: the 'outcome' event, and 'ended' to the host
      CGF.endRun(kind, `Exercise time complete (${c.duration_s} s)${session.failed ? ': a failure state was reached during the run' : ''}.`);
    }
  }

  function onOutcome(kind) {
    if (!session || session.ended || !kind) return;
    session.ended = true;
    session.adapt.observe(CGF.simEvents.log().slice(session.seen));
    lastRecord = session.adapt.endSession(kind, CGF.sim.t);
    CGF.crewAgent.stop();
    CGF.log(`Session record ready: ${lastRecord.events.length} events, ${lastRecord.adjustments.length} adjustments.`, 'instr');
    CGF.emit('session-record', lastRecord);
  }

  // directive: INTERFACES §8, validated here again before it can reach the engine (invariant 6)
  function steer(directive) {
    if (!session || session.ended) throw new Error('no adaptive session is running');
    const errs = CGF.adaptSteer.validate(directive, session.config.crew);
    if (errs.length) throw new Error(errs.join('; '));
    session.adapt.steer(directive);
    CGF.log(`INSTRUCTOR steering: ${directive.trainee_id} · ${directive.competency} · ${directive.intensity} · ${directive.duration_s} s`, 'instr');
    CGF.emit('adapt:steer', directive);
  }

  // A local adaptive run in this page, without the host: a warship crew with the chosen trainee at navigation
  // (the seat that owns hail discipline, collision avoidance and territorial awareness).
  function startLocal(o) {
    o = o || {};
    const config = {
      scenario_id: 'local', scenario: 'strait-transit', seed: o.seed != null ? o.seed : 1234, mode: o.mode || 'adaptive',
      duration_s: o.duration_s || 2400, eval_interval_s: o.eval_interval_s || 30, envelope: JSON.parse(JSON.stringify(LOCAL_ENVELOPE)),
      platform: { type: 'warship', model: 'formidable' },
      crew: [
        { seat: 'weapons', trainee_id: 'trainee_c05', agent_profile: 'trainees/strong.js' },
        { seat: 'sensors', trainee_id: 'trainee_c08', agent_profile: 'trainees/strong.js' },
        { seat: 'navigation', trainee_id: o.trainee || 'trainee_b', agent_profile: o.agent || 'trainees/weak_hail_discipline.js' }
      ]
    };
    CGF.loadScenario(config.scenario, null, { mode: 'exercise' });
    return start(config, {}).then(errs => {
      if (!errs.length) { CGF.sim.running = true; CGF.emit('run'); }
      return errs;
    });
  }

  CGF.on('link-init', config => { start(config, {}); });
  CGF.on('sim:step', onStep);
  CGF.on('outcome', onOutcome);
  CGF.on('sim:fail', () => { if (session) session.failed = true; });
  CGF.on('reset', () => { session = null; CGF.Adapt.current = null; });

  CGF.adaptRuntime = {
    LOCAL_ENVELOPE, begin, start, startLocal, steer, profileFor,
    session: () => session,
    lastRecord: () => lastRecord
  };
})();
