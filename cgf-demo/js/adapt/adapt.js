// In-run adaptation (PLAN E3 to E6, INTERFACES §5.1, §6, §7, §8, §9.1, §10). Pure: it reads only what it is
// given (the scenario config, the crew's profiles and the simulation events) and returns adjustment records.
// It never reads or writes the simulation, so it can run in the runtime (js/adapt/runtime.js does) or in the host.
//
//   const a = CGF.Adapt.create({ config, profiles, seatFocus, session_id })
//   a.evaluate(events, now) -> Adjustment[]   every eval_interval_s of sim time
//   a.steer(directive)                         instructor steering (§8), already schema-validated
//   a.liveState()                              per-seat target, live signal and working profile
//   a.endSession(outcome, duration_s) -> SessionRecord (§9.1)
//
// Experience picks WHAT to exercise: per seat, the weakest focus competency with enough evidence in the
// working profile (the stored profile, updated live by this session's events). Current behaviour sets HOW HARD:
// the success rate of that competency's last N events against the band (§6, challenge, decided by JL): while
// the trainee is doing well (above the band) raise the pressure; while they are struggling (below the band) ease
// off.
//
// Every engine adjustment names its cause (§7, LANES D7): "history" (no live evidence yet, so the target and the
// first steps come from the stored profile), "live" (the live success rate), or "team" (the opposition's
// teamwork, js/sim/team.js, set from the crew's capability). Instructor steering leaves cause out.
// AI partner seats (§3.2, LANES D8) are played by the simulation but never adapted to: no working copy, no target,
// no adjustment caused by or naming them.
(function () {
  'use strict';
  const CGF = window.CGF;

  const WINDOW = 10;             // §6 rolling window length
  const BAND = [0.4, 0.7];       // §6 challenge band
  const MIN_WINDOW = 3;          // fewer target events than this: no live evidence yet, so raise exposure

  const mean = b => b.alpha / (b.alpha + b.beta);
  const pad = (n, w) => String(n).padStart(w, '0');

  function create(opts) {
    const config = opts.config, envelope = config.envelope || {};
    const P = CGF.adaptPolicy, clamp = CGF.adaptClamp.clamp;
    const COMPETENCIES = window.Adapt.catalog();   // INTERFACES §1 (js/adapt/predict.js)
    const MEASURED = Object.keys(window.Adapt.TACTICS);

    const seats = config.crew.filter(m => m.role !== 'partner').map(m => {
      const prof = (opts.profiles || {})[m.trainee_id];
      const working = {};
      for (const c of COMPETENCIES) {
        const b = prof && prof.competencies && prof.competencies[c];
        working[c] = b ? { alpha: b.alpha, beta: b.beta } : { alpha: 1, beta: 1 };
      }
      return {
        seat: m.seat, trainee_id: m.trainee_id, focus: (opts.seatFocus || {})[m.seat] || [],
        start: JSON.parse(JSON.stringify(working)), working, windows: {}, steer: null,
        target: null, rate: null, n: 0, direction: 'hold'
      };
    });

    // The policy's view of each enveloped setting, starting at the envelope base (runtime.js applies it)
    const settings = {};
    for (const [k, e] of Object.entries(envelope)) settings[k] = e.base;

    const allEvents = [], adjustments = [], lastChange = {};   // lastChange: setting -> cycle number
    const teamNotes = {};   // adjustment id -> { capability, basis } for the reasoning panel (not part of the record)
    let nAdj = 0, lastNow = 0, paneDirection = 'hold', cycleNo = 0;

    // The same rule the allocation page previews (Adapt.pickTarget in js/adapt/predict.js), on the live working copy
    function targetFor(s) {
      if (s.steer && s.steer.active) return s.steer.directive.competency;
      return window.Adapt.pickTarget(s.working, s.focus, COMPETENCIES).competency;
    }

    // Takes in events (working copies, windows, the session log) without adjusting anything
    function observe(events) {
      for (const ev of events || []) {
        allEvents.push(ev);
        const s = ev.competency && seats.find(x => x.seat === ev.seat);
        if (!s || !s.working[ev.competency]) continue;
        const ok = ev.outcome === 'success';
        if (ok) s.working[ev.competency].alpha += 1; else s.working[ev.competency].beta += 1;
        const w = s.windows[ev.competency] = s.windows[ev.competency] || [];
        w.push({ id: ev.event_id, ok, type: ev.type, t: ev.t });
        if (w.length > WINDOW) w.shift();
      }
    }

    function evaluate(events, now) {
      lastNow = now; cycleNo++;
      observe(events);

      // steering: starts on the first cycle after it arrives, ends after its duration
      for (const s of seats) {
        if (!s.steer) continue;
        if (s.steer.start == null) { s.steer.start = now; s.steer.active = true; }
        if (now >= s.steer.start + s.steer.directive.duration_s) s.steer = null;
      }

      // live signal per seat
      for (const s of seats) {
        s.target = targetFor(s);
        const w = (s.target && s.windows[s.target]) || [];
        s.n = w.length;
        s.rate = w.length ? w.filter(e => e.ok).length / w.length : null;
        s.direction = !s.target ? 'hold'
          : (s.steer && s.steer.active) ? 'up'
          : w.length < MIN_WINDOW ? 'up'
          : s.rate > BAND[1] ? 'up' : s.rate < BAND[0] ? 'down' : 'hold';
      }
      if (config.mode === 'fixed') { paneDirection = 'hold'; return []; }   // invariant 2: fixed mode never adjusts

      // §5.1: any seat "down" wins; otherwise any "up" raises the platform
      paneDirection = seats.some(s => s.direction === 'down') ? 'down' : seats.some(s => s.direction === 'up') ? 'up' : 'hold';
      const out = teamAdjustment(now);
      if (paneDirection === 'hold') return out;

      // one request per setting: the single largest change among the seats moving that way (never summed)
      const chosen = {};
      for (const s of seats) {
        if (s.direction !== paneDirection) continue;
        const steering = s.steer && s.steer.active, intensity = steering ? s.steer.directive.intensity : 'medium';
        const probe = !steering && s.n < MIN_WINDOW;   // no live evidence yet: limited exposure probe
        for (const setting of P.settingsFor(s.target, envelope)) {
          if (!steering && lastChange[setting] != null && cycleNo - lastChange[setting] < P.COOLDOWN_CYCLES) continue;
          const cur = settings[setting], req = P.stepValue(setting, cur, envelope[setting], paneDirection, intensity, probe);
          if (req == null) continue;
          const delta = Math.abs(req - cur);
          if (!chosen[setting] || delta > chosen[setting].delta) chosen[setting] = { s, req, delta, cause: steering ? null : probe ? 'history' : 'live' };
        }
      }

      for (const setting of Object.keys(chosen).sort()) {
        const { s, req, cause } = chosen[setting], old = settings[setting];
        const c = clamp(req, envelope[setting]);
        if (c.value === old) continue;
        const w = s.windows[s.target] || [];
        const adj = {
          adjustment_id: `a_${pad(++nAdj, 4)}`, t: now, session_id: opts.session_id, force: 'all', setting,
          old, new: c.value, requested: req, clamped: c.clamped, target_competency: s.target, seat: s.seat,
          pressure_direction: paneDirection, source: s.steer && s.steer.active ? 'instructor_steer' : 'engine',
          policy: P.id, evidence_event_ids: w.slice(-5).map(e => e.id), explanation: null
        };
        if (cause) adj.cause = cause;
        settings[setting] = c.value; lastChange[setting] = cycleNo;
        out.push(adj); adjustments.push(adj);
      }
      return out;
    }

    // Teamwork tactic: "weight.team" (when the envelope allows it) follows the crew's capability. Capability is the
    // mean, over the trainee seats, of their measured focus competencies in the working copy, so it starts from the
    // profiles and moves with this session's evidence. A capable crew (above 0.5) faces a better-drilled
    // opposition; a struggling one a looser one. One step per change, with the usual cooldown.
    function teamCapability() {
      const means = [];
      for (const s of seats) for (const c of s.focus) if (MEASURED.includes(c)) means.push(mean(s.working[c]));
      return means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0.5;
    }
    function teamAdjustment(now) {
      const e = envelope['weight.team'];
      if (!e || !seats.length) return [];
      if (lastChange['weight.team'] != null && cycleNo - lastChange['weight.team'] < P.COOLDOWN_CYCLES) return [];
      const cap = teamCapability();
      const goal = cap >= 0.5 ? e.base + (cap - 0.5) / 0.5 * (e.max - e.base) : e.base - (0.5 - cap) / 0.5 * (e.base - e.min);
      const cur = settings['weight.team'], span = Math.max(e.max - e.base, e.base - e.min) * P.STEP;
      if (Math.abs(goal - cur) < 0.01) return [];
      const req = Math.round((cur + Math.sign(goal - cur) * Math.min(span, Math.abs(goal - cur))) * 1000) / 1000;
      const c = clamp(req, e);
      if (c.value === cur) return [];
      const lead = seats.find(s => s.target) || seats[0];
      const adj = {
        adjustment_id: `a_${pad(++nAdj, 4)}`, t: now, session_id: opts.session_id, force: 'all', setting: 'weight.team',
        old: cur, new: c.value, requested: req, clamped: c.clamped,
        target_competency: lead.target || lead.focus.find(x => MEASURED.includes(x)) || MEASURED[0], seat: lead.seat,
        pressure_direction: c.value > cur ? 'up' : 'down', source: 'engine', policy: P.id,
        evidence_event_ids: seats.flatMap(s => (s.windows[s.target] || []).slice(-2).map(x => x.id)).slice(-5),
        explanation: null, cause: 'team'
      };
      teamNotes[adj.adjustment_id] = { capability: Math.round(cap * 1000) / 1000, basis: seats.some(s => s.n >= MIN_WINDOW) ? 'live' : 'history' };
      settings['weight.team'] = c.value; lastChange['weight.team'] = cycleNo;
      adjustments.push(adj);
      return [adj];
    }

    function steer(directive) {
      const hit = seats.filter(s => s.trainee_id === directive.trainee_id);
      if (!hit.length) throw new Error(`trainee "${directive.trainee_id}" is not in this crew`);
      for (const s of hit) s.steer = { directive, start: null, active: false };
    }

    function liveState() {
      const view = s => ({
        seat: s.seat, trainee_id: s.trainee_id, focus: s.focus.slice(), target: s.target, windowSuccessRate: s.rate, windowCount: s.n,
        pressureDirection: s.direction, steering: s.steer ? s.steer.directive : null,
        workingProfile: Object.fromEntries(COMPETENCIES.map(c => [c, Math.round(mean(s.working[c]) * 1000) / 1000])),
        evidence: Object.fromEntries(COMPETENCIES.map(c => [c, s.working[c].alpha + s.working[c].beta])),
        window: (s.target && s.windows[s.target] || []).slice()
      });
      const all = seats.map(view), lead = all.find(v => v.target) || all[0];
      return {
        target: lead ? lead.target : null, windowSuccessRate: lead ? lead.windowSuccessRate : null,
        pressureDirection: paneDirection, workingProfile: lead ? lead.workingProfile : {},
        seats: all, mode: config.mode, settings: Object.assign({}, settings), teamCapability: Math.round(teamCapability() * 1000) / 1000,
        teamNotes: Object.assign({}, teamNotes), t: lastNow
      };
    }

    // §9.1 session record
    function endSession(outcome, duration_s) {
      return {
        session_id: opts.session_id, scenario: config.scenario, seed: config.seed, mode: config.mode,
        platform: config.platform.type,
        crew: config.crew.map(m => m.role === 'partner'
          ? { seat: m.seat, trainee_id: m.trainee_id, role: 'partner', derived_from: JSON.parse(JSON.stringify(m.derived_from)) }
          : { seat: m.seat, trainee_id: m.trainee_id }),
        outcome, duration_s: Math.round(duration_s * 100) / 100,
        events: allEvents.slice(), adjustments: adjustments.slice()
      };
    }

    return { evaluate, observe, steer, liveState, endSession, seats, settings, config, adjustments };
  }

  // Module-level calls of INTERFACES §10 act on the session that js/adapt/runtime.js has started in this page.
  // CGF.Adapt and window.Adapt are the same object (js/adapt/predict.js creates window.Adapt).
  const cur = () => { if (!CGF.Adapt.current) throw new Error('no adaptation session is running'); return CGF.Adapt.current; };
  CGF.Adapt = window.Adapt = Object.assign(window.Adapt || {}, {
    WINDOW, BAND, MIN_WINDOW, create, current: null,
    evaluate: (events, now) => cur().evaluate(events, now),
    steer: d => cur().steer(d),
    liveState: () => cur().liveState(),
    endSession: (outcome, duration_s) => cur().endSession(outcome, duration_s)
  });
})();
