// Report and history tests (Glenda's lane). Run from cgf-demo/:  node --test tests/report/*.test.js
// Values made inside the sandbox come from another realm, so they go through plain() before deepEqual.
// Loads the browser scripts into a sandbox with a stub localStorage, the same way report.html loads them.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['contracts/contracts.js', 'fixtures/profiles/roster.js', 'fixtures/history/demo.js', 'js/report/report.js', 'js/history/history.js'];

function storage(initial) {
  const m = new Map(Object.entries(initial || {}));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
    dump: () => Object.fromEntries(m), get length() { return m.size; }
  };
}
// Object.keys(localStorage) in history.js: expose stored keys as own enumerable properties
function storageProxy(s) {
  return new Proxy(s, {
    ownKeys: () => Object.keys(s.dump()),
    getOwnPropertyDescriptor: (t, k) => (k in s.dump() ? { enumerable: true, configurable: true, value: s.dump()[k] } : Reflect.getOwnPropertyDescriptor(t, k))
  });
}
function load(store) {
  const ls = storageProxy(store || storage());
  const ctx = { console, URLSearchParams, localStorage: ls };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.CGF;
}
const plain = v => JSON.parse(JSON.stringify(v));
function sessionsOf() {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'fixtures/history/demo.js'), 'utf8'), ctx);
  return ctx.CGF_FIXTURES.history.sessions;
}
const recordOf = id => plain(sessionsOf().find(s => s.record.session_id === id).record);

// ------------------------------------------------------------ G1: facts match the record
test('trainee_b G1 session: facts match the record (INTERFACES §9 worked example)', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf('s_20261030_02'), 'trainee_b');
  assert.equal(r.facts.competency_means_start.hail_discipline, 0.26);
  assert.deepEqual(plain(r.facts.events_by_competency.hail_discipline), { success: 4, fail: 7 });
  assert.equal(r.facts.adjustments_count, 9);
  assert.equal(r.facts.top_target, 'hail_discipline');
  assert.equal(r.facts.competency_means_end, null);
});

test('trainee_a G1 session: facts match the record', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf('s_20261030_01'), 'trainee_a');
  assert.deepEqual(plain(r.facts.events_by_competency), { hail_discipline: { success: 4, fail: 0 }, weapons_discipline: { success: 3, fail: 0 } });
  assert.equal(r.facts.adjustments_count, 3);
  assert.equal(r.facts.top_target, 'collision_avoidance');
  assert.equal(r.facts.competency_means_start.hail_discipline, 0.8);   // 16 / (16 + 4) from the roster profile
});

test('every seeded report recounts to its record, per crew member', () => {
  const CGF = load();
  for (const { record } of sessionsOf()) for (const { trainee_id } of record.crew) {
    const f = CGF.Report.build(plain(record), trainee_id).facts, count = {};
    for (const e of record.events) if (e.trainee_id === trainee_id && e.competency)
      (count[e.competency] = count[e.competency] || { success: 0, fail: 0 })[e.outcome]++;
    assert.deepEqual(plain(f.events_by_competency), count, `${record.session_id} ${trainee_id}`);
    assert.equal(f.adjustments_count, record.adjustments.length);
  }
});

test('report has exactly the contract fields', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf('s_20261030_02'), 'trainee_b');
  assert.deepEqual(Object.keys(r).sort(), ['facts', 'narrative', 'session_id', 'trainee_id']);
  assert.deepEqual(Object.keys(r.facts).sort(), ['adjustments_count', 'competency_means_end', 'competency_means_start', 'events_by_competency', 'top_target']);
});

test('fixed mode: no adjustments, no target, and the narrative says so', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf('s_20261021_02'), 'trainee_b');
  assert.equal(r.facts.adjustments_count, 0);
  assert.equal(r.facts.top_target, null);
  assert.match(r.narrative, /not adjusted/);
});

// ------------------------------------------------------------ G2: narrative and validator
test('every seeded narrative passes the validator (templates, no LLM)', () => {
  const CGF = load();
  for (const { record } of sessionsOf()) for (const { trainee_id } of record.crew) {
    const r = CGF.Report.build(plain(record), trainee_id);
    assert.deepEqual(plain(CGF.Report.validateNarrative(r.narrative, r.facts)), [], r.narrative);
    assert.ok(r.narrative.length > 40);
  }
});

test('validator rejects a number that is not in facts, and ignores digits inside ids', () => {
  const CGF = load();
  const f = CGF.Report.build(recordOf('s_20261030_02'), 'trainee_b').facts;
  assert.deepEqual(plain(CGF.Report.validateNarrative('Hail discipline improved by 15% to 0.41.', f)), [15, 0.41]);
  assert.deepEqual(plain(CGF.Report.validateNarrative('trainee_c01 in s_20261030_01 had 4 successes and 7 failures.', f)), []);
  assert.deepEqual(plain(CGF.Report.validateNarrative('Profile mean 0.26 after 9 adjustments.', f)), []);
});

