// Scenario info tests (Devin's lane): the brief and scenario-line helpers behind design requests R25 and R26.
// Run from cgf-demo/:  node --test tests/runtime/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');

const IDS = ['strait-transit', 'border-patrol', 'airspace-patrol', 'sea-air', 'piracy-drill'];

test('a plain-string brief still renders as one paragraph', () => {
  const { CGF } = load();
  const b = CGF.briefOf({ brief: 'BLUE-1 transits north. Avoid escalation.' });
  assert.equal(b.structured, false);
  assert.equal(b.text, 'BLUE-1 transits north. Avoid escalation.');
  assert.equal(b.objective, '');
  assert.equal(CGF.briefOf({}).text, '');
  assert.equal(CGF.briefOf(null).structured, false);
});

test('a structured brief gives objective, situation list and constraints', () => {
  const { CGF } = load();
  const b = CGF.briefOf({ brief: { objective: 'Reach the exit.', situation: ['Red is west.', 'Black is east.'], constraints: 'Avoid escalation.' } });
  assert.equal(b.structured, true);
  assert.equal(b.objective, 'Reach the exit.');
  assert.deepEqual(Array.from(b.situation), ['Red is west.', 'Black is east.']);
  assert.equal(b.constraints, 'Avoid escalation.');
  assert.equal(b.text, 'Reach the exit. Red is west. Black is east. Avoid escalation.');
  // a single situation string and missing parts are tolerated
  const c = CGF.briefOf({ brief: { objective: 'Go.', situation: 'Calm.' } });
  assert.deepEqual(Array.from(c.situation), ['Calm.']);
  assert.equal(c.constraints, '');
});

test('shortName and domain fall back to the full name and to sea', () => {
  const { CGF } = load();
  assert.deepEqual({ ...CGF.scenarioInfo({ name: 'Full name here' }) }, { shortName: 'Full name here', domain: 'Sea' });
  assert.deepEqual({ ...CGF.scenarioInfo({ name: 'Full', shortName: 'Short', domain: 'air' }) }, { shortName: 'Short', domain: 'Air' });
});

test('every scenario has a short name, a domain and a structured brief with an objective', () => {
  const { CGF } = load();
  for (const id of IDS) {
    const S = CGF.scenarios[id];
    assert.ok(S, id + ' is registered');
    assert.ok(S.shortName && S.shortName.length < S.name.length, id + ' has a short name shorter than its name');
    const info = CGF.scenarioInfo(S), b = CGF.briefOf(S);
    assert.match(info.domain, /^(Sea|Air|Land)$/, id);
    assert.equal(b.structured, true, id + ' brief is structured');
    assert.ok(b.objective && b.situation.length && b.constraints, id + ' has all three parts');
  }
});

test('loading a scenario logs the brief as text, never "[object Object]"', () => {
  const { CGF } = load(), lines = [];
  CGF.on('log', t => lines.push(t));
  for (const id of IDS) CGF.loadScenario(id);
  const loaded = lines.filter(l => l.startsWith('Scenario loaded'));
  assert.equal(loaded.length, IDS.length);
  for (const l of loaded) assert.ok(!l.includes('[object'), l);
});
