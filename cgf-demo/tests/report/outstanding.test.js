// Report-lane tests for the outstanding items: narrative validator fixtures, AI partners (INTERFACES §3.2),
// Eevee R18, R20, R21, and the seeded history that gives Assess.partnerParams basis.source = history.
// Runs two ways: `node --test tests/report/*.test.js` (no DOM, so the page tests are skipped), and in a browser by
// opening tests/report/outstanding.html (all of them; the project laptops have no Node). Same file, same assertions.
'use strict';
const NODE = typeof process !== 'undefined' && !!(process.versions && process.versions.node);
const { test } = require('node:test');
const assert = require('node:assert/strict');

const FILES = ['contracts/contracts.js', 'fixtures/profiles/roster.js', 'fixtures/history/demo.js', 'js/report/report.js',
  'js/history/history.js', 'js/report/debrief.js', 'js/report/charts.js', 'js/assess/assess.js'];
let load;
if (NODE) {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const ROOT = path.join(__dirname, '..', '..');
  load = () => {
    const m = new Map();
    const ls = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
    const ctx = { console, URLSearchParams, localStorage: new Proxy(ls, { ownKeys: () => [...m.keys()],
      getOwnPropertyDescriptor: (t, k) => (m.has(k) ? { enumerable: true, configurable: true, value: m.get(k) } : Reflect.getOwnPropertyDescriptor(t, k)) }) };
    ctx.window = ctx; vm.createContext(ctx);
    for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    return { CGF: ctx.CGF, fixtures: ctx.CGF_FIXTURES, ls };
  };
} else {
  // Browser: the page already loaded the scripts; each test starts from empty storage and an empty seed cache
  load = () => {
    Object.keys(localStorage).filter(k => k.startsWith('cgf.')).forEach(k => localStorage.removeItem(k));
    window.CGF.History._resetSeedCache();
    return { CGF: window.CGF, fixtures: window.CGF_FIXTURES, ls: localStorage };
  };
}
const plain = v => JSON.parse(JSON.stringify(v));
const recordOf = (fixtures, id) => plain(fixtures.history.sessions.find(s => s.record.session_id === id).record);

// A G1 record plus an AI partner in the sensors seat, with events of its own
function withPartner(fixtures, id) {
  const rec = recordOf(fixtures, id);
  rec.crew.push({ seat: 'sensors', trainee_id: 'partner_sensors', role: 'partner', derived_from: { trainee_id: 'trainee_b' } });
  const n = rec.events.length;
  [['hail_discipline', 'hail_ignored', 'fail'], ['hail_discipline', 'hail_ignored', 'fail'], ['collision_avoidance', 'safe_passage', 'success']]
    .forEach(([competency, type, outcome], i) => rec.events.push({ t: 100 + i, session_id: rec.session_id, trainee_id: 'partner_sensors',
      seat: 'sensors', type, competency, outcome, unit_id: 'ship_1', detail: {}, event_id: 'e_' + String(n + i + 1).padStart(6, '0') }));
  return rec;
}

// ------------------------------------------------------------ narrative validator: named fixtures
// Facts for trainee_b in s_20261030_02: hail 4 / 7, weapons 2 / 0, profile mean 0.26, 9 adjustments.
const GOOD_NARRATIVES = {
  template_text: null,   // filled in from Report.narrate: the real template must always pass
  restates_counts: 'Hail discipline had 4 successes and 7 failures over 9 adjustments.',
  restates_mean: 'Starting from a profile mean of 0.26, hail discipline is the focus area.',
  ids_with_digits: 'trainee_c11 in s_20261030_02 is an id, not a figure.',
  no_numbers: 'The trainee struggled with hails and the CGFs pressed that skill.'
};
const BAD_NARRATIVES = {   // each: [text, the numbers the validator must report]
  invented_count: ['Hail discipline had 5 successes and 7 failures.', [5]],
  invented_percentage: ['Hail discipline improved by 15% to 0.41.', [15, 0.41]],
  invented_duration: ['The CGFs were adjusted for 37 minutes.', [37]],
  one_good_one_bad: ['Hail discipline had 4 successes and 99 failures.', [99]],
  decimal_not_in_facts: ['Profile mean was 0.2.', [0.2]]
};

test('validator accepts each passing narrative fixture', () => {
  const { CGF, fixtures } = load();
  const r = CGF.Report.build(recordOf(fixtures, 's_20261030_02'), 'trainee_b');
  GOOD_NARRATIVES.template_text = r.narrative;
  for (const [name, text] of Object.entries(GOOD_NARRATIVES))
    assert.deepEqual(plain(CGF.Report.validateNarrative(text, r.facts)), [], name);
});

test('validator rejects each failing narrative fixture and names the absent numbers', () => {
  const { CGF, fixtures } = load();
  const f = CGF.Report.build(recordOf(fixtures, 's_20261030_02'), 'trainee_b').facts;
  for (const [name, [text, want]] of Object.entries(BAD_NARRATIVES))
    assert.deepEqual(plain(CGF.Report.validateNarrative(text, f)), want, name);
});

