// In-run adaptation (PLAN E3 to E6, INTERFACES §5.1, §6, §7, §8, §9.1, §10). Pure: it reads only what it is
// given (the scenario config, the crew's profiles and the simulation events) and returns adjustment records.
// It never reads or writes the simulation, so it can run in a pane (js/adapt/runtime.js does) or in the host.
//
//   const a = CGF.Adapt.create({ config, profiles, seatFocus, session_id, pane })
//   a.evaluate(events, now) -> Adjustment[]   every eval_interval_s of sim time
//   a.steer(directive)                         instructor steering (§8), already schema-validated
//   a.liveState()                              per-seat target, live signal and working profile
//   a.endSession(outcome, duration_s) -> SessionRecord (§9.1)
//
// Experience picks WHAT to exercise: per seat, the weakest focus competency with enough evidence in the
// working profile (the stored profile, updated live by this session's events). Current behaviour sets HOW HARD:
// the success rate of that competency's last N events against the challenge band.
//
// opts.band_mode chooses how the band maps to pressure (the docs disagree; JL to decide):
//   'challenge'   (default, INTERFACES §6): above the band the trainee is cruising -> up; below it -> down
//   'remediation' (PLAN G1 wording): failing the target -> keep pressing (up); succeeding -> ease off (down)
(function () {
  'use strict';
  const CGF = window.CGF;

  const WINDOW = 10;             // §6 rolling window length
  const BAND = [0.4, 0.7];       // §6 challenge band
  const MIN_WINDOW = 3;          // fewer target events than this: no live evidence yet, so raise exposure
  const EVIDENCE_MIN = 8;        // alpha + beta for "enough evidence" (§5; contracts.EVIDENCE_MIN)
  const COMPETENCIES = ['hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'piracy_response'];

  const mean = b => b.alpha / (b.alpha + b.beta);
  const pad = (n, w) => String(n).padStart(w, '0');

  function create(opts) {
    const config = opts.config, envelope = config.envelope || {};
    const P = CGF.adaptPolicy, clamp = CGF.adaptClamp.clamp;
    const remediation = opts.band_mode === 'remediation';
    const evidenceMin = (CGF.contracts && CGF.contracts.EVIDENCE_MIN) || EVIDENCE_MIN;

    const seats = config.crew.map(m => {
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
    let nAdj = 0, lastNow = 0, paneDirection = 'hold', cycleNo = 0;

    function targetFor(s) {
      if (s.steer && s.steer.active) return s.steer.directive.competency;
      const enough = c => s.working[c].alpha + s.working[c].beta >= evidenceMin;
      const weakest = list => list.filter(enough).sort((a, b) => mean(s.working[a]) - mean(s.working[b]) || COMPETENCIES.indexOf(a) - COMPETENCIES.indexOf(b))[0];
      return weakest(s.focus) || weakest(COMPETENCIES) || null;
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
        const above = remediation ? 'down' : 'up', below = remediation ? 'up' : 'down';
        s.direction = !s.target ? 'hold'
          : (s.steer && s.steer.active) ? 'up'
          : w.length < MIN_WINDOW ? 'up'
          : s.rate > BAND[1] ? above : s.rate < BAND[0] ? below : 'hold';
      }
      if (config.mode === 'fixed') { paneDirection = 'hold'; return []; }   // invariant 2: fixed mode never adjusts

      // §5.1: any seat "down" wins; otherwise any "up" raises the pane
      paneDirection = seats.some(s => s.direction === 'down') ? 'down' : seats.some(s => s.direction === 'up') ? 'up' : 'hold';
      if (paneDirection === 'hold') return [];

      // one request per setting: the single largest change among the seats moving the pane's way (never summed)
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
          if (!chosen[setting] || delta > chosen[setting].delta) chosen[setting] = { s, req, delta };
        }
      }

      const out = [];
      for (const setting of Object.keys(chosen).sort()) {
        const { s, req } = chosen[setting], old = settings[setting];
        const c = clamp(req, envelope[setting]);
        if (c.value === old) continue;
        const w = s.windows[s.target] || [];
        const adj = {
          adjustment_id: `a_${pad(++nAdj, 4)}`, t: now, session_id: opts.session_id, force: 'all', setting,
          old, new: c.value, requested: req, clamped: c.clamped, target_competency: s.target, seat: s.seat,
          pressure_direction: paneDirection, source: s.steer && s.steer.active ? 'instructor_steer' : 'engine',
          policy: P.id, evidence_event_ids: w.slice(-5).map(e => e.id), explanation: null
        };
        settings[setting] = c.value; lastChange[setting] = cycleNo;
        out.push(adj); adjustments.push(adj);
      }
      return out;
    }

    function steer(directive) {
      const hit = seats.filter(s => s.trainee_id === directive.trainee_id);
      if (!hit.length) throw new Error(`trainee "${directive.trainee_id}" is not in this pane's crew`);
      for (const s of hit) s.steer = { directive, start: null, active: false };
    }

    function liveState() {
      const view = s => ({
        seat: s.seat, trainee_id: s.trainee_id, target: s.target, windowSuccessRate: s.rate, windowCount: s.n,
        pressureDirection: s.direction, steering: s.steer ? s.steer.directive : null,
        workingProfile: Object.fromEntries(COMPETENCIES.map(c => [c, Math.round(mean(s.working[c]) * 1000) / 1000])),
        evidence: Object.fromEntries(COMPETENCIES.map(c => [c, s.working[c].alpha + s.working[c].beta])),
        window: (s.target && s.windows[s.target] || []).slice()
      });
      const all = seats.map(view), lead = all.find(v => v.target) || all[0];
      return {
        target: lead ? lead.target : null, windowSuccessRate: lead ? lead.windowSuccessRate : null,
        pressureDirection: paneDirection, workingProfile: lead ? lead.workingProfile : {},
        seats: all, mode: config.mode, band_mode: remediation ? 'remediation' : 'challenge', settings: Object.assign({}, settings), t: lastNow
      };
    }

    // §9.1 session record
    function endSession(outcome, duration_s) {
      return {
        session_id: opts.session_id, pane: opts.pane || null, scenario: config.scenario, seed: config.seed, mode: config.mode,
        platform: config.platform.type, crew: config.crew.map(m => ({ seat: m.seat, trainee_id: m.trainee_id })),
        outcome, duration_s: Math.round(duration_s * 100) / 100,
        events: allEvents.slice(), adjustments: adjustments.slice()
      };
    }

    return { evaluate, observe, steer, liveState, endSession, seats, settings, config, adjustments };
  }

  // Module-level calls of INTERFACES §10 act on the session that js/adapt/runtime.js has started in this page
  const cur = () => { if (!CGF.Adapt.current) throw new Error('no adaptation session is running'); return CGF.Adapt.current; };
  CGF.Adapt = Object.assign(CGF.Adapt || {}, {
    WINDOW, BAND, MIN_WINDOW, COMPETENCIES, create, current: null,
    evaluate: (events, now) => cur().evaluate(events, now),
    steer: d => cur().steer(d),
    liveState: () => cur().liveState(),
    endSession: (outcome, duration_s) => cur().endSession(outcome, duration_s)
  });
})();
