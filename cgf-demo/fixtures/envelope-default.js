// Default instructor envelope (docs/INTERFACES.md §2). The instructor edits it on the allocation page.
// A .js fixture, not .json, because fetch() fails under file://.
//
// Raised 2026-10-29 (JL, Devin's decision C) so linked CGFs start as lively as the runtime's own defaults (1.0) and
// can be pushed in both directions. The first block mirrors LOCAL_ENVELOPE in js/adapt/runtime.js. The factor-weight
// multipliers default to 1.0 by definition, and every setting a competency's tactic nudges (js/adapt/predict.js
// TACTICS) needs an entry here, otherwise the policy cannot adjust it. calm_down_rate (runtime default 1, CGF.params.decay)
// and detection (runtime default 20 nm, CGF.params.detection) were added once those defaults were read from js/engine.js.
(function () {
  'use strict';
  const F = window.CGF_FIXTURES = window.CGF_FIXTURES || {};
  F.envelopeDefault = {
    'aggression':            { min: 0.6, max: 2.0, base: 1.0 },
    'sensitivity':           { min: 0.6, max: 2.0, base: 1.0 },
    'reaction_delay_s':      { min: 5,   max: 60,  base: 30 },
    'calm_down_rate':        { min: 0.5, max: 2.0, base: 1.0 },
    'detection':             { min: 10,  max: 30,  base: 20 },
    'weight.ignoredWarning': { min: 0.5, max: 2.5, base: 1.0 },
    'weight.cpa':            { min: 0.5, max: 2.0, base: 1.0 },
    'weight.proximity':      { min: 0.5, max: 2.0, base: 1.0 },
    'weight.territorial':    { min: 0.5, max: 2.0, base: 1.0 },
    'weight.contiguous':     { min: 0.5, max: 2.0, base: 1.0 },
    'weight.fcRadar':        { min: 0.5, max: 2.0, base: 1.0 },
    'weight.slowSpeed':      { min: 0.5, max: 2.0, base: 1.0 }
  };
})();
