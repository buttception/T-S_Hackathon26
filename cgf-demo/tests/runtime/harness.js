// Loads the runtime's browser scripts into a Node vm context so node:test can drive the simulation headless.
// No DOM: only the engine, content, fixtures, sim modules and adaptation layer are loaded (no render or UI).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

const SCRIPTS = [
  'js/util.js', 'js/engine.js', 'js/behaviours.js', 'js/factors.js', 'js/malfunctions.js',
  'plugins/greyzone-tactics.js',
  'harnesses/hostile-state.js', 'harnesses/non-hostile-state.js', 'harnesses/grey-zone.js', 'harnesses/raiders.js', 'harnesses/civil-traffic.js',
  'scenarios/strait-transit.js', 'scenarios/border-patrol.js', 'scenarios/airspace-patrol.js', 'scenarios/sea-air.js', 'projects/piracy-drill/scenario.js',
  'contracts/contracts.js', 'fixtures/platforms.js', 'fixtures/profiles/roster.js', 'fixtures/envelope-default.js',
  'js/sim/rng.js', 'js/sim/events.js', 'js/sim/apply.js', 'js/sim/crew-agent.js',
  'trainees/strong.js', 'trainees/weak_hail_discipline.js',
  'js/llm.js',
  'js/adapt/predict.js', 'js/adapt/clamp.js', 'js/adapt/policy-rules.js', 'js/adapt/adapt.js', 'js/adapt/steer.js', 'js/adapt/runtime.js',
  'js/ui-reasoning.js'
];

// A fresh, isolated runtime. Returns its window (window.CGF is the runtime).
function load(extra) {
  const store = {};
  const window = {
    console,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { search: '' },
    setTimeout, clearTimeout,
    performance: { now: () => 0 }
  };
  window.window = window;
  const ctx = vm.createContext(window);
  for (const rel of SCRIPTS.concat(extra || [])) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;   // lets early tests run before every module exists
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel });
  }
  return window;
}

// A §3 scenario config for one pane
function config(over) {
  return Object.assign({
    scenario_id: 'test_B', scenario: 'strait-transit', seed: 1234, mode: 'adaptive', duration_s: 1200, eval_interval_s: 30,
    envelope: {
      aggression: { min: 0.6, max: 2.0, base: 1.0 },
      sensitivity: { min: 0.6, max: 2.0, base: 1.0 },
      reaction_delay_s: { min: 5, max: 60, base: 30 },
      'weight.ignoredWarning': { min: 0.5, max: 2.5, base: 1.0 },
      'weight.cpa': { min: 0.5, max: 2.0, base: 1.0 }
    },
    platform: { type: 'warship', model: 'formidable' },
    crew: [
      { seat: 'weapons', trainee_id: 'trainee_c05', agent_profile: 'trainees/strong.js' },
      { seat: 'sensors', trainee_id: 'trainee_c08', agent_profile: 'trainees/strong.js' },
      { seat: 'navigation', trainee_id: 'trainee_b', agent_profile: 'trainees/weak_hail_discipline.js' }
    ]
  }, over || {});
}

module.exports = { load, config, ROOT };
