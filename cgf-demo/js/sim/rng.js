// Seeded random numbers for anything inside the simulation that needs chance (scripted trainee crews).
// Never Math.random: the same seed must give the same run (CLAUDE.md invariant 3).
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  // mulberry32: small, fast, good enough for training-scenario dice rolls
  CGF.rng = seed => {
    let s = (seed >>> 0) || 0x9e3779b9;
    const next = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      chance: p => next() < p,
      between: (a, b) => a + (b - a) * next()
    };
  };
})();
