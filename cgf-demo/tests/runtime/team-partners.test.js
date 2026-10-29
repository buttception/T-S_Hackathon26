// Cooperating CGFs (LANES D6) and AI partner seats (LANES D8). Run from cgf-demo/:  node --test tests/runtime/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, config } = require('./harness.js');

const J = x => JSON.parse(JSON.stringify(x));
const deq = (a, b, msg) => assert.deepStrictEqual(J(a), J(b), msg);

// A crew with an AI partner in the weapons seat, played from the runs of trainee_b (INTERFACES §3.2)
function partnerCrew(rates) {
  return [
    { seat: 'weapons', trainee_id: 'partner_weapons', role: 'partner', derived_from: { trainee_id: 'trainee_b' },
      agent_params: { rates: rates || { fc_restraint: 0.2, hail_acknowledged: 0.5 }, reaction_delay_s: 20, basis: { source: 'history', sessions: 4 } } },
    { seat: 'sensors', trainee_id: 'trainee_c08', agent_profile: 'trainees/strong.js' },
    { seat: 'navigation', trainee_id: 'trainee_b', agent_profile: 'trainees/weak_hail_discipline.js' }
  ];
}

function run(over, opts) {
  const w = load(), CGF = w.CGF, cfg = config(over);
  CGF.loadScenario(cfg.scenario);
  if (opts && opts.harnesses) for (const [k, h] of Object.entries(opts.harnesses)) CGF.setForceHarness(k, h);
  if (opts && opts.teamwork) for (const [k, v] of Object.entries(opts.teamwork)) CGF.setTeamwork(k, v);
  const errs = CGF.adaptRuntime.begin(cfg, { session_id: 's_team' });
  deq(errs, []);
  CGF.sim.running = true;
  let record = null; const team = [];
  CGF.on('session-record', r => { record = r; });
  CGF.on('sim:team', x => team.push(x));
  while (!record && CGF.sim.t < cfg.duration_s + 10) CGF.step(2);
  return { CGF, record, team, cfg };
}

// ---------------------------------------------------------------- D6: cooperating CGFs
test('D6: one unanswered warning brings the rest of the force in (shared alert), visible as team actions', () => {
  const { record, team } = run({ duration_s: 1800 });
  const ignored = record.events.filter(e => e.type === 'hail_ignored');
  assert.ok(ignored.length > 0, 'the weak crew leaves a warning unanswered');
  const fromRed = team.filter(x => x.force === 'red');
  assert.ok(fromRed.length >= 2, `teammates joined the response (${fromRed.length})`);
  assert.ok(new Set(fromRed.map(x => x.to)).size >= 2, 'more than one teammate responded');
  assert.ok(fromRed.every(x => x.to !== x.from));
});

test('D6: teamwork 0 is a force of individuals: no shared alerts', () => {
  const { team } = run({ duration_s: 1800 }, { teamwork: { red: 0, black: 0, pirate: 0 } });
  assert.equal(team.length, 0);
});

test('D6: an elite harness cooperates more than an ordinary one', () => {
  const ordinary = run({ duration_s: 1800 }).team.filter(x => x.force === 'red');
  const elite = run({ duration_s: 1800 }, { harnesses: { red: 'hostile-elite' } }).team.filter(x => x.force === 'red');
  const total = list => list.reduce((s, x) => s + x.boost, 0);
  assert.ok(total(elite) > total(ordinary), `elite ${total(elite)} > ordinary ${total(ordinary)}`);
});

test('D6: a unit out of contact steers on its force\'s shared fix, dead-reckoned', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit');
  const o = CGF.sim.own, near = CGF.sim.units.find(u => u.name === 'R-21'), far = CGF.sim.units.find(u => u.name === 'R-22');
  Object.assign(near, { x: o.x, y: o.y + 3 });
  CGF.step(2);   // R-21 holds contact and shares a fix
  assert.ok(CGF.pictureOf('red').fix, 'a shared fix exists');
  assert.ok(CGF.util.dist(far, o) > CGF.detectionRange(), 'R-22 is out of contact');
  const seen = CGF.perceivedOwn(far);
  assert.notEqual(seen, o, 'R-22 uses the shared fix, not the truth');
  assert.ok(CGF.util.dist(seen, o) < 1, 'the dead-reckoned fix is close to the ownship');
  CGF.setTeamwork('red', 0);
  assert.equal(CGF.perceivedOwn(far), o, 'with teamwork 0 nothing is shared');
});

