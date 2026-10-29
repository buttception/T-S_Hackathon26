// CGF engine: registries, simulation state, the tension model, the CGF action log and instructor injects.
// Knows nothing about any particular country or premise; those come from scenario and harness files.
//
//   Scenario = the map, the forces taking part, their units, the ownship and the objective.
//   Harness  = how one force behaves (states, thresholds, what provokes it, radio messages).
//              Each force has its own harness, swappable while the simulation runs.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  // ------------------------------------------------------------ registries
  CGF.scenarios = {};     // id -> scenario definition
  CGF.harnesses = {};     // id -> harness definition (plain JSON-able object)
  CGF.behaviours = {};    // name -> fn(unit, state, own, sim) => { tx, ty, spd, desired? }
  CGF.factors = {};       // name -> { label, fn(ctx) => 0..1 }
  CGF.malfunctions = [];  // [{ id, label, desc, mods, tick? }]

  CGF.style = {
    stateColors: ['#8aa0b8', '#ffd166', '#ffb347', '#ff7b54', '#ff3b3b'],
    defaultForceColor: '#ffd166',
    // Standard identity colours and frames after MIL-STD-2525 / APP-6 conventions.
    // Symbols show identity (friend / hostile / suspect / neutral / unknown), not nationality;
    // the force a contact belongs to is shown by its label tag (e.g. RED, BLK, PIR).
    identity: {
      friend:  { color: '#00a8dc', light: '#80e0ff', shape: 'circle',  label: 'Friend' },
      hostile: { color: '#ff3031', light: '#ff8080', shape: 'diamond', label: 'Hostile' },
      suspect: { color: '#ff3031', light: '#ff8080', shape: 'diamond', dashed: true, label: 'Suspect' },
      neutral: { color: '#00e200', light: '#aaffaa', shape: 'square',  label: 'Neutral' },
      unknown: { color: '#ffff00', light: '#ffff80', shape: 'quatrefoil', label: 'Unknown' }
    }
  };

  const listeners = {};
  CGF.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  CGF.emit = (evt, ...args) => (listeners[evt] || []).forEach(fn => fn(...args));
  CGF.log = (text, cls) => CGF.emit('log', text, cls || 'sys');

  CGF.registerScenario = s => {
    if (!s || !s.id) throw new Error('a scenario needs an id');
    CGF.scenarios[s.id] = s; CGF.emit('registry');
  };
  CGF.registerHarness = h => {
    if (!h || !h.id) throw new Error('a harness needs an id');
    CGF.harnesses[h.id] = h; CGF.emit('registry');
  };
  CGF.registerBehaviour = (name, fn) => { CGF.behaviours[name] = fn; };
  CGF.registerFactor = (name, def) => { CGF.factors[name] = typeof def === 'function' ? { label: name, fn: def } : def; };
  CGF.registerMalfunction = def => { CGF.malfunctions = CGF.malfunctions.filter(m => m.id !== def.id).concat(def); };

  // Live-tunable parameters (sliders). They multiply what the harnesses set.
  CGF.params = { aggression: 1, sensitivity: 1, reaction: 30, decay: 1, detection: 20, timeScale: 60 };

  // ------------------------------------------------------------ preparation (defaults + validation)
  // A harness's "kind" must match the force's kind: state actors, non-state groups or civil shipping.
  const KINDS = { state: 'state actor', 'non-state': 'non-state group', civil: 'civil shipping' };
  const HARNESS_DEFAULTS = {
    name: 'Unnamed harness', description: '', kind: 'state', affiliation: 'hostile', armed: true, teamwork: 0,
    baseTension: 10, aggression: 1, decayPerMin: 3, ackRelief: 10, warnRepeatSec: 240, ignoreAfterSec: 180,
    failState: null, weights: {}
  };
  const RANGE_DEFAULTS = { close: 10, cpa: 2, highSpeedKts: 24, slowSpeedKts: 10, conflictNm: 20 };
  const OWN_DEFAULTS = { name: 'OWNSHIP', force: 'blue', x: 0, y: -30, hdg: 0, spd: 12, maxSpd: 30, turnRate: 0.8, accel: 0.12 };

  function prepareHarness(src) {
    const H = Object.assign({}, HARNESS_DEFAULTS, JSON.parse(JSON.stringify(src)));
    if (!H.id) throw new Error('harness needs an id');
    if (!Array.isArray(H.states) || !H.states.length) throw new Error(`harness "${H.id}" needs at least one state`);
    for (const s of H.states) if (typeof s.min !== 'number' || !s.name) throw new Error(`harness "${H.id}": every state needs a name and a numeric min`);
    H.states.sort((a, b) => a.min - b.min);
    H.ranges = Object.assign({}, RANGE_DEFAULTS, H.ranges);
    // A weight whose factor is not registered would be ignored silently; keep the list so it can be reported
    H.unknownWeights = Object.keys(H.weights).filter(k => !CGF.factors[k]);
    return H;
  }
  CGF.validateHarness = src => { prepareHarness(src); return true; };

  // Per-domain defaults. "scale" lets one harness work everywhere: harness and behaviour ranges are
  // multiplied by scale.range, and speed thresholds by scale.speed (e.g. air: ranges ×6, speeds ×20).
  const DOMAIN_DEFAULTS = {
    sea:  { scale: { range: 1, speed: 1 }, units: { dist: 'nm', speed: 'kts' }, terms: { area: 'waters', ownType: 'warship' },
            view: { half: 36, grid: 5, rings: [5, 10], leaderMin: 6, trackSec: 30 } },
    land: { scale: { range: 1, speed: 2 }, units: { dist: 'km', speed: 'km/h' }, terms: { area: 'territory', ownType: 'patrol' },
            view: { half: 30, grid: 5, rings: [5, 10], leaderMin: 3, trackSec: 20 } },
    air:  { scale: { range: 6, speed: 20 }, units: { dist: 'nm', speed: 'kts' }, terms: { area: 'airspace', ownType: 'aircraft' },
            view: { half: 150, grid: 25, rings: [25, 50], leaderMin: 1, trackSec: 10 } }
  };

  function prepareScenario(src) {
    const S = JSON.parse(JSON.stringify(src));
    S.domain = S.domain || 'sea';
    const D = DOMAIN_DEFAULTS[S.domain] || DOMAIN_DEFAULTS.sea;
    S.scale = Object.assign({}, D.scale, S.scale);
    S.unitLabels = Object.assign({}, D.units, S.unitLabels);
    S.terms = Object.assign({}, D.terms, S.terms);
    S.view = Object.assign({}, D.view, S.view);
    S.bounds = S.bounds || S.view.half * 1.35;
    S.forces = S.forces || {};
    S.ownShip = Object.assign({}, OWN_DEFAULTS, S.ownShip);
    S.land = S.land || []; S.zones = S.zones || []; S.lanes = S.lanes || []; S.units = S.units || []; S.spawn = S.spawn || {};
    if (!S.forces[S.ownShip.force]) S.forces[S.ownShip.force] = { label: 'Own force', color: '#00a8dc' };
    for (const [k, f] of Object.entries(S.forces)) {
      f.kind = f.kind || 'state';
      f.tag = f.tag || k.slice(0, 3).toUpperCase();
      f.color = f.color || CGF.style.defaultForceColor;
    }
    for (const u of S.units) if (!S.forces[u.force]) throw new Error(`scenario "${S.id}": unit ${u.name} has unknown force "${u.force}"`);
    return S;
  }

  function stateIndexFor(tension, cur, H) {
    const st = H.states; let idx = 0;
    for (let i = 0; i < st.length; i++) if (tension >= st[i].min) idx = i;
    if (cur != null && cur < st.length && idx < cur && tension >= st[cur].min - 5) idx = cur; // hysteresis on the way down
    return idx;
  }

  // ------------------------------------------------------------ queries
  CGF.harnessOf = u => CGF.sim.forceHarness[u.force] || null;
  CGF.forceOf = u => CGF.scenario.forces[u.force] || { label: u.force, color: CGF.style.defaultForceColor };
  CGF.forceColor = u => CGF.forceOf(u).color || CGF.style.defaultForceColor;
  CGF.affiliationOf = u => {
    const H = CGF.harnessOf(u);
    if (H) return H.affiliation;
    if (u.affiliation) return u.affiliation;
    return u.force === CGF.scenario.ownShip.force ? 'friend' : 'unknown'; // own-force units with no harness are friendly
  };
  CGF.identityOf = u => CGF.style.identity[CGF.affiliationOf(u)] || CGF.style.identity.unknown;
  CGF.harnessesFor = forceKey => {
    const kind = (CGF.scenario.forces[forceKey] || {}).kind || 'state';
    return Object.values(CGF.harnesses).filter(h => (h.kind || 'state') === kind);
  };
  CGF.stateOf = u => { const H = CGF.harnessOf(u); return H ? H.states[u.stateIdx] : null; };
  CGF.levelOf = u => { const H = CGF.harnessOf(u); return H && H.states.length > 1 ? u.stateIdx / (H.states.length - 1) : 0; };
  CGF.cgfs = () => CGF.sim.units.filter(u => u.role === 'cgf');
  CGF.forcesWithHarness = () => Object.keys(CGF.sim.forceHarness);
  CGF.rangeScale = () => (CGF.scenario && CGF.scenario.scale.range) || 1;
  CGF.speedScale = () => (CGF.scenario && CGF.scenario.scale.speed) || 1;
  CGF.domainOf = u => u.domain || CGF.scenario.domain;
  CGF.detectionRange = () => CGF.params.detection * CGF.rangeScale() * (CGF.sim.fog ? 0.5 : 1);
  // A harness's ranges and speed thresholds, scaled to the current scenario's domain
  CGF.scaledRanges = H => {
    const r = CGF.rangeScale(), s = CGF.speedScale(), R = H.ranges;
    return { close: R.close * r, cpa: R.cpa * r, conflictNm: R.conflictNm * r, highSpeedKts: R.highSpeedKts * s, slowSpeedKts: R.slowSpeedKts * s };
  };
  CGF.displayedOwn = () => ({ x: CGF.sim.own.x + CGF.sim.gpsDrift.x, y: CGF.sim.own.y + CGF.sim.gpsDrift.y });
  CGF.aggressionOf = u => CGF.harnessOf(u).aggression * CGF.params.aggression * (u.temperament || 1);
  // Multiplier on one factor weight of one unit. sim.weightMult (set by CGF.apply in js/sim/apply.js) maps
  // factor -> { all: m, <harness id>: m }; a harness-specific entry wins over "all". Default 1.
  CGF.weightMult = (u, k) => {
    const m = CGF.sim.weightMult && CGF.sim.weightMult[k];
    if (!m) return 1;
    const H = CGF.harnessOf(u), own = H && m[H.id];
    return own != null ? own : (m.all != null ? m.all : 1);
  };
  CGF.zonesAt = p => CGF.scenario.zones.filter(z => U.pointInPoly(p.x, p.y, z.poly));
  CGF.stateColor = u => CGF.style.stateColors[Math.min(u.stateIdx || 0, CGF.style.stateColors.length - 1)];

  // Combined effect of all active malfunctions
  CGF.mods = () => {
    const m = { turnRateMult: 1, maxSpd: Infinity, radarRangeNm: Infinity, commsDown: false, fcStuck: false, gpsDriftKts: [0, 0] };
    for (const def of CGF.malfunctions) {
      if (!CGF.sim.malf[def.id]) continue;
      const d = def.mods || {};
      if (d.turnRateMult != null) m.turnRateMult *= d.turnRateMult;
      if (d.maxSpd != null) m.maxSpd = Math.min(m.maxSpd, d.maxSpd);
      if (d.radarRangeNm != null) m.radarRangeNm = Math.min(m.radarRangeNm, d.radarRangeNm);
      if (d.commsDown) m.commsDown = true;
      if (d.fcStuck) m.fcStuck = true;
      if (d.gpsDriftKts) { m.gpsDriftKts[0] += d.gpsDriftKts[0]; m.gpsDriftKts[1] += d.gpsDriftKts[1]; }
    }
    return m;
  };
  CGF.visibleToTrainee = u => U.dist(u, CGF.sim.own) <= CGF.mods().radarRangeNm * CGF.rangeScale();

  // Strongest current reasons behind a unit's tension, e.g. "In territorial waters +16, Proximity +4"
  CGF.reasons = (u, n) => {
    const H = CGF.harnessOf(u); if (!H) return '';
    return Object.entries(u.factors || {}).map(([k, f]) => [k, (H.weights[k] || 0) * f]).filter(([, v]) => Math.abs(v) > 0.3)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n || 2)
      .map(([k, v]) => `${(CGF.factors[k] || {}).label || k} ${v > 0 ? '+' : ''}${v.toFixed(0)}`).join(', ');
  };

  // What built up a unit's tension since its last state change, e.g. "Ignored radio warning +18, Proximity +9"
  CGF.drivers = (u, n) => {
    const parts = Object.entries(u.contrib || {}).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).slice(0, n || 2);
    return parts.length ? parts.map(([k, v]) => `${(CGF.factors[k] || {}).label || k} +${v.toFixed(0)}`).join(', ') : 'calmed down over time';
  };

  // ------------------------------------------------------------ CGF action log
  // Important actions taken by CGF units, kept for the after-action review and exportable as CSV.
  CGF.record = (u, action, detail, cause) => {
    const sim = CGF.sim;
    const entry = { t: sim.t, time: U.fmtTime(sim.t), unit: u ? u.name : '-', force: u ? CGF.forceOf(u).label : '-',
      forceKey: u ? u.force : '', action, detail: detail || '', state: u && CGF.stateOf(u) ? CGF.stateOf(u).name : '',
      tension: u && u.tension != null ? Math.round(u.tension) : '', cause: cause != null ? cause : (u ? CGF.reasons(u) : '') };
    sim.actions.push(entry);
    if (sim.actions.length > 2000) sim.actions.shift();
    CGF.emit('action', entry);
  };
  CGF.actionsCsv = () => {
    const cols = ['time', 'unit', 'force', 'action', 'state', 'tension', 'cause', 'detail'];
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    return [cols.join(',')].concat(CGF.sim.actions.map(a => cols.map(c => q(a[c])).join(','))).join('\r\n');
  };

  // ------------------------------------------------------------ units
  function makeUnit(def) {
    const sim = CGF.sim;
    const u = Object.assign({ hdg: 0, spd: 0, maxSpd: 20, turnRate: 1, accel: 0.25, temperament: 1, patrol: null, route: null }, def);
    const H = sim.forceHarness[u.force];
    u.role = H ? 'cgf' : 'traffic';
    u.cruiseSpd = u.cruiseSpd || u.spd;
    u.track = []; u.factors = {}; u.P = 0; u.Ppos = 0; u.wpIdx = u.wpIdx || 0; u.threat = null;
    if (H) {
      u.tension = def.tension != null ? def.tension : H.baseTension;
      u.stateIdx = stateIndexFor(u.tension, null, H);
      u.pendingIdx = null; u.pendingSince = 0;
      u.warnPending = false; u.warnTime = 0; u.lastWarn = -1e9; u.ignoreLogged = false;
    }
    return u;
  }

  // ------------------------------------------------------------ load scenario / swap harness
  // mode: 'exercise' (objective and failure state end the run) or 'freeplay' (open-ended: nothing ends it,
  // failure conditions are only logged, and the instructor drives events with injects)
  CGF.loadScenario = (idOrObj, harnessOverrides, opts) => {
    const src = typeof idOrObj === 'string' ? CGF.scenarios[idOrObj] : idOrObj;
    if (!src) throw new Error('unknown scenario: ' + idOrObj);
    const S = prepareScenario(src);
    const o = Object.assign({}, S.ownShip);
    o.ordHdg = o.hdg; o.ordSpd = o.spd; o.track = [];
    CGF.scenario = S;
    CGF.sim = {
      t: 0, running: false, outcome: null, own: o, units: [], forceHarness: {},
      mode: (opts && opts.mode) || (CGF.sim && CGF.sim.mode) || 'exercise', objectiveDone: false,
      fcTarget: null, selected: null, fog: false, malf: {}, gpsDrift: { x: 0, y: 0 },
      posture: 0, chart: [], chartTimer: 0, trackTimer: 0, spawnCount: 0, actions: [],
      stats: { maxTension: 0, peak: {}, terrSec: 0, contSec: 0, fcSec: 0, warnings: 0, ignored: 0, acks: 0, injects: 0, malfs: 0, swaps: 0 }
    };
    for (const [key, f] of Object.entries(S.forces)) {
      const hid = (harnessOverrides && harnessOverrides[key]) || f.harness;
      if (!hid || key === S.ownShip.force) continue;
      if (!CGF.harnesses[hid]) { CGF.log(`Force ${f.label}: harness "${hid}" not loaded; its units will just transit.`, 'alert'); continue; }
      const H = prepareHarness(CGF.harnesses[hid]);
      if (H.kind !== f.kind) { CGF.log(`Force ${f.label}: "${H.name}" is a ${KINDS[H.kind] || H.kind} harness, not for a ${KINDS[f.kind] || f.kind}; skipped.`, 'alert'); continue; }
      CGF.sim.forceHarness[key] = H;
    }
    CGF.sim.units = S.units.map(makeUnit);
    CGF.sim.selected = CGF.cgfs().find(u => CGF.affiliationOf(u) !== 'neutral') || CGF.cgfs()[0] || null;
    CGF.emit('reset');
    CGF.log(`Scenario loaded: ${S.name}. ${S.brief || ''}`);
    for (const k of CGF.forcesWithHarness()) {
      const H = CGF.sim.forceHarness[k];
      CGF.log(`${S.forces[k].label}: ${H.name}`);
      if (H.unknownWeights.length) CGF.log(`Harness "${H.name}": no factor registered for weight(s) ${H.unknownWeights.join(', ')}; they have no effect.`, 'alert');
    }
  };

  // Swap one force's harness mid-scenario. Units, positions, tension and time are kept;
  // states, weights, thresholds, radio messages and attitude come from the new harness.
  CGF.setForceHarness = (force, harnessId) => {
    const sim = CGF.sim, S = CGF.scenario;
    if (!S.forces[force] || force === S.ownShip.force) throw new Error('unknown force: ' + force);
    const src = CGF.harnesses[harnessId];
    if (!src) throw new Error('unknown harness: ' + harnessId);
    const old = sim.forceHarness[force];
    if (old && old.id === harnessId) return;
    const H = prepareHarness(src), fk = S.forces[force].kind;
    if (H.kind !== fk) throw new Error(`"${H.name}" is a ${KINDS[H.kind] || H.kind} harness; ${S.forces[force].label} is a ${KINDS[fk] || fk}`);
    sim.forceHarness[force] = H;
    for (const u of sim.units.filter(x => x.force === force)) {
      if (u.role !== 'cgf') { Object.assign(u, makeUnit(Object.assign({}, u, { tension: H.baseTension, track: u.track }))); continue; }
      u.stateIdx = stateIndexFor(u.tension, null, H);
      u.pendingIdx = null; u.warnPending = false; u.lastWarn = -1e9;
    }
    sim.stats.swaps++;
    const label = S.forces[force].label;
    CGF.log(`LIVE HARNESS SWAP: ${label} ${old ? old.name : 'none'} → ${H.name}`, 'instr');
    CGF.record(null, 'Rules of behaviour changed', `${label}: ${old ? old.name : 'none'} → ${H.name}`, 'instructor');
    CGF.emit('harness');
  };

  // ------------------------------------------------------------ CGF model
  function radio(u, text) {
    const msg = text.replace(/\{unit\}/g, u.name).replace(/\{force\}/g, CGF.forceOf(u).label)
      .replace(/\{country\}/g, CGF.forceOf(u).label).replace(/\{hdg\}/g, U.pad3(CGF.sim.own.hdg))
      .replace(/\{own\}/g, CGF.sim.own.name)
      .replace(/\{area\}/g, CGF.scenario.terms.area).replace(/\{ownType\}/g, CGF.scenario.terms.ownType);
    CGF.log('RADIO ' + msg, CGF.affiliationOf(u) === 'neutral' ? 'neutral' : 'hostile');
    return msg;
  }

  function enterState(u, idx, cause) {
    const H = CGF.harnessOf(u), sim = CGF.sim;
    const old = H.states[u.stateIdx], st = H.states[idx], up = idx > u.stateIdx;
    const reasons = cause || CGF.drivers(u);
    u.stateIdx = idx; u.pendingIdx = null; u.contrib = {};
    CGF.log(`${u.name}: ${old.name} → ${st.name}${cause ? ' (' + cause + ')' : ''}`, up ? 'alert' : 'sys');
    CGF.record(u, up ? (st.action || `Escalated to ${st.name}`) : (st.standDown || `Stood down to ${st.name}`), `${old.name} → ${st.name}`, reasons);
    if (up && st.msg) CGF.record(u, 'Radio call', radio(u, st.msg), reasons);
    // the state change is reported before any new warning, so a warning it supersedes is closed first
    CGF.emit('sim:state', u, H.states.indexOf(old), idx);
    if (st.warn) { u.warnPending = true; u.warnTime = sim.t; u.lastWarn = sim.t; u.ignoreLogged = false; sim.stats.warnings++; CGF.emit('sim:warn', u); }
    else u.warnPending = false;
    if (st.fcRadar && up) { CGF.log(`ALERT: ${sim.own.name} illuminated by ${u.name} fire-control radar`, 'alert'); CGF.record(u, 'Fire-control radar lock on ownship', '', reasons); }
    const pk = sim.stats.peak[u.force];
    if (up && (!pk || idx > pk.idx)) sim.stats.peak[u.force] = { idx, name: st.name };
    // A unit can re-enter its failure state in freeplay; report it once per unit, not on every re-entry
    if (H.failState && st.name === H.failState && !sim.outcome && !u.failReported) {
      u.failReported = true;
      CGF.emit('sim:fail', u);
      finish('fail', `ESCALATION: ${u.name} (${CGF.forceOf(u).label}) reached "${st.name}". Scenario failed.`);
    }
  }

  function updateCgf(u, dt) {
    const H = CGF.harnessOf(u), S = CGF.scenario, sim = CGF.sim, o = sim.own, P = CGF.params;
    const d = U.dist(u, o), f = {};
    u.threat = null;
    const detected = d <= CGF.detectionRange();
    const ctx = { u, own: o, sim, H, S, R: CGF.scaledRanges(H), d, U, CGF, detected, ss: CGF.speedScale() };
    for (const k of Object.keys(H.weights)) {
      const fac = CGF.factors[k];
      if (fac && (detected || fac.global)) f[k] = U.clamp(fac.fn(ctx) || 0, 0, 1);
    }
    // CGF.weightMult: adaptation multipliers on factor weights (1 unless CGF.apply has changed them)
    const w = k => (H.weights[k] || 0) * CGF.weightMult(u, k);
    let sum = 0, pos = 0;
    for (const k in f) { const v = w(k) * f[k]; sum += v; if (v > 0) pos += v; }
    u.factors = f; u.P = sum; u.Ppos = H.armed ? pos : 0;

    if (f.ignoredWarning && !u.ignoreLogged) {
      u.ignoreLogged = true; sim.stats.ignored++;
      CGF.log(`${u.name}: warning ignored by ownship`, 'alert');
      CGF.record(u, 'Logged warning as ignored', 'No acknowledgement from ownship');
      CGF.emit('sim:hail-ignored', u);
    }

    // Provocation is scaled by aggression; de-escalation is not. Then decay toward the harness baseline.
    const gain = CGF.aggressionOf(u) * P.sensitivity;
    const rate = sum > 0 ? sum * gain : sum;
    u.tension += rate * dt / 60;
    u.contrib = u.contrib || {};
    for (const k in f) { const v = w(k) * f[k]; if (v > 0) u.contrib[k] = (u.contrib[k] || 0) + v * gain * dt / 60; }
    const dec = H.decayPerMin * P.decay * dt / 60, base = H.baseTension;
    u.tension = u.tension > base ? Math.max(base, u.tension - dec) : Math.min(base, u.tension + dec);
    u.tension = U.clamp(u.tension, 0, 100);
    if (H.armed) sim.stats.maxTension = Math.max(sim.stats.maxTension, u.tension);

    // State changes only after the reaction delay
    const target = stateIndexFor(u.tension, u.stateIdx, H);
    if (target !== u.stateIdx) {
      if (u.pendingIdx !== target) { u.pendingIdx = target; u.pendingSince = sim.t; }
      if (sim.t - u.pendingSince >= P.reaction * (H.reactionMult || 1)) enterState(u, target);
    } else u.pendingIdx = null;

    const st = H.states[u.stateIdx];
    if (st.warn && st.msg && sim.t - u.lastWarn > H.warnRepeatSec) {
      CGF.record(u, 'Repeated radio warning', radio(u, st.msg));
      u.lastWarn = sim.t; sim.stats.warnings++;
      if (!u.warnPending) { u.warnPending = true; u.warnTime = sim.t; u.ignoreLogged = false; CGF.emit('sim:warn', u); }
    }
  }

  function steer(u, behaviourName, st, dt) {
    const fn = CGF.behaviours[behaviourName] || CGF.behaviours.hold;
    // a CGF steers on where it believes the ownship is (its own contact, or its force's shared fix: js/sim/team.js)
    const r = fn(u, st || {}, u.role === 'cgf' && CGF.perceivedOwn ? CGF.perceivedOwn(u) : CGF.sim.own, CGF.sim) || {};
    const desired = r.desired != null ? r.desired : U.bearing(u, { x: r.tx, y: r.ty });
    U.turnToward(u, desired, dt);
    // Aircraft (minSpd) cannot hover: they keep flying and orbit through the target point instead
    U.accelToward(u, Math.max(r.spd != null ? r.spd : u.spd, u.minSpd || 0), dt);
    U.move(u, dt);
  }

  // ------------------------------------------------------------ simulation step
  function step(dt) {
    const sim = CGF.sim, S = CGF.scenario, o = sim.own, m = CGF.mods();
    const maxSpd = Math.min(o.maxSpd, m.maxSpd);
    if (o.ordSpd > maxSpd) o.ordSpd = maxSpd;
    U.turnToward(o, o.ordHdg, dt, o.turnRate * m.turnRateMult);
    U.accelToward(o, o.ordSpd, dt, maxSpd);
    U.move(o, dt);

    sim.gpsDrift.x += m.gpsDriftKts[0] * dt / 3600;
    sim.gpsDrift.y += m.gpsDriftKts[1] * dt / 3600;
    if (m.fcStuck) {
      const near = CGF.cgfs().filter(u => CGF.harnessOf(u).armed).sort((a, b) => U.dist(a, o) - U.dist(b, o))[0];
      if (near && sim.fcTarget !== near) { sim.fcTarget = near; CGF.log(`Fire-control radar stuck on: illuminating ${near.name}`, 'alert'); }
    }
    for (const def of CGF.malfunctions) if (sim.malf[def.id] && def.tick) def.tick(sim, dt);

    for (const z of CGF.zonesAt(o)) {
      if (z.owner === o.force) continue;
      if (z.kind === 'territorial') { sim.stats.terrSec += dt; break; }
      if (z.kind === 'contiguous') { sim.stats.contSec += dt; break; }
    }
    if (sim.fcTarget) sim.stats.fcSec += dt;

    let maxPpos = 0;
    for (const u of sim.units) {
      if (u.role === 'cgf') {
        updateCgf(u, dt);
        const st = CGF.stateOf(u);
        steer(u, st.behaviour, st, dt);
        maxPpos = Math.max(maxPpos, u.Ppos);
      } else steer(u, u.behaviour || (u.route ? 'lane' : 'transit'), null, dt);
    }
    sim.posture += (U.clamp(maxPpos / 30, 0, 1) - sim.posture) * Math.min(1, dt / 60);

    sim.trackTimer += dt;
    if (sim.trackTimer >= S.view.trackSec) {
      sim.trackTimer = 0;
      for (const s of [o, ...sim.units]) { s.track.push([s.x, s.y]); if (s.track.length > 40) s.track.shift(); }
    }
    sim.chartTimer += dt;
    if (sim.chartTimer >= 10) {
      sim.chartTimer = 0;
      const armed = CGF.cgfs().filter(u => CGF.harnessOf(u).armed);
      sim.chart.push([Math.max(0, ...armed.map(u => u.tension)), sim.posture * 100]);
      if (sim.chart.length > 360) sim.chart.shift();
    }

    sim.t += dt;
    if (!sim.outcome && !sim.objectiveDone && S.objective && U.dist(o, S.objective) < 1.5 * CGF.rangeScale()) finish('success', `Objective reached: ownship arrived at the ${S.objective.name || 'objective'}.`);
    CGF.emit('sim:step', dt); // event emission, scripted crews and adaptation hook in here
  }

  // Fixed-step entry point (INTERFACES §10): advances exactly dt sim seconds, with no dependence on frame
  // timing, and returns the simulation events (§4) raised during that step. Tests and runners call it directly.
  const MAX_STEP = 2;
  CGF.step = dt => {
    step(dt);
    return CGF.simEvents ? CGF.simEvents.drain() : [];
  };

  // Advance by real elapsed seconds, in fixed sim sub-steps. Capped, so a stalled tab cannot trigger a burst
  // of catch-up steps; the sim simply runs slower than real time for that frame.
  const MAX_SUBSTEPS = 60;
  CGF.tick = dtReal => {
    const sim = CGF.sim;
    if (!sim.running || sim.outcome) return;
    let dts = dtReal * CGF.params.timeScale, n = 0;
    while (dts > 0 && !sim.outcome && n++ < MAX_SUBSTEPS) { const h = Math.min(MAX_STEP, dts); CGF.step(h); dts -= h; }
  };

  // Ends the run with an outcome, as reaching the objective or a failure state does (used for a timed end)
  CGF.endRun = (kind, text) => finish(kind, text);

  function finish(kind, text) {
    const sim = CGF.sim;
    if (sim.mode === 'freeplay') { // nothing ends a freeplay run; just note it for the debrief
      if (kind === 'success') sim.objectiveDone = true;
      CGF.log(`${text} (freeplay: run continues)`, 'alert');
      CGF.record(null, kind === 'success' ? 'Objective reached' : 'Failure condition reached', text, 'freeplay: run continues');
      return;
    }
    sim.outcome = kind; sim.running = false;
    CGF.log(text, 'alert');
    CGF.record(null, kind === 'success' ? 'Scenario complete' : 'Scenario failed', text, '');
    const peaks = Object.entries(sim.stats.peak).map(([k, p]) => `${CGF.scenario.forces[k].label}: ${p.name}`).join(' · ');
    CGF.emit('outcome', kind, `${text}${peaks ? '  Peak: ' + peaks + '.' : ''}`);
  }

  // ------------------------------------------------------------ trainee actions
  CGF.actions = {
    toggleRun() {
      const sim = CGF.sim; if (sim.outcome) return;
      sim.running = !sim.running;
      CGF.log(sim.running ? 'Simulation running.' : 'Simulation paused.');
      CGF.emit('run');
    },
    acknowledge() {
      const sim = CGF.sim;
      if (CGF.mods().commsDown) { CGF.log('Ownship: attempted to answer hail. No response: comms down.', 'alert'); return; }
      const pending = CGF.cgfs().filter(u => u.warnPending);
      if (!pending.length) { CGF.log('Ownship: radio check, no hails pending.', 'own'); return; }
      for (const u of pending) {
        u.warnPending = false; u.tension = U.clamp(u.tension - CGF.harnessOf(u).ackRelief, 0, 100); sim.stats.acks++;
        CGF.log(`${sim.own.name} to ${u.name}: acknowledged, will comply.`, 'own');
        CGF.record(u, 'Received acknowledgement', `Tension eased by ${CGF.harnessOf(u).ackRelief}`, 'ownship complied');
        CGF.emit('sim:hail-ack', u);
      }
    },
    // target: optional unit (scripted crews name it); otherwise the selected contact or the nearest armed one
    toggleFc(target) {
      const sim = CGF.sim, o = sim.own;
      if (CGF.mods().fcStuck) { CGF.log('Fire-control radar will not switch off (malfunction).', 'alert'); return; }
      if (sim.fcTarget) { CGF.log(`Ownship: fire-control radar off (${sim.fcTarget.name}).`, 'own'); CGF.emit('sim:fc', sim.fcTarget, false); sim.fcTarget = null; return; }
      const armed = CGF.cgfs().filter(u => CGF.harnessOf(u).armed);
      if (!target) target = sim.selected && sim.selected.role === 'cgf' ? sim.selected : armed.sort((a, b) => U.dist(a, o) - U.dist(b, o))[0];
      if (!target) return;
      sim.fcTarget = target;
      CGF.log(`Ownship: fire-control radar illuminating ${target.name}.`, 'alert');
      CGF.emit('sim:fc', target, true);
    },
    orderHeading(delta) { const o = CGF.sim.own; o.ordHdg = U.norm360(o.ordHdg + delta); },
    orderHeadingTo(hdg) { CGF.sim.own.ordHdg = Math.round(U.norm360(hdg)); },
    orderSpeed(delta) { const o = CGF.sim.own; o.ordSpd = U.clamp(o.ordSpd + delta, 0, Math.min(o.maxSpd, CGF.mods().maxSpd)); }
  };

  // ------------------------------------------------------------ instructor injects
  function instr(text) { CGF.sim.stats.injects++; CGF.log('INSTRUCTOR ' + text, 'instr'); }

  CGF.inject = {
    adjust(u, delta) {
      if (!u || u.role !== 'cgf') return;
      const H = CGF.harnessOf(u);
      u.tension = U.clamp(u.tension + delta, 0, 100);
      instr(`${delta > 0 ? 'escalated' : 'de-escalated'} ${u.name} (tension ${Math.round(u.tension)})`);
      const target = stateIndexFor(u.tension, u.stateIdx, H);
      if (target !== u.stateIdx) enterState(u, target, 'instructor');
    },
    force(u, stateName) {
      if (!u || u.role !== 'cgf') return;
      const H = CGF.harnessOf(u), idx = H.states.findIndex(s => s.name === stateName);
      if (idx < 0) return;
      u.tension = U.clamp(H.states[idx].min + 5, 0, 100);
      instr(`forced ${u.name} to "${stateName}"`);
      if (idx !== u.stateIdx) enterState(u, idx, 'instructor');
    },
    radio(u, text) {
      if (!u || u.role !== 'cgf') return;
      const sim = CGF.sim, st = CGF.harnessOf(u).states.find(s => s.warn && s.msg);
      instr(`radio demand from ${u.name}`);
      const msg = radio(u, text ? `${u.name}: ${text}` : st ? st.msg : '{unit}: Stop and state your intentions.');
      CGF.record(u, 'Radio demand', msg, 'instructor');
      u.warnPending = true; u.warnTime = sim.t; u.lastWarn = sim.t; u.ignoreLogged = false; sim.stats.warnings++;
    },
    spawn(force) {
      const sim = CGF.sim, S = CGF.scenario;
      force = force || CGF.forcesWithHarness()[0];
      const tpl = S.spawn[force];
      if (!tpl) { CGF.log(`No spawn template for ${force} in this scenario.`, 'sys'); return; }
      sim.spawnCount++;
      const def = Object.assign({ force, spd: 15, hdg: 90 }, tpl, { name: `${tpl.name || force.toUpperCase()}-${sim.spawnCount}` });
      const H = sim.forceHarness[force];
      if (H) def.tension = U.clamp(H.baseTension + 30, 0, 100);
      const u = makeUnit(def);
      sim.units.push(u);
      instr(`spawned ${u.name} (${S.forces[force].label})`);
      if (u.role === 'cgf') CGF.record(u, 'Entered the area', `Spawned by instructor in state ${CGF.stateOf(u).name}`, 'instructor');
      CGF.emit('units');
    },
    fog(on) {
      const sim = CGF.sim;
      sim.fog = on === undefined ? !sim.fog : on;
      instr(sim.fog ? 'fog rolled in: detection ranges halved' : 'fog cleared');
      CGF.emit('env');
    },
    malfunction(id, on) {
      const sim = CGF.sim, m = CGF.malfunctions.find(x => x.id === id);
      if (!m) return;
      on = on === undefined ? !sim.malf[id] : on;
      if (!!sim.malf[id] === on) return;
      sim.malf[id] = on;
      if (on) { sim.stats.malfs++; instr(`malfunction: ${m.label} (${m.desc})`); }
      else {
        instr(`repaired: ${m.label}`);
        if (m.mods && m.mods.gpsDriftKts) sim.gpsDrift = { x: 0, y: 0 };
        if (m.mods && m.mods.fcStuck) { sim.fcTarget = null; CGF.log('Fire-control radar off.', 'own'); }
      }
      CGF.emit('malf');
    },
    repairAll() { CGF.malfunctions.forEach(m => CGF.inject.malfunction(m.id, false)); },
    setForceHarness(force, id) {
      try { CGF.setForceHarness(force, id); CGF.sim.stats.injects++; }
      catch (err) { CGF.log('Harness not changed: ' + err.message, 'alert'); CGF.emit('harness'); }
    },
    setMode(mode) {
      const sim = CGF.sim;
      sim.mode = mode === 'freeplay' ? 'freeplay' : 'exercise';
      if (sim.mode === 'freeplay' && sim.outcome) { sim.outcome = null; CGF.emit('outcome', null, ''); } // a finished run can carry on as freeplay
      instr(sim.mode === 'freeplay' ? 'switched to FREEPLAY: no objective or failure ending, run continues until stopped'
        : 'switched to EXERCISE: objective and failure state end the run');
      CGF.emit('mode');
    }
  };
})();
