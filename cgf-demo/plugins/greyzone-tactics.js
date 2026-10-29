// Example plugin: extra behaviours for grey-zone and swarm tactics.
// Plugins are plain script files listed in config.js; they register behaviours, factors or malfunctions.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  // The unit's position among the CGF units of its own force (0..n-1), used to spread a group out
  function slot(u) {
    const team = CGF.cgfs().filter(v => v.force === u.force);
    return { i: Math.max(0, team.indexOf(u)), n: Math.max(1, team.length) };
  }

  // Form a line across the ownship's path toward its objective (or ahead of its heading)
  CGF.registerBehaviour('block', (u, st, o) => {
    const goal = CGF.scenario.objective;
    const hdg = goal ? U.bearing(o, goal) : o.hdg, r = st.range || 1.5, { i, n } = slot(u);
    const ahead = { x: o.x + Math.sin(U.rad(hdg)) * r, y: o.y + Math.cos(U.rad(hdg)) * r };
    const off = (i - (n - 1) / 2) * 0.5, perp = U.rad(hdg + 90);
    const p = { x: ahead.x + Math.sin(perp) * off, y: ahead.y + Math.cos(perp) * off };
    const dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.3 ? u.maxSpd : o.spd, desired: dd < 0.3 ? U.bearing(u, o) : null };
  });

  // Circle the ownship at a set range, spread evenly around it
  CGF.registerBehaviour('swarm', (u, st, o, sim) => {
    const r = st.range || 2, { i, n } = slot(u);
    const omega = (6 / 3600) / r; // ~6 kts tangential
    const ang = sim.t * omega + i * 2 * Math.PI / n;
    const p = { x: o.x + Math.sin(ang) * r, y: o.y + Math.cos(ang) * r };
    const dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.3 ? u.maxSpd : Math.max(o.spd, 6) };
  });
})();
