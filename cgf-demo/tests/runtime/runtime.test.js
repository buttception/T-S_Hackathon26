// Runtime and adaptation tests (Devin's lane). Run from cgf-demo/:  node --test tests/runtime/
// Covers the CLAUDE.md invariants that live in this lane and the D1 to D5 acceptance tests in docs/LANES.md.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, config } = require('./harness.js');

// Values made inside the vm context have that realm's prototypes; compare them as plain data
const J = x => JSON.parse(JSON.stringify(x));
const deq = (a, b, msg) => assert.deepStrictEqual(J(a), J(b), msg);

// A full adaptive session in a fresh runtime. Returns { CGF, record, cycles }.
function session(over, opts) {
  const w = load(), CGF = w.CGF, cfg = config(over);
  if (opts && opts.agent) cfg.crew[2].agent_profile = opts.agent;
  CGF.loadScenario(cfg.scenario);
  const errs = CGF.adaptRuntime.begin(cfg, Object.assign({ session_id: 's_test' }, opts));
  deq(errs, []);
  CGF.sim.running = true;
  let record = null; const cycles = [];
  CGF.on('session-record', r => { record = r; });
  CGF.on('adapt:cycle', c => cycles.push({ t: CGF.sim.t, settings: Object.fromEntries(Object.keys(cfg.envelope).map(k => [k, CGF.settings.get(k)])) }));
  while (!record && CGF.sim.t < cfg.duration_s + 10) CGF.step(2);
  return { CGF, record, cycles, cfg };
}

// A bare Adapt instance for policy tests driven by synthetic events
function adapt(over, opts) {
  const w = load(), CGF = w.CGF, cfg = config(over);
  const profiles = {};
  for (const m of cfg.crew) profiles[m.trainee_id] = w.CGF_FIXTURES.profiles.find(p => p.trainee_id === m.trainee_id) || null;
  const a = CGF.Adapt.create(Object.assign({ config: cfg, profiles, seatFocus: w.CGF_FIXTURES.platformTypes.warship.seatFocus, session_id: 's_unit' }, opts));
  return { CGF, a, cfg };
}
let nEv = 0;
const ev = (seat, trainee_id, type, competency, outcome, t) =>
  ({ event_id: `e_${++nEv}`, t, session_id: 's_unit', trainee_id, seat, type, competency, outcome, unit_id: 'R-21', detail: {} });

// ---------------------------------------------------------------- D1: fixed step, determinism, events
test('S1: same seed and inputs give byte-identical event logs over 10 runs (invariant 3)', () => {
  const logs = [];
  for (let i = 0; i < 10; i++) {
    const { record } = session({ duration_s: 900 });
    logs.push(JSON.stringify({ events: record.events, adjustments: record.adjustments }));
  }
  assert.ok(logs[0].length > 100);
  for (const l of logs) assert.equal(l, logs[0]);
});

test('S1: a different seed gives a different run', () => {
  const a = session({ duration_s: 1500, seed: 1 }).record, b = session({ duration_s: 1500, seed: 99 }).record;
  assert.notEqual(JSON.stringify(a.events), JSON.stringify(b.events));
});

test('S1: CGF.step(dt) returns that step\'s events; CGF.tick caps catch-up sub-steps', () => {
  const w = load(), CGF = w.CGF, cfg = config();
  CGF.loadScenario('strait-transit');
  CGF.adaptRuntime.begin(cfg, { session_id: 's' });
  CGF.sim.running = true;
  let returned = 0;
  while (CGF.sim.t < 1200) returned += CGF.step(2).length;
  assert.equal(returned, CGF.simEvents.log().length);
  const t0 = CGF.sim.t;
  CGF.tick(1000);   // a stalled tab: 1000 s of real time at time scale 60
  assert.ok(CGF.sim.t - t0 <= 60 * 2 + 1e-9, `advanced ${CGF.sim.t - t0} s in one tick`);
});

