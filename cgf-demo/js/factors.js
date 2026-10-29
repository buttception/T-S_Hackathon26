// Built-in provocation factors. Each returns 0..1 for one CGF unit; the harness "weights" say how much
// each one moves that force's tension (per minute; negative = calming). Only factors named in a harness's
// weights are evaluated. Factors run only while the unit has detected the ownship, unless marked global.
// ctx = { u, own, sim, H (harness), S (scenario), R (harness ranges), d (range to ownship), U, CGF, detected }
// Add your own with CGF.registerFactor(name, { label, fn, global? }) in a plugin file.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, reg = CGF.registerFactor;

  const inOwnedZone = (ctx, kind) => ctx.S.zones.some(z => z.owner === ctx.u.force && z.kind === kind && U.pointInPoly(ctx.own.x, ctx.own.y, z.poly));

  // Closeness counts fully only while the OWNSHIP is closing on the unit; a CGF unit that chooses to shadow
  // close by should not keep provoking itself once the ownship is heading away.
  reg('proximity', { label: 'Proximity (ownship closing)', fn: c => {
    const closeness = (c.R.close - c.d) / c.R.close;
    if (closeness <= 0) return 0;
    const v = U.vel(c.own), dx = (c.u.x - c.own.x) / (c.d || 1e-6), dy = (c.u.y - c.own.y) / (c.d || 1e-6);
    const closing = U.clamp((v.x * dx + v.y * dy) / 10, 0, 1);
    return closeness * (0.25 + 0.75 * closing);
  } });

  reg('bowOn', { label: 'Bow pointed at them', fn: c => {
    const off = Math.abs(U.angDiff(U.bearing(c.own, c.u), c.own.hdg));
    return off < 20 && c.d < c.R.close * 1.5 && c.own.spd > 3 ? 1 - off / 20 : 0;
  } });

  reg('cpa', { label: 'Collision-course CPA', fn: c => {
    const { cpa, tcpa } = U.cpaCalc(c.own, c.u);
    return tcpa > 0 && tcpa < 900 && cpa < c.R.cpa ? 1 - cpa / c.R.cpa : 0;
  } });

  reg('territorial', { label: 'In their territorial waters', fn: c => inOwnedZone(c, 'territorial') ? 1 : 0 });
  reg('contiguous', { label: 'In their claimed zone', fn: c => !inOwnedZone(c, 'territorial') && inOwnedZone(c, 'contiguous') ? 1 : 0 });

  reg('fcRadar', { label: 'Fire-control radar on them', fn: c => c.sim.fcTarget === c.u ? 1 : 0 });

  reg('ignoredWarning', { label: 'Ignored radio warning', fn: c => c.u.warnPending && c.sim.t - c.u.warnTime > c.H.ignoreAfterSec ? 1 : 0 });

  reg('highSpeed', { label: 'High speed nearby', fn: c => c.own.spd > c.R.highSpeedKts && c.d < c.R.close ? 1 : 0 });

  reg('slowSpeed', { label: 'Slow speed (easy target)', fn: c => c.d < c.R.close && c.own.spd < c.R.slowSpeedKts ? 1 - c.own.spd / c.R.slowSpeedKts : 0 });

  reg('opening', { label: 'Opening range', fn: c => {
    const rr = U.rangeRate(c.own, c.u);
    return rr > 2 && c.d < c.R.close * 1.5 ? rr / 15 : 0;
  } });

  // Military activity nearby: armed CGF units at an escalated state, or the ownship using fire-control radar.
  // Sets u.threat to the strongest source so the "flee" behaviour knows which way to run.
  reg('conflict', { label: 'Military confrontation nearby', global: true, fn: c => {
    const { u, sim, R } = c;
    let best = 0, src = null;
    const consider = (p, intensity) => {
      const d = U.dist(u, p), score = intensity * U.clamp((R.conflictNm - d) / (R.conflictNm * 0.75), 0, 1);
      if (score > best) { best = score; src = { x: p.x, y: p.y }; }
    };
    let ownIntensity = sim.fcTarget ? 1 : 0;
    for (const v of CGF.cgfs()) {
      if (v === u || !CGF.harnessOf(v).armed) continue;
      const lvl = CGF.levelOf(v);
      if (lvl >= 0.5) {
        consider(v, lvl);
        if (U.dist(v, sim.own) < 6) ownIntensity = Math.max(ownIntensity, lvl); // the ownship is part of that confrontation
      }
    }
    if (ownIntensity > 0) consider(sim.own, ownIntensity);
    u.threat = src;
    return best;
  } });
})();
