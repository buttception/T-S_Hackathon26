// Built-in movement behaviours. A harness state names one of these in its "behaviour" field.
// Signature: fn(unit, state, ownship, sim) => { tx, ty, spd, desired? }
//   tx, ty  = point to steer toward      spd = target speed
//   desired = heading to hold instead of steering to (tx, ty)
// Distances (state "range" and internal tolerances) are multiplied by the scenario's range scale,
// so the same harness works for ships, ground vehicles and aircraft.
// Add your own with CGF.registerBehaviour(name, fn) in a plugin file.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, reg = CGF.registerBehaviour;

  const k = () => CGF.rangeScale();
  const offsetPoint = (o, angle, r) => ({ x: o.x + Math.sin(U.rad(angle)) * r, y: o.y + Math.cos(U.rad(angle)) * r });

  // Keep station on the ownship's beam (shadow) or quarter (escort), on whichever side the unit is already on.
  // With teamwork of 0.5 or more (js/sim/team.js), units of one force on station together split the bearings
  // between them: one on each beam, then astern, then the quarters, instead of all crowding the nearest side.
  const TEAM_SLOTS = [1, -1, 1.8, 0.5, -0.5];
  function station(u, o, r, angleOff) {
    let bearingOff;
    if (CGF.teamworkOf && CGF.teamworkOf(u.force) >= 0.5) {
      const team = CGF.cgfs().filter(v => v.force === u.force && ['shadow', 'escort'].includes((CGF.stateOf(v) || {}).behaviour))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
      const i = Math.max(0, team.indexOf(u));
      bearingOff = team.length > 1 ? TEAM_SLOTS[i % TEAM_SLOTS.length] * angleOff : null;
    }
    if (bearingOff == null) bearingOff = (U.angDiff(U.bearing(o, u), o.hdg) >= 0 ? 1 : -1) * angleOff;
    const p = offsetPoint(o, o.hdg + bearingOff, r), tol = 0.5 * k();
    const dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > tol ? u.maxSpd * U.clamp(dd / (3 * k()), 0.4, 1) : o.spd, desired: dd < tol ? o.hdg : null };
  }

  // Units that leave the map re-enter at the opposite edge
  const wrap = u => {
    const b = CGF.scenario.bounds;
    if (u.y > b) u.y = -b; if (u.y < -b) u.y = b;
    if (u.x > b) u.x = -b; if (u.x < -b) u.x = b;
  };

  reg('hold', u => ({ tx: u.x, ty: u.y, spd: 0, desired: u.hdg }));

  // Straight line at cruise speed, wrapping at the map edge
  reg('transit', u => { wrap(u); return { desired: u.hdg, spd: u.cruiseSpd }; });

  // Follow a route (sea lane, road, airway) at cruise speed; restart at the first waypoint when done
  reg('lane', (u, st) => {
    const r = u.route;
    if (!r || !r.length) { wrap(u); return { desired: u.hdg, spd: u.cruiseSpd }; }
    if (u.wpIdx >= r.length) { u.wpIdx = 0; [u.x, u.y] = r[0]; u.track = []; }
    const [tx, ty] = r[u.wpIdx];
    if (Math.hypot(tx - u.x, ty - u.y) < 1 * k()) u.wpIdx++;
    return { tx, ty, spd: u.cruiseSpd * (st.speedMult || 1) };
  });

  // Cycle through patrol waypoints
  reg('patrol', (u, st) => {
    const p = u.patrol && u.patrol.length ? u.patrol : [[u.x, u.y]];
    const [tx, ty] = p[u.wpIdx % p.length];
    if (Math.hypot(tx - u.x, ty - u.y) < 0.8 * k()) u.wpIdx++;
    return { tx, ty, spd: (u.patrolSpd || 10) * (st.speedMult || 1) };
  });

  reg('shadow', (u, st, o) => station(u, o, (st.range || 5) * k(), 100));
  reg('escort', (u, st, o) => station(u, o, (st.range || 3) * k(), 120));

  // Cut across the ownship's path
  reg('harass', (u, st, o) => {
    const p = offsetPoint(o, o.hdg, (st.range || 1.2) * k());
    return { tx: p.x, ty: p.y, spd: u.maxSpd };
  });

  // Hold a set range from the ownship, facing it. If the ownship is leaving (heading away from this unit), hold
  // ground instead of pursuing, so the range can open and the unit can stand down once the threat has gone.
  reg('posture', (u, st, o) => {
    const leaving = o.spd > 2 * CGF.speedScale() && Math.abs(U.angDiff(o.hdg, U.bearing(u, o))) < 80;
    if (leaving) return { tx: u.x, ty: u.y, spd: 0, desired: U.bearing(u, o) };
    const p = offsetPoint(o, U.bearing(o, u), (st.range || 4) * k()), dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.5 * k() ? u.maxSpd * U.clamp(dd / (3 * k()), 0.3, 1) : Math.max(o.spd, 4 * CGF.speedScale()),
      desired: dd < 1 * k() ? U.bearing(u, o) : null };
  });

  // Close straight in on the ownship and hold at a given range
  reg('approach', (u, st, o) => {
    const r = (st.range != null ? st.range : 0.5) * k(), p = offsetPoint(o, U.bearing(o, u), r), dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.3 * k() ? u.maxSpd : o.spd, desired: dd < 0.3 * k() ? o.hdg : null };
  });

  // Run away from the threat the "conflict" factor found (or from the ownship); resumes its route once calm
  reg('flee', (u, st, o) => {
    const src = u.threat || o;
    return { desired: U.bearing(src, u), spd: u.maxSpd * (st.speedMult || 1) };
  });
})();
