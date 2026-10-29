// Rule policy v1 (PLAN E4, policy "rules_v1"): which CGF settings exercise which competency, and how far one
// evaluation cycle may move them. Pure: no simulation or DOM access.
//
// "up" raises difficulty: each setting moves one step toward its harder envelope bound.
// "down" eases it: each setting moves one step back toward the envelope base (never past it).
// Settings with no entry in the instructor's envelope are never touched (INTERFACES §2).
(function () {
  'use strict';
  const CGF = window.CGF;
  const C = () => CGF.adaptClamp;

  // Competency -> settings that put pressure on it: defined once in js/adapt/predict.js, shared with the allocation page
  const TACTICS = window.Adapt.TACTICS;

  const STEP = 0.2;                            // fraction of the base-to-bound span moved per change
  const COOLDOWN_CYCLES = 2;                   // a setting changes at most once every this many cycles
  const PROBE_CEILING = 0.5;                   // without live evidence, push at most this far from base to bound
  const INTENSITY = { low: 0.5, medium: 1, high: 1.5 };
  const round = v => Math.round(v * 1000) / 1000;

  // One step for one setting. Returns the requested value (before clamping), or null for no change.
  // probe: no live evidence yet, so raise exposure only up to PROBE_CEILING of the way to the harder bound.
  function stepValue(setting, current, entry, direction, intensity, probe) {
    const sign = C().harderSign(setting), bound = sign > 0 ? entry.max : entry.min;
    const step = Math.abs(bound - entry.base) * STEP * (INTENSITY[intensity] || 1);
    if (!step) return null;
    if (direction === 'up') {
      const limit = probe ? entry.base + (bound - entry.base) * PROBE_CEILING : bound;
      if (sign > 0 ? current >= limit : current <= limit) return null;
      const next = current + sign * step;
      return round(sign > 0 ? Math.min(next, probe ? limit : next) : Math.max(next, probe ? limit : next));
    }
    if (direction === 'down') {
      if (current === entry.base) return null;
      const towardBase = current > entry.base ? -1 : 1;
      const next = current + towardBase * step;
      return round(towardBase < 0 ? Math.max(entry.base, next) : Math.min(entry.base, next));
    }
    return null;
  }

  // The settings a seat's request touches: its target competency's tactics that the envelope allows
  const settingsFor = (competency, envelope) => (TACTICS[competency] || []).filter(s => envelope[s]);

  CGF.adaptPolicy = { id: 'rules_v1', TACTICS, STEP, COOLDOWN_CYCLES, PROBE_CEILING, INTENSITY, stepValue, settingsFor };
})();