test('D6 / invariant 3: the same seed gives the same cooperation and the same events', () => {
  const a = run({ duration_s: 1500, seed: 77 }), b = run({ duration_s: 1500, seed: 77 });
  assert.equal(JSON.stringify(a.team), JSON.stringify(b.team));
  assert.equal(JSON.stringify(a.record.events), JSON.stringify(b.record.events));
});

test('instructor teamwork override and harness value', () => {
  const w = load(), CGF = w.CGF;
  CGF.loadScenario('strait-transit');
  assert.equal(CGF.teamworkOf('red'), 0.5);
  CGF.setForceHarness('red', 'hostile-elite');
  assert.equal(CGF.teamworkOf('red'), 0.95);
  CGF.setTeamwork('red', 0.2);
  assert.equal(CGF.teamworkOf('red'), 0.2);
  CGF.setTeamwork('red', null);
  assert.equal(CGF.teamworkOf('red'), 0.95);
  assert.equal(CGF.teamworkOf('white'), 0, 'civil traffic has no teamwork');
});

// ---------------------------------------------------------------- D8: AI partner seats
test('D8: a partner seat is played from its params and its events name the partner', () => {
  const { record, CGF, cfg } = run({ duration_s: 2400, crew: partnerCrew() });
  deq(CGF.contracts.validateScenarioConfig(cfg), []);
  const partnerEvents = record.events.filter(e => e.seat === 'weapons');
  assert.ok(partnerEvents.length > 0, 'the partner seat produces events');
  assert.ok(partnerEvents.every(e => e.trainee_id === 'partner_weapons'));
  deq(record.crew[0], { seat: 'weapons', trainee_id: 'partner_weapons', role: 'partner', derived_from: { trainee_id: 'trainee_b' } });
});

test('D8: no adjustment is caused by or names a partner seat; the record passes the contract validator', () => {
  const { record, CGF, cfg } = run({ duration_s: 2400, crew: partnerCrew() });
  assert.ok(record.adjustments.length > 0);
  assert.ok(record.adjustments.every(a => a.seat !== 'weapons'));
  const partnerIds = new Set(record.events.filter(e => e.seat === 'weapons').map(e => e.event_id));
  assert.ok(record.adjustments.every(a => a.evidence_event_ids.every(id => !partnerIds.has(id))));
  deq(CGF.contracts.validateSessionRecord(record, { envelope: cfg.envelope }), []);
  const live = CGF.Adapt.current ? CGF.Adapt.current.liveState() : null;
  if (live) assert.ok(live.seats.every(s => s.seat !== 'weapons'), 'no working copy or target for the partner');
});

test('D8 / invariant 3: two runs of one partner on one seed give identical events', () => {
  const a = run({ duration_s: 1800, crew: partnerCrew() }).record, b = run({ duration_s: 1800, crew: partnerCrew() }).record;
  assert.equal(JSON.stringify(a.events), JSON.stringify(b.events));
});

test('D8: the partner follows its rates (fire-control restraint low vs high)', () => {
  const locks = rates => {
    let n = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const { record } = run({ duration_s: 2400, seed, crew: partnerCrew(rates) });
      n += record.events.filter(e => e.type === 'fc_radar_lock').length;
    }
    return n;
  };
  assert.ok(locks({ fc_restraint: 0 }) > locks({ fc_restraint: 1 }), 'a partner with no restraint locks radar more often');
  assert.equal(locks({ fc_restraint: 1 }), 0);
});

// ---------------------------------------------------------------- session records from full runs
test('every session record from a full run passes the contract validator (adaptive and fixed)', () => {
  for (const mode of ['adaptive', 'fixed']) {
    const { record, CGF, cfg } = run({ duration_s: 2400, mode });
    deq(CGF.contracts.validateSessionRecord(record, { envelope: cfg.envelope }), [], mode);
    if (mode === 'adaptive') assert.ok(record.adjustments.every(a => a.source === 'instructor_steer' || ['live', 'history', 'team'].includes(a.cause)));
  }
});