test('S2: every event matches the §4 shape; competency events name a seat', () => {
  const { record, CGF } = session({ duration_s: 2400 });
  const FIELDS = ['event_id', 't', 'session_id', 'trainee_id', 'seat', 'type', 'competency', 'outcome', 'unit_id', 'detail'];
  const COMPS = CGF.contracts.COMPETENCIES;
  assert.ok(record.events.length > 0);
  for (const e of record.events) {
    deq(Object.keys(e).sort(), FIELDS.slice().sort());
    const [comp, outcome] = CGF.simEvents.TYPES[e.type];
    assert.equal(e.competency, comp); assert.equal(e.outcome, outcome);
    assert.equal(e.session_id, 's_test');
    if (e.competency) {
      assert.ok(COMPS.includes(e.competency));
      assert.ok(e.seat && e.trainee_id, `${e.type} needs a seat and trainee`);
      assert.ok(record.crew.some(m => m.seat === e.seat && m.trainee_id === e.trainee_id));
    } else assert.equal(e.seat, null);
  }
  const hail = record.events.filter(e => e.competency === 'hail_discipline');
  assert.ok(hail.length > 0, 'the scripted route meets hails');
  assert.ok(hail.every(e => e.seat === 'navigation'), 'hail discipline belongs to the navigation seat (seatFocus)');
});

test('S2: nothing is emitted outside a training session (free play is unchanged)', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit'); CGF.sim.running = true;
  let n = 0;
  while (CGF.sim.t < 600) n += CGF.step(2).length;
  assert.equal(n, 0);
});

test('S3: the weak trainee leaves hails unanswered far more often than the strong one (seeded runs)', () => {
  const rate = agent => {
    let ignored = 0, total = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const { record } = session({ duration_s: 2400, seed, mode: 'fixed' }, { agent });
      const hails = record.events.filter(e => e.competency === 'hail_discipline' && e.seat === 'navigation');
      total += hails.length; ignored += hails.filter(e => e.outcome === 'fail').length;
    }
    return { ignored, total };
  };
  const weak = rate('trainees/weak_hail_discipline.js'), strong = rate('trainees/strong.js');
  assert.ok(weak.total >= 8 && strong.total >= 8, `enough hails: weak ${weak.total}, strong ${strong.total}`);
  assert.ok(weak.ignored / weak.total > 0.3, `weak ignored ${weak.ignored}/${weak.total}`);
  assert.ok(strong.ignored / strong.total < 0.15, `strong ignored ${strong.ignored}/${strong.total}`);
  assert.ok(weak.ignored / weak.total > 3 * (strong.ignored / strong.total));
});

test('S4 / invariant 8: CGF.apply changes CGF settings only, never positions, score or outcome', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit');
  for (let i = 0; i < 50; i++) CGF.step(2);
  const before = JSON.stringify({ units: CGF.sim.units.map(u => [u.x, u.y, u.hdg, u.spd, u.tension, u.stateIdx]), own: [CGF.sim.own.x, CGF.sim.own.y],
    stats: CGF.sim.stats, outcome: CGF.sim.outcome, t: CGF.sim.t });
  CGF.apply([
    { adjustment_id: 'a_1', setting: 'sensitivity', old: 1, new: 1.4, force: 'all', pressure_direction: 'up' },
    { adjustment_id: 'a_2', setting: 'weight.cpa', old: 1, new: 1.6, force: 'all', pressure_direction: 'up' },
    { adjustment_id: 'a_3', setting: 'weight.fcRadar', old: 1, new: 0.5, force: 'hostile-state', pressure_direction: 'down' },
    { adjustment_id: 'a_4', setting: 'nonsense', old: 1, new: 9, force: 'all', pressure_direction: 'up' }
  ]);
  const statsNoActions = JSON.parse(before).stats;
  const after = JSON.stringify({ units: CGF.sim.units.map(u => [u.x, u.y, u.hdg, u.spd, u.tension, u.stateIdx]), own: [CGF.sim.own.x, CGF.sim.own.y],
    stats: statsNoActions, outcome: CGF.sim.outcome, t: CGF.sim.t });
  assert.equal(after, before);
  assert.equal(CGF.params.sensitivity, 1.4);
  assert.equal(CGF.settings.get('weight.cpa'), 1.6);
  const r21 = CGF.sim.units.find(u => u.name === 'R-21');
  assert.equal(CGF.weightMult(r21, 'fcRadar'), 0.5);
  assert.equal(CGF.weightMult(r21, 'territorial'), 1);
  assert.ok(CGF.sim.actions.some(a => a.action.startsWith('Adaptation: sensitivity')), 'applied values show in the CGF log');
});

test('S6: a failure state is reported once per unit in freeplay', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit', null, { mode: 'freeplay' });
  const u = CGF.sim.units.find(x => x.name === 'R-21');
  let fails = 0; CGF.on('sim:fail', () => fails++);
  for (let i = 0; i < 3; i++) { CGF.inject.force(u, 'Patrol'); CGF.inject.force(u, 'Weapons ready'); }
  assert.equal(fails, 1);
  assert.equal(CGF.sim.actions.filter(a => a.action === 'Failure condition reached').length, 1);
});

