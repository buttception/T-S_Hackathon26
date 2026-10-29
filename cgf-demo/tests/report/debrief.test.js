// Debrief tests (Glenda's lane): why the CGFs acted as they did, and the calibration for the next session.
// Run from cgf-demo/:  node --test tests/report/*.test.js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['contracts/contracts.js', 'fixtures/profiles/roster.js', 'fixtures/platforms.js', 'fixtures/history/demo.js',
  'js/report/report.js', 'js/history/history.js', 'js/report/debrief.js'];

function load(initial) {
  const m = new Map(Object.entries(initial || {}));
  const ls = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const ctx = { console, localStorage: ls };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.CGF;
}
const plain = v => JSON.parse(JSON.stringify(v));
const recordOf = (CGF, id) => plain(CGF.History.record(id));

test('why: trainee_b phases go sharper on hails while untested, ease off while failing, press again as he improves, and skip the crewmate\'s adjustment', () => {
  const CGF = load();
  const w = CGF.Debrief.why(recordOf(CGF, 's_20261030_02'), 'trainee_b');
  assert.deepEqual(plain(w.phases.map(p => [p.target, p.direction, p.adjustments.length])),
    [['hail_discipline', 'up', 2], ['hail_discipline', 'down', 3], ['hail_discipline', 'up', 3]]);
  assert.equal(w.crew_phases, 1);                                     // weight.territorial served trainee_c11
  const up = w.phases[0];
  assert.deepEqual(plain(up.changes.find(c => c.setting === 'weight.ignoredWarning')), { setting: 'weight.ignoredWarning', old: 1, new: 1.25, clamped: false, behaviour: 'took ignored hails more seriously' });
  assert.match(up.reason, /no recent hail discipline evidence/i);   // fewer than 3 target events yet: exposure, not a success rate
  assert.match(w.phases[1].reason, /struggling.*ease off/);
  assert.equal(w.phases[2].changes.find(c => c.setting === 'reaction_delay_s').behaviour, 'reacted faster');
  assert.match(w.phases[2].reason, /doing well.*raise the challenge/);
  assert.match(w.lines.join(' '), /sharper while the trainee was handling the target well and eased off while the trainee was struggling/);
});

test('why: evidence counts are the trainee\'s own events from the record', () => {
  const CGF = load();
  const rec = recordOf(CGF, 's_20261030_02');
  for (const p of CGF.Debrief.why(rec, 'trainee_b').phases) {
    const ids = new Set(p.adjustments.flatMap(a => a.evidence_event_ids));
    const ev = rec.events.filter(e => ids.has(e.event_id) && e.trainee_id === 'trainee_b');
    assert.equal(p.evidence.success, ev.filter(e => e.outcome === 'success').length);
    assert.equal(p.evidence.fail, ev.filter(e => e.outcome === 'fail').length);
    if (p.so_far.success + p.so_far.fail < 3) continue;       // before 3 target events the reason is the exposure probe, not a success rate
    assert.ok(p.reason.includes(`${p.evidence.success} of their last ${p.evidence.success + p.evidence.fail}`), p.reason);
  }
});

test('why: an adjustment with a seat serves only that seat', () => {
  const CGF = load();
  const rec = recordOf(CGF, 's_20261030_02');
  rec.adjustments.forEach(a => { a.seat = 'navigation'; });
  assert.equal(CGF.Debrief.why(rec, 'trainee_b').phases.length, 0);
  assert.equal(CGF.Debrief.why(rec, 'trainee_c11').crew_phases, 0);
  assert.match(CGF.Debrief.why(rec, 'trainee_b').lines[0], /served a crewmate/);
});

test('why: fixed mode says the CGFs did not adapt', () => {
  const CGF = load();
  const w = CGF.Debrief.why(recordOf(CGF, 's_20261021_02'), 'trainee_b');
  assert.equal(w.phases.length, 0);
  assert.match(w.lines[0], /Fixed mode/);
});

test('next: trainee_b is pressed on hail discipline next, including the pending session', () => {
  const CGF = load();
  const n = CGF.Debrief.next('trainee_b', {});
  assert.equal(n.target, 'hail_discipline');
  assert.equal(n.reason, 'weakest_overall');
  assert.equal(n.pending, true);
  // roster 5 / 19 plus this session's 4 successes and 7 failures: 9 / 30
  assert.equal(n.mean, 0.3);
  assert.equal(n.evidence, 30);
  assert.equal(n.trend.sessions, 4);
  assert.equal(n.trend.pressed, 3);                                   // fixed session had no target
  assert.match(n.lines.join(' '), /start by pressing hail discipline/);
});

test('next: in the weapons seat again trainee_b is pressed on that seat\'s weakest, and the overall weakest is named', () => {
  const CGF = load();
  const n = CGF.Debrief.next('trainee_b', { record: recordOf(CGF, 's_20261030_02') });
  assert.equal(n.reason, 'weakest_in_seat');
  assert.equal(n.target, 'weapons_discipline');
  assert.equal(n.overall, 'hail_discipline');
  assert.match(n.lines.join(' '), /Hail discipline is still the trainee’s lowest-rated overall \(0\.3\)/);
});

test('next: after the competency update the stored profile is used as is', () => {
  const CGF = load({ 'cgf.profile.trainee_b': JSON.stringify({ trainee_id: 'trainee_b', sessions_completed: 7,
    competencies: { hail_discipline: { alpha: 20, beta: 5 }, collision_avoidance: { alpha: 6, beta: 6 } }, updated_at_session: 's_20261030_02' }) });
  const n = CGF.Debrief.next('trainee_b', {});
  assert.equal(n.pending, false);
  assert.equal(n.target, 'collision_avoidance');
  assert.equal(n.strongest, 'hail_discipline');
});

test('next: the seat focus decides the target when it has evidence (INTERFACES §5.1)', () => {
  const CGF = load();
  // trainee_c11 in navigation: territorial awareness is weakest among collision, territorial, hail
  const n = CGF.Debrief.next('trainee_c11', { record: recordOf(CGF, 's_20261030_02') });
  assert.equal(n.reason, 'weakest_in_seat');
  assert.equal(n.target, 'territorial_awareness');
});

test('debrief leaves the §9 report untouched', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf(CGF, 's_20261030_02'), 'trainee_b');
  CGF.Debrief.why(recordOf(CGF, 's_20261030_02'), 'trainee_b');
  assert.deepEqual(Object.keys(r).sort(), ['facts', 'narrative', 'session_id', 'trainee_id']);
});