test('narrative sentences about a trainee use the same thresholds as the view', () => {
  const CGF = load();
  const r = CGF.Report.build(recordOf('s_20261030_01'), 'trainee_c08');   // collision 3/2 = 0.6: not "needs work"
  assert.doesNotMatch(r.narrative, /Needs the most work/);
  assert.match(r.narrative, /Strongest this session: territorial awareness/);
});

test('build rejects a trainee outside the crew and a malformed record', () => {
  const CGF = load();
  assert.throws(() => CGF.Report.build(recordOf('s_20261030_02'), 'trainee_a'), /not in the crew/);
  assert.throws(() => CGF.Report.build({ session_id: 'x' }, 'trainee_a'), /crew must be an array/);
});

test('profile at start: stored profile first, then the seeded roster, then the prior', () => {
  const store = storage({ 'cgf.profile.trainee_b': JSON.stringify({ trainee_id: 'trainee_b', sessions_completed: 7,
    competencies: { hail_discipline: { alpha: 9, beta: 11 } }, updated_at_session: 's_x' }) });
  const CGF = load(store);
  const rec = recordOf('s_20261030_02');
  assert.equal(CGF.Report.build(rec, 'trainee_b').facts.competency_means_start.hail_discipline, 0.45);
  assert.equal(CGF.Report.build(rec, 'trainee_b').facts.competency_means_start.piracy_response, 0.5);    // prior
  assert.equal(CGF.Report.build(rec, 'trainee_c11').facts.competency_means_start.territorial_awareness, 0.28);
});

// ------------------------------------------------------------ G3: history store
test('seeded history is listed oldest first, with means_end filled except for the latest session', () => {
  const CGF = load();
  const list = CGF.History.list('trainee_b');
  assert.deepEqual(plain(list.map(e => e.session_id)), ['s_20261021_02', 's_20261024_02', 's_20261027_02', 's_20261030_02']);
  assert.ok(list[0].competency_means_end && list[2].competency_means_end);
  assert.equal(list[3].competency_means_end, null);
  assert.deepEqual(Object.keys(list[0]).sort(), ['competency_means_end', 'mode', 'outcome', 'report', 'scenario', 'session_id', 'top_target', 'trainee_id']);
});

test('history survives a reload, appends newest last and never overwrites', () => {
  const store = storage();
  let CGF = load(store);
  const rec = recordOf('s_20261030_02');
  rec.session_id = 's_20261031_01';
  rec.events.forEach(e => { e.session_id = rec.session_id; });
  CGF.Report.finishSession(rec);
  const first = CGF.History.find('trainee_b', 's_20261031_01');
  assert.ok(first);

  CGF = load(store);                                              // reload: a new page with the same storage
  assert.equal(CGF.History.list('trainee_b').slice(-1)[0].session_id, 's_20261031_01');
  const changed = Object.assign(plain(first), { outcome: 'fail' });
  CGF.History.append(changed);                                    // same session: ignored, not overwritten
  assert.equal(CGF.History.find('trainee_b', 's_20261031_01').outcome, 'success');
  assert.equal(CGF.History.list('trainee_b').filter(e => e.session_id === 's_20261031_01').length, 1);
  assert.ok(CGF.History.trainees().includes('trainee_c11'));
});

test('attachAssessment fills competency_means_end for a stored entry', () => {
  const CGF = load();
  const rec = recordOf('s_20261030_01'); rec.session_id = 's_20261031_02';
  CGF.Report.finishSession(rec);
  CGF.History.attachAssessment('trainee_a', 's_20261031_02', { hail_discipline: 0.82 });
  assert.deepEqual(plain(CGF.History.find('trainee_a', 's_20261031_02').competency_means_end), { hail_discipline: 0.82 });
  assert.throws(() => CGF.History.attachAssessment('trainee_a', 'nope', {}), /no stored history entry/);
});

test('append rejects an entry missing contract fields', () => {
  const CGF = load();
  assert.throws(() => CGF.History.append({ session_id: 's', trainee_id: 't' }), /missing scenario, mode, outcome, report/);
});

// ------------------------------------------------------------ G5: context for the next session
test('context: trainee_b is weak at hail discipline, trainee_a is not weak at anything', () => {
  const CGF = load();
  const b = CGF.History.context('trainee_b', 5), a = CGF.History.context('trainee_a', 5);
  assert.equal(b.weak[0], 'hail_discipline');
  assert.equal(b.sessions, 4);
  assert.deepEqual(plain(a.weak), []);
  assert.ok(a.strong.includes('hail_discipline'));
  assert.equal(CGF.History.context('trainee_b', 2).sessions, 2);
});

// ------------------------------------------------------------ G4: hand-off to the report page
test('finishSession builds one report per crew member and links to the page with the record', () => {
  const CGF = load();
  const rec = recordOf('s_20261030_02');
  const out = CGF.Report.finishSession(rec);
  assert.deepEqual(plain(out.reports.map(r => r.trainee_id)), ['trainee_b', 'trainee_c11']);
  assert.match(out.url, /^report\.html\?session=s_20261030_02#record=/);
  const back = JSON.parse(decodeURIComponent(out.url.split('#record=')[1]));
  assert.deepEqual(back, plain(rec));
});