test('S6: a harness weight with no registered factor is reported', () => {
  const w = load(), CGF = w.CGF;
  const h = JSON.parse(JSON.stringify(CGF.harnesses['hostile-state']));
  h.id = 'typo-harness'; h.weights.proximty = 5;
  CGF.registerHarness(h);
  const logs = []; CGF.on('log', t => logs.push(t));
  CGF.loadScenario('strait-transit', { red: 'typo-harness' });
  deq(CGF.sim.forceHarness.red.unknownWeights, ['proximty']);
  assert.ok(logs.some(t => t.includes('proximty')));
});

test('S6: the opening factor never exceeds 1', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit');
  const o = CGF.sim.own, u = CGF.sim.units.find(x => x.name === 'R-21');
  Object.assign(o, { x: 0, y: 0, hdg: 180, spd: 30 }); Object.assign(u, { x: 0, y: 3, hdg: 0, spd: 38 });
  const f = CGF.factors.opening.fn({ u, own: o, d: 3, R: CGF.scaledRanges(CGF.harnessOf(u)), ss: 1, CGF, U: CGF.util });
  assert.ok(f <= 1, `opening ${f}`);
});

// ---------------------------------------------------------------- D2: adaptation policy and the envelope
test('E3 / invariant 1: the clamp never leaves the envelope (property test, seeded)', () => {
  const w = load(), CGF = w.CGF, rng = CGF.rng(42);
  for (let i = 0; i < 5000; i++) {
    const min = rng.between(-5, 5), max = min + rng.between(0, 10), base = rng.between(min, max);
    const req = rng.between(-50, 50), r = CGF.adaptClamp.clamp(req, { min, max, base });
    assert.ok(r.value >= min && r.value <= max);
    assert.equal(r.clamped, r.value !== req);
  }
  assert.equal(CGF.adaptClamp.clamp(NaN, { min: 0, max: 1, base: 0.5 }).value, 0.5);
});

test('invariant 1: no adjustment and no applied setting ever leaves the envelope, over random event streams', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { CGF, a, cfg } = adapt();
    const rng = CGF.rng(seed);
    const types = Object.keys(CGF.simEvents.TYPES).filter(k => CGF.simEvents.TYPES[k][0]);
    for (let c = 1; c <= 60; c++) {
      const evs = [];
      for (let k = 0; k < Math.floor(rng.between(0, 6)); k++) {
        const ty = types[Math.floor(rng.next() * types.length)], [comp, out] = CGF.simEvents.TYPES[ty];
        const m = cfg.crew[Math.floor(rng.next() * cfg.crew.length)];
        evs.push(ev(m.seat, m.trainee_id, ty, comp, out, c * 30));
      }
      if (c === 20) a.steer({ raw_text: 'x', trainee_id: 'trainee_b', competency: 'collision_avoidance', intensity: 'high', duration_s: 600 });
      for (const adj of a.evaluate(evs, c * 30)) {
        const e = cfg.envelope[adj.setting];
        assert.ok(e, `adjusted a setting with no envelope entry: ${adj.setting}`);
        assert.ok(adj.new >= e.min && adj.new <= e.max, `${adj.setting} = ${adj.new}`);
      }
      for (const [k, v] of Object.entries(a.settings)) assert.ok(v >= cfg.envelope[k].min && v <= cfg.envelope[k].max);
    }
  }
});

test('invariant 1: in a full simulated session every applied setting stays inside the envelope', () => {
  const { record, cycles, cfg } = session({ duration_s: 2400 });
  assert.ok(record.adjustments.length > 0);
  for (const c of cycles) for (const [k, v] of Object.entries(c.settings)) assert.ok(v >= cfg.envelope[k].min && v <= cfg.envelope[k].max, `${k} = ${v} at ${c.t}`);
});

test('E5 / invariant 2: fixed mode produces zero adjustments over a full session', () => {
  const { record, cycles } = session({ duration_s: 2400, mode: 'fixed' });
  assert.equal(record.adjustments.length, 0);
  assert.ok(record.events.length > 0, 'events are still recorded');
  assert.ok(cycles.length > 50, 'evaluation still ran');
});

