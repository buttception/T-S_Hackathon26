// Adapt.predictTarget (docs/project/request-devin-predict-target.md). Run from cgf-demo/:  node --test tests/runtime/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, config, ROOT } = require('./harness.js');

const J = x => JSON.parse(JSON.stringify(x));

// predict.js on its own, as allocate.html loads it: nothing else in the page
function standalone() {
  const window = {}; window.window = window;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/adapt/predict.js'), 'utf8'), vm.createContext(window));
  return window.Adapt;
}
const prof = comps => ({ trainee_id: 't', sessions_completed: 3, competencies: comps, updated_at_session: null });
const NAV = ['collision_avoidance', 'territorial_awareness', 'hail_discipline'];

test('predictTarget is standalone: it needs nothing else loaded', () => {
  const A = standalone();
  assert.equal(typeof A.predictTarget, 'function');
});

test('weakest_in_seat, with mean, evidence and the settings it would nudge', () => {
  const A = standalone();
  const r = A.predictTarget({ profile: prof({ hail_discipline: { alpha: 5, beta: 14 }, collision_avoidance: { alpha: 18, beta: 6 }, territorial_awareness: { alpha: 11, beta: 9 } }),
    seat: 'navigation', competencies: NAV, mode: 'adaptive' });
  assert.deepEqual(J(r), { competency: 'hail_discipline', mean: 5 / 19, evidence: 19, reason: 'weakest_in_seat', settings: ['sensitivity', 'weight.ignoredWarning'] });
});

test('weakest_overall when none of the seat\'s competencies has enough evidence', () => {
  const A = standalone();
  const r = A.predictTarget({ profile: prof({ hail_discipline: { alpha: 2, beta: 1 }, weapons_discipline: { alpha: 4, beta: 6 }, speed_management: { alpha: 9, beta: 3 } }),
    seat: 'navigation', competencies: NAV, mode: 'adaptive' });
  assert.equal(r.competency, 'weapons_discipline'); assert.equal(r.reason, 'weakest_overall'); assert.equal(r.evidence, 10);
});

test('no_evidence, fixed_mode, unreadable input: clean answers, never a throw', () => {
  const A = standalone();
  const none = reason => ({ competency: null, mean: null, evidence: 0, reason, settings: [] });
  assert.deepEqual(J(A.predictTarget({ profile: prof({ hail_discipline: { alpha: 2, beta: 2 } }), seat: 'navigation', competencies: NAV, mode: 'adaptive' })), none('no_evidence'));
  assert.deepEqual(J(A.predictTarget({ profile: prof({ hail_discipline: { alpha: 1, beta: 19 } }), seat: 'navigation', competencies: NAV, mode: 'fixed' })), none('fixed_mode'));
  for (const bad of [null, undefined, 42, {}, { profile: null }, { profile: { competencies: 'x' } }, { profile: prof({ hail_discipline: { alpha: 'a', beta: null } }) }])
    assert.deepEqual(J(A.predictTarget(bad)), none('no_evidence'));
});

test('a tie goes to the competency earlier in the seat\'s list', () => {
  const A = standalone();
  const same = { alpha: 4, beta: 6 };
  const r = A.predictTarget({ profile: prof({ hail_discipline: same, territorial_awareness: same }), seat: 'navigation', competencies: NAV, mode: 'adaptive' });
  assert.equal(r.competency, 'territorial_awareness');
});

test('pure: it does not change its input', () => {
  const A = standalone();
  const input = { profile: prof({ hail_discipline: { alpha: 5, beta: 14 } }), seat: 'navigation', competencies: NAV.slice(), mode: 'adaptive' };
  const before = JSON.stringify(input);
  A.predictTarget(input); A.predictTarget(input);
  assert.equal(JSON.stringify(input), before);
});

test('agrees with the live policy\'s first target for every seeded trainee in every seat', () => {
  const w = load(), CGF = w.CGF, F = w.CGF_FIXTURES;
  for (const [type, info] of Object.entries(F.platformTypes)) {
    for (const seat of info.seats) {
      for (const p of F.profiles) {
        const predicted = w.Adapt.predictTarget({ profile: J(p), seat, competencies: info.seatFocus[seat], mode: 'adaptive' });
        const crew = info.seats.map((s, i) => ({ seat: s, trainee_id: s === seat ? p.trainee_id : `trainee_x${i}`, agent_profile: 'trainees/strong.js' }));
        const a = CGF.Adapt.create({ config: config({ platform: { type, model: 'x' }, crew }), profiles: { [p.trainee_id]: p },
          seatFocus: info.seatFocus, session_id: 's' });
        a.evaluate([], 30);
        const live = a.liveState().seats.find(s => s.seat === seat);
        assert.equal(live.target, predicted.competency, `${type}/${seat}/${p.trainee_id}`);
      }
    }
  }
});