test('a number that is in facts for another trainee is still rejected', () => {
  const { CGF, fixtures } = load();
  const fa = CGF.Report.build(recordOf(fixtures, 's_20261030_01'), 'trainee_a').facts;   // trainee_a: hail 4 / 0, weapons 3 / 0
  assert.deepEqual(plain(CGF.Report.validateNarrative('Hail discipline had 4 successes and 7 failures.', fa)), [7]);
});

test('every template narrative the seeded sessions produce passes the validator', () => {
  const { CGF, fixtures } = load();
  for (const { record } of fixtures.history.sessions) for (const c of record.crew) {
    const r = CGF.Report.build(plain(record), c.trainee_id);
    assert.deepEqual(plain(CGF.Report.validateNarrative(r.narrative, r.facts)), [], record.session_id + ' ' + c.trainee_id);
  }
});

// ------------------------------------------------------------ task 1: AI partners
test('partner: the record lists the partner line, and the report builds no report for it', () => {
  const { CGF, fixtures } = load();
  const rec = withPartner(fixtures, 's_20261030_02');
  assert.deepEqual(plain(CGF.Report.partnersOf(rec)), [{ seat: 'sensors', trainee_id: 'partner_sensors', derived_from: 'trainee_b' }]);
  assert.equal(CGF.Report.partnerLine(CGF.Report.partnersOf(rec)[0]), 'AI partner in the sensors seat, based on trainee_b');
  assert.throws(() => CGF.Report.build(rec, 'partner_sensors'), /AI partner/);
  assert.deepEqual(plain(CGF.Report.traineesOf(rec).map(c => c.trainee_id)), ['trainee_b', 'trainee_c11']);
});

test('partner: finishSession reports and records the trainees only', () => {
  const { CGF, fixtures } = load();
  const rec = withPartner(fixtures, 's_20261030_02');
  rec.session_id = 's_20261031_01';
  const out = CGF.Report.finishSession(rec);
  assert.deepEqual(plain(out.reports.map(r => r.trainee_id)), ['trainee_b', 'trainee_c11']);
  assert.equal(CGF.History.find('partner_sensors', 's_20261031_01'), null);
  assert.deepEqual(plain(CGF.History.trainees().filter(t => t.startsWith('partner_'))), []);
});

test('partner: History.append refuses any partner_ id and stores nothing', () => {
  const { CGF, fixtures, ls } = load();
  const rec = recordOf(fixtures, 's_20261030_02');
  const entry = CGF.Report.entryFor(rec, CGF.Report.build(rec, 'trainee_b'));
  for (const id of ['partner_weapons', 'partner_', 'partner_sensors'])
    assert.throws(() => CGF.History.append(Object.assign({}, entry, { trainee_id: id })), /AI partner/, id);
  assert.equal(ls.getItem('cgf.history.partner_weapons'), null);
  assert.equal(ls.getItem('cgf.history.partner_sensors'), null);
  CGF.History.append(Object.assign({}, entry, { session_id: 's_x_01' }));   // a trainee id still works
  assert.equal(CGF.History.list('trainee_b').slice(-1)[0].session_id, 's_x_01');
});

test('partner: partner events never count in any trainee events_by_competency', () => {
  const { CGF, fixtures } = load();
  const plainRec = recordOf(fixtures, 's_20261030_02'), rec = withPartner(fixtures, 's_20261030_02');
  for (const t of ['trainee_b', 'trainee_c11'])
    assert.deepEqual(plain(CGF.Report.build(rec, t).facts), plain(CGF.Report.build(plainRec, t).facts), t);
  // trainee_b hail discipline stays 4 / 7 although the partner ignored two hails
  assert.deepEqual(plain(CGF.Report.build(rec, 'trainee_b').facts.events_by_competency.hail_discipline), { success: 4, fail: 7 });
});

test('partner: seeded history for a record with a partner has no partner entries', () => {
  const { CGF, fixtures } = load();
  const rec = withPartner(fixtures, 's_20261030_02');
  rec.session_id = 's_20261101_01';
  fixtures.history.sessions.push({ record: rec, profile_start: {}, means_end: {} });
  CGF.History._resetSeedCache();
  assert.deepEqual(plain(CGF.History.trainees().filter(t => t.startsWith('partner_'))), []);
});

// ------------------------------------------------------------ task 3: chart roles (R21)
test('charts: a missed event uses role miss, a focus area uses role focus (R21)', () => {
  const { CGF, fixtures } = load();
  const rec = recordOf(fixtures, 's_20261030_02');
  const entry = CGF.Report.entryFor(rec, CGF.Report.build(rec, 'trainee_b'));
  const prof = CGF.ReportCharts.profile(entry, null);
  assert.match(prof, /--rp-chart-focus/);
  assert.doesNotMatch(prof, /--rp-chart-miss/);          // the competencies chart never reads the miss role
  const tl = CGF.ReportCharts.timeline(rec, 'trainee_b');
  assert.match(tl, /--rp-chart-miss/);                   // the success-rate chart marks missed events with miss
  assert.doesNotMatch(tl, /--rp-chart-focus/);
});