test('D2: the weak-hail trainee\'s CGFs press hails within two cycles; trainee A\'s target something else', () => {
  const { a } = adapt();   // trainee_b in the navigation seat (owns hail discipline)
  const out = a.evaluate([], 30).concat(a.evaluate([], 60));
  const forB = out.filter(x => x.seat === 'navigation');
  assert.ok(forB.length > 0);
  assert.ok(forB.every(x => x.target_competency === 'hail_discipline' && x.pressure_direction === 'up'));
  assert.ok(forB.some(x => x.setting === 'sensitivity' || x.setting === 'weight.ignoredWarning'));

  const A = adapt({ crew: [
    { seat: 'weapons', trainee_id: 'trainee_c05', agent_profile: 'trainees/strong.js' },
    { seat: 'sensors', trainee_id: 'trainee_c08', agent_profile: 'trainees/strong.js' },
    { seat: 'navigation', trainee_id: 'trainee_a', agent_profile: 'trainees/strong.js' }] }).a;
  A.evaluate([], 30);
  const nav = A.liveState().seats.find(s => s.seat === 'navigation');
  assert.notEqual(nav.target, 'hail_discipline');
});

test('D2 (challenge, INTERFACES §6): pressure eases while hails are missed and rises once they are answered', () => {
  const { a } = adapt();
  let t = 0;
  const step = evs => a.evaluate(evs, (t += 30));
  step([]); step([]);
  const fails = [1, 2, 3, 4].map(() => ev('navigation', 'trainee_b', 'hail_ignored', 'hail_discipline', 'fail', t));
  const easing = step(fails);
  assert.equal(a.liveState().seats.find(s => s.seat === 'navigation').pressureDirection, 'down');
  assert.ok(easing.every(x => x.pressure_direction === 'down'));
  step([]);
  const answers = [1, 2, 3, 4, 5, 6, 7, 8].map(() => ev('navigation', 'trainee_b', 'hail_acknowledged', 'hail_discipline', 'success', t));
  const pressing = step(answers).concat(step([]), step([]));
  assert.equal(a.liveState().pressureDirection, 'up');
  assert.ok(pressing.some(x => x.pressure_direction === 'up' && x.target_competency === 'hail_discipline'));
});

test('D7: every engine adjustment names its cause: history before live evidence, live after it', () => {
  const { a } = adapt();
  let t = 0;
  const step = evs => a.evaluate(evs, (t += 30));
  const early = step([]).concat(step([]));
  const nav = early.filter(x => x.seat === 'navigation');
  assert.ok(nav.length && nav.every(x => x.cause === 'history'));
  const missed = step([1, 2, 3, 4].map(() => ev('navigation', 'trainee_b', 'hail_ignored', 'hail_discipline', 'fail', t)));   // below the band: eases back toward base this cycle
  const later = missed.concat(step([]), step([]), step([]));
  assert.ok(later.some(x => x.seat === 'navigation' && x.cause === 'live'));
  a.steer({ raw_text: 'x', trainee_id: 'trainee_b', competency: 'collision_avoidance', intensity: 'medium', duration_s: 300 });
  const steered = step([]).filter(x => x.source === 'instructor_steer');
  assert.ok(steered.length && steered.every(x => !('cause' in x)), 'a steer is the instructor\'s, not one of the three signals');
});

test('D6/D7: the opposition\'s teamwork ("weight.team") follows the crew\'s capability, tagged cause "team"', () => {
  const env = Object.assign({}, config().envelope, { 'weight.team': { min: 0.3, max: 2.0, base: 1.0 } });
  const strongCrew = [
    { seat: 'weapons', trainee_id: 'trainee_c05', agent_profile: 'trainees/strong.js' },
    { seat: 'sensors', trainee_id: 'trainee_c08', agent_profile: 'trainees/strong.js' },
    { seat: 'navigation', trainee_id: 'trainee_a', agent_profile: 'trainees/strong.js' }];
  const weakCrew = [
    { seat: 'weapons', trainee_id: 'trainee_c03', agent_profile: 'trainees/strong.js' },
    { seat: 'sensors', trainee_id: 'trainee_c04', agent_profile: 'trainees/strong.js' },
    { seat: 'navigation', trainee_id: 'trainee_c07', agent_profile: 'trainees/strong.js' }];
  const teamAfter = crew => {
    const { a } = adapt({ envelope: env, crew });
    const out = [];
    for (let c = 1; c <= 12; c++) out.push(...a.evaluate([], c * 30));
    return { value: a.settings['weight.team'], adj: out.filter(x => x.setting === 'weight.team') };
  };
  const s = teamAfter(strongCrew), w = teamAfter(weakCrew);
  assert.ok(s.value > 1, `capable crew faces a better-drilled force (${s.value})`);
  assert.ok(w.value < s.value, `a weaker crew faces less teamwork (${w.value} < ${s.value})`);
  for (const x of s.adj.concat(w.adj)) {
    assert.equal(x.cause, 'team');
    assert.ok(x.new >= env['weight.team'].min && x.new <= env['weight.team'].max);
  }
});

