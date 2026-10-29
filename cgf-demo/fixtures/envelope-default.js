// Default instructor envelope (docs/INTERFACES.md §2). Editing it belongs to the Setup panel (Console C2).
// A .js fixture, not .json, because fetch() fails under file://.
(function () {
  'use strict';
  const F = window.CGF_FIXTURES = window.CGF_FIXTURES || {};
  F.envelopeDefault = {
    'aggression':            { min: 0.2, max: 0.8, base: 0.4 },
    'sensitivity':           { min: 0.3, max: 0.9, base: 0.5 },
    'reaction_delay_s':      { min: 2,   max: 20,  base: 8 },
    'weight.ignoredWarning': { min: 0.5, max: 2.0, base: 1.0 },
    'weight.cpa':            { min: 0.5, max: 2.0, base: 1.0 }
  };
})();
