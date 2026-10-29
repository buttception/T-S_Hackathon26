// Envelope clamp (PLAN E3): a pure function. Every value the adaptation engine produces passes through it
// before it can reach the simulation (CLAUDE.md invariant 1: no CGF setting ever leaves its envelope).
(function () {
  'use strict';
  const CGF = window.CGF;

  // entry: {min, max, base} from the instructor's envelope (INTERFACES §2)
  // Returns { value, clamped }: value inside [min, max]; clamped is true when the request had to be cut back.
  function clamp(requested, entry) {
    if (!entry || typeof requested !== 'number' || !Number.isFinite(requested)) return { value: entry ? entry.base : requested, clamped: true };
    const value = Math.min(entry.max, Math.max(entry.min, requested));
    return { value, clamped: value !== requested };
  }

  // Settings where a LOWER value makes the CGFs harder on the trainee (quicker to react, slower to calm down)
  const LOWER_IS_HARDER = { reaction_delay_s: true, calm_down_rate: true };
  const harderSign = setting => (LOWER_IS_HARDER[setting] ? -1 : 1);

  CGF.adaptClamp = { clamp, harderSign };
})();