test('D2: live evidence moves the target within the session', () => {
  const { a } = adapt();
  a.evaluate([], 30);
  assert.equal(a.liveState().seats.find(s => s.seat === 'navigation').target, 'hail_discipline');
  const lots = Array.from({ length: 40 }, () => ev('navigation', 'trainee_b', 'hail_acknowledged', 'hail_discipline', 'success', 60));
  a.evaluate(lots, 60);
  assert.notEqual(a.liveState().seats.find(s => s.seat === 'navigation').target, 'hail_discipline');
});

test('§5.1: one change per setting per cycle (the largest request), never summed; cooldown between changes', () => {
  const { a } = adapt({ crew: [
    { seat: 'weapons', trainee_id: 'trainee_c03', agent_profile: 'trainees/strong.js' },    // weak weapons discipline
    { seat: 'sensors', trainee_id: 'trainee_c04', agent_profile: 'trainees/strong.js' },
    { seat: 'navigation', trainee_id: 'trainee_b', agent_profile: 'trainees/weak_hail_discipline.js' }] });
  const c1 = a.evaluate([], 30);
  const bySetting = {};
  for (const x of c1) bySetting[x.setting] = (bySetting[x.setting] || 0) + 1;
  assert.ok(Object.values(bySetting).every(n => n === 1));
  const c2 = a.evaluate([], 60);
  assert.ok(c2.every(x => !c1.some(y => y.setting === x.setting)), 'a setting changed in cycle 1 waits out its cooldown');
});

test('§7: adjustment records have exactly the contract fields and pass the contract validator', () => {
  const { a, CGF } = adapt();
  const [x] = a.evaluate([], 30);
  deq(Object.keys(x).sort(), ['adjustment_id', 't', 'session_id', 'force', 'setting', 'old', 'new', 'requested', 'clamped',
    'target_competency', 'seat', 'pressure_direction', 'source', 'policy', 'evidence_event_ids', 'explanation', 'cause'].sort());
  deq(a.evaluate([], 60).concat(a.evaluate([], 90)).flatMap(y => CGF.contracts.validateAdjustment(y)), []);
  assert.equal(x.explanation, null);   // the reasoning panel fills it, never the policy
  assert.equal(x.policy, 'rules_v1');
});

// ---------------------------------------------------------------- D3: reasons
test('D3: every adjustment gets a template reason whose numbers come from the record (LLM off)', () => {
  const { record, CGF } = session({ duration_s: 2400 });
  const byId = Object.fromEntries(record.events.map(e => [e.event_id, e]));
  for (const adj of record.adjustments) {
    const text = CGF.reasoning.explain(adj, { trainee_id: record.crew.find(m => m.seat === adj.seat).trainee_id, eventsById: byId, min_window: 3 });
    assert.ok(text.length > 20);
    assert.ok(text.includes(`from ${Math.round(adj.old * 100) / 100} to ${Math.round(adj.new * 100) / 100}`));
    assert.ok(adj.pressure_direction === 'up' ? /raise the pressure|create exposure/.test(text) : /ease the pressure/.test(text));
  }
});

test('invariant 5: a rephrasing that adds or changes a number is rejected', () => {
  const w = load(), R = w.CGF.reasoning;
  const tpl = 'trainee_b (navigation) handled 1 of the last 4 hail discipline events, so CGF sensitivity was raised from 1 to 1.2.';
  assert.ok(R.rephraseIsValid(tpl, 'Trainee B answered only 1 of 4 recent hails, so sensitivity went from 1 to 1.2.'));
  assert.ok(!R.rephraseIsValid(tpl, 'Trainee B answered 2 of 4 hails, so sensitivity went from 1 to 1.2.'));
  assert.ok(!R.rephraseIsValid(tpl, 'Sensitivity rose by 20%.'));
  assert.ok(!R.rephraseIsValid(tpl, ''));
});