// ------------------------------------------------------------ task 4: seeded history feeds partnerParams
test('seeded history gives Assess.partnerParams basis.source = history for trainee_a and trainee_b', () => {
  const { CGF } = load();
  for (const id of ['trainee_a', 'trainee_b']) {
    assert.ok(CGF.History.list(id).length >= 2, id + ' has real session records');
    const p = CGF.Assess.partnerParams({ trainee_id: id });
    assert.equal(p.basis.source, 'history', id);
    assert.ok(p.basis.sessions >= 2, id);
    assert.equal(p.basis.by_competency.hail_discipline, 'history', id);
  }
  // the numbers come from the counted events: trainee_b misses most hails, trainee_a rarely
  const a = CGF.Assess.partnerParams({ trainee_id: 'trainee_a' }), b = CGF.Assess.partnerParams({ trainee_id: 'trainee_b' });
  assert.ok(a.rates.hail_acknowledged > b.rates.hail_acknowledged);
});

// ------------------------------------------------------------ page tests (browser only): R18, R20, partner rows
const page = NODE ? { skip: 'needs a DOM: open tests/report/outstanding.html' } : {};
function renderRecord(rec) {
  history.replaceState(null, '', location.pathname + '#record=' + encodeURIComponent(JSON.stringify(rec)));
  window.CGF.uiReport.render();
  return document.getElementById('rpBody');
}

test('page: a single event reads met / missed with rp-result classes, never the session outcome classes (R20)', page, () => {
  const { fixtures } = load();
  const body = renderRecord(recordOf(fixtures, 's_20261030_02'));
  const cells = [...body.querySelectorAll('.rp-moments-events tbody tr')].map(tr => tr.lastElementChild);
  assert.ok(cells.length > 0);
  for (const td of cells) {
    assert.ok(/^(met|missed|—)$/.test(td.textContent), td.textContent);
    assert.ok(!/rp-outcome--/.test(td.className), td.className);
    if (td.textContent === 'met') assert.ok(td.classList.contains('rp-result--met'));
    if (td.textContent === 'missed') assert.ok(td.classList.contains('rp-result--missed'));
  }
  assert.ok(cells.some(td => td.textContent === 'missed') && cells.some(td => td.textContent === 'met'));
  // the session outcome chip keeps the session classes
  assert.ok(body.querySelector('.rp-session h2 .rp-outcome--success'));
});

test('page: wording is Focus area, never Needs work or weak (R18)', page, () => {
  const { fixtures } = load();
  const text = renderRecord(recordOf(fixtures, 's_20261030_02')).textContent;
  assert.ok(/Focus area/.test(text));
  assert.ok(!/needs (most )?work/i.test(text));
  assert.ok(!/\bweak\b/i.test(text));
});

test('page: headings show the session date, not the raw id (R18)', page, () => {
  const { fixtures } = load();
  const body = renderRecord(recordOf(fixtures, 's_20261030_02'));
  const heads = [...body.querySelectorAll('h2, h3, h4, summary')].map(h => h.textContent).join(' | ');
  assert.ok(/30 Oct 2026, run 2/.test(body.querySelector('h2').textContent));
  assert.ok(!/s_\d{8}_\d+/.test(heads), heads);
  assert.ok(!/s_\d{8}_\d+/.test(document.getElementById('rpSub').textContent));
});

test('page: the narrative is short lines and still passes the validator (R18)', page, () => {
  const { CGF, fixtures } = load();
  const rec = recordOf(fixtures, 's_20261030_02');
  const body = renderRecord(rec);
  const lis = [...body.querySelectorAll('section[data-trainee="trainee_b"] .rp-narrative-lines li')];
  assert.ok(lis.length >= 3);
  const r = CGF.Report.build(rec, 'trainee_b');
  assert.equal(lis.map(li => li.textContent).join(' '), r.narrative);   // the validated text, unchanged
  assert.deepEqual(plain(CGF.Report.validateNarrative(lis.map(li => li.textContent).join(' '), r.facts)), []);
});

test('page: the crew table lists the partner, and no trainee section is built for it', page, () => {
  const { fixtures } = load();
  const body = renderRecord(withPartner(fixtures, 's_20261030_02'));
  const row = body.querySelector('tr.rp-partner');
  assert.ok(row);
  assert.ok(/AI partner in the sensors seat, based on trainee_b/.test(row.textContent), row.textContent);
  assert.equal(body.querySelector('[data-trainee="partner_sensors"]'), null);
  assert.deepEqual([...body.querySelectorAll('.rp-trainee')].map(s => s.dataset.trainee), ['trainee_b', 'trainee_c11']);
  assert.ok(/1 AI partner/.test(body.querySelector('.rp-session > p.muted').textContent));
});
