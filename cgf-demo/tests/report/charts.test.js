// Debrief chart tests (Glenda's lane). Run from cgf-demo/:  node --test tests/report/*.test.js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['contracts/contracts.js', 'fixtures/profiles/roster.js', 'fixtures/platforms.js', 'fixtures/history/demo.js',
  'js/report/report.js', 'js/history/history.js', 'js/report/debrief.js', 'js/report/charts.js'];

function load() {
  const m = new Map();
  const ctx = { console, localStorage: { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.CGF;
}
const plain = v => JSON.parse(JSON.stringify(v));
const count = (svg, re) => (svg.match(re) || []).length;

test('series: pressure steps follow the adjustments that served the trainee', () => {
  const CGF = load();
  const s = CGF.ReportCharts.series(plain(CGF.History.record('s_20261030_02')), 'trainee_b');
  assert.equal(s.target, 'hail_discipline');
  assert.deepEqual(plain(s.steps.map(p => p.level)), [1, 2, 3, 4, 5, 4, 3, 2]);
  assert.equal(s.results.length, 11);
  assert.equal(s.results[0].rate, 0);
  assert.equal(s.results[s.results.length - 1].rate, 4 / 10);      // last 10 of FFFSFFSFSSF
});

test('timeline: one marker per result, failures as rings, valid single style attributes', () => {
  const CGF = load();
  const svg = CGF.ReportCharts.timeline(plain(CGF.History.record('s_20261030_02')), 'trainee_b');
  assert.equal(count(svg, /rp-chart-ev-ok/g), 4);
  assert.equal(count(svg, /rp-chart-ev-fail/g), 7);
  assert.equal(count(svg, /rp-chart-phase /g), 2);
  assert.equal(count(svg, /<[^>]*\sstyle="[^"]*"[^>]*\sstyle="/g), 0);
  assert.doesNotMatch(svg, /#[0-9a-f]{3,6}\b/i);                    // theme tokens only, no hard-coded colours
  assert.match(svg, /stroke:var\(--rp-chart-pressure, var\(--warn\)\)/);   // a role variable the design lane can set
});

test('timeline: fixed mode still plots the results but no pressure', () => {
  const CGF = load();
  const svg = CGF.ReportCharts.timeline(plain(CGF.History.record('s_20261021_02')), 'trainee_b');
  assert.match(svg, /No CGF adjustments served this trainee/);
  assert.ok(count(svg, /rp-chart-ev-/g) > 0);
});

test('profile and trend: one row per competency shown, one point per session plus next', () => {
  const CGF = load();
  const e = CGF.History.list('trainee_b').slice(-1)[0];
  const prof = CGF.ReportCharts.profile(e, CGF.Debrief.nextProfile('trainee_b').comps);
  assert.equal(count(prof, /class="rp-chart-start"/g), 5);
  assert.equal(count(prof, /class="rp-chart-next"/g), 5);
  const tr = CGF.ReportCharts.trend(CGF.History.list('trainee_b'), 'hail_discipline', 0.3);
  assert.equal(count(tr, /class="rp-chart-pt/g), 5);
  assert.equal(count(tr, /rp-chart-pt rp-chart-pressed"/g), 3);
});