// ---------------------------------------------------------------- D4: steering
test('D4 / invariant 6: steering text reaches the engine only as a validated directive', async () => {
  const w = load(), CGF = w.CGF, crew = config().crew;
  const d = CGF.adaptSteer.parse("test trainee B's collision avoidance hard for 5 minutes", crew);
  deq(d, { raw_text: "test trainee B's collision avoidance hard for 5 minutes", trainee_id: 'trainee_b', competency: 'collision_avoidance', intensity: 'high', duration_s: 300 });
  deq(CGF.adaptSteer.validate(d, crew), []);
  assert.ok(CGF.adaptSteer.validate(CGF.adaptSteer.parse('make it harder', crew), crew).length > 0, 'no trainee or competency: rejected');
  assert.ok(CGF.adaptSteer.validate(Object.assign({}, d, { trainee_id: 'trainee_zz' }), crew).length > 0);
  assert.ok(CGF.adaptSteer.validate(Object.assign({}, d, { extra: 1 }), crew).length > 0);
  assert.ok(CGF.adaptSteer.validate(Object.assign({}, d, { duration_s: 99999 }), crew).length > 0);
  // weapons discipline is a competency, not the weapons seat
  assert.equal(CGF.adaptSteer.parse("test trainee_b's weapons discipline", crew).trainee_id, 'trainee_b');

  CGF.llm.settings.enabled = false;   // invariant 4: works with the LLM off
  const r = await CGF.adaptSteer.interpret("test trainee B's collision avoidance", crew);
  assert.equal(r.via, 'keyword parser'); deq(r.errors, []);

  CGF.loadScenario('strait-transit');
  CGF.adaptRuntime.begin(config(), { session_id: 's' });
  assert.throws(() => CGF.adaptRuntime.steer({ raw_text: 'x', trainee_id: 'trainee_b', competency: 'nope', intensity: 'medium', duration_s: 300 }));
  assert.equal(CGF.Adapt.current.liveState().seats.find(s => s.seat === 'navigation').steering, null, 'a rejected directive is never applied');
});

test('E6: a directive changes the target within one cycle and expires on time', () => {
  const { a } = adapt();
  a.evaluate([], 30);
  a.steer({ raw_text: 'x', trainee_id: 'trainee_b', competency: 'collision_avoidance', intensity: 'medium', duration_s: 120 });
  const out = a.evaluate([], 60);
  assert.equal(a.liveState().seats.find(s => s.seat === 'navigation').target, 'collision_avoidance');
  assert.ok(out.some(x => x.source === 'instructor_steer' && x.target_competency === 'collision_avoidance'));
  a.evaluate([], 150);
  assert.equal(a.liveState().seats.find(s => s.seat === 'navigation').target, 'collision_avoidance');
  a.evaluate([], 180);
  assert.equal(a.liveState().seats.find(s => s.seat === 'navigation').target, 'hail_discipline', 'expired after 120 s');
});

// ---------------------------------------------------------------- D5: session record
test('D5: the session record (§9.1) is emitted when the run reaches its duration', () => {
  const { record, CGF, cfg } = session({ duration_s: 1200 });
  assert.ok(record);
  deq(Object.keys(record).sort(), ['session_id', 'scenario', 'seed', 'mode', 'platform', 'crew', 'outcome', 'duration_s', 'events', 'adjustments'].sort());
  assert.equal(record.session_id, 's_test');
  assert.equal(record.scenario, 'strait-transit'); assert.equal(record.seed, cfg.seed); assert.equal(record.mode, 'adaptive');
  assert.equal(record.platform, 'warship');
  deq(record.crew, cfg.crew.map(m => ({ seat: m.seat, trainee_id: m.trainee_id })));
  assert.ok(['success', 'fail'].includes(record.outcome));
  assert.ok(record.duration_s >= 1200);
  assert.ok(CGF.sim.outcome, 'the run ended, so the link sends "ended" to the host');
  deq(record.events, CGF.simEvents.log());
  assert.equal(CGF.adaptRuntime.lastRecord(), record);
});

test('D5: the link-init event from link/runtime-link.js starts a session with that config', async () => {
  const w = load(), CGF = w.CGF, cfg = config({ duration_s: 300 });
  CGF.loadScenario('strait-transit');
  CGF.sim.link = { config: cfg };
  CGF.emit('link-init', cfg);
  await new Promise(r => setTimeout(r, 0));
  const s = CGF.adaptRuntime.session();
  assert.ok(s);
  assert.match(s.session_id, /^s_\d{8}_\d{6}$/, 'a generated session id has no pane suffix');
  deq(s.config.crew, cfg.crew);
  assert.equal(CGF.params.sensitivity, cfg.envelope.sensitivity.base, 'settings start at the envelope base');
});
