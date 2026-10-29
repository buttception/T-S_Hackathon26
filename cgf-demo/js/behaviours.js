// Built-in movement behaviours. A harness state names one of these in its "behaviour" field.
// Signature: fn(unit, state, ownship, sim) => { tx, ty, spd, desired? }
//   tx, ty  = point to steer toward (nm)      spd = target speed (kts)
//   desired = heading to hold instead of steering to (tx, ty)
// Add your own with CGF.registerBehaviour(name, fn) in a plugin file.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, reg = CGF.registerBehaviour;

  const offsetPoint = (o, angle, r) => ({ x: o.x + Math.sin(U.rad(angle)) * r, y: o.y + Math.cos(U.rad(angle)) * r });

  // Keep station on the ownship's beam (shadow) or quarter (escort), on whichever side the unit is already on.
  function station(u, o, r, angleOff) {
    const side = U.angDiff(U.bearing(o, u), o.hdg) >= 0 ? 1 : -1;
    const p = offsetPoint(o, o.hdg + side * angleOff, r);
    const dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.5 ? u.maxSpd * U.clamp(dd / 3, 0.4, 1) : o.spd, desired: dd < 0.5 ? o.hdg : null };
  }

  // Units that sail off the map re-enter at the opposite edge
  const wrap = u => {
    if (u.y > 48) u.y = -48; if (u.y < -48) u.y = 48;
    if (u.x > 48) u.x = -48; if (u.x < -48) u.x = 48;
  };

  reg('hold', u => ({ tx: u.x, ty: u.y, spd: 0, desired: u.hdg }));

  // Straight line at cruise speed, wrapping at the map edge
  reg('transit', u => { wrap(u); return { desired: u.hdg, spd: u.cruiseSpd }; });

  // Follow a sea lane / route of waypoints at cruise speed; restart at the first waypoint when done
  reg('lane', (u, st) => {
    const r = u.route;
    if (!r || !r.length) { wrap(u); return { desired: u.hdg, spd: u.cruiseSpd }; }
    if (u.wpIdx >= r.length) { u.wpIdx = 0; [u.x, u.y] = r[0]; u.track = []; }
    const [tx, ty] = r[u.wpIdx];
    if (Math.hypot(tx - u.x, ty - u.y) < 1) u.wpIdx++;
    return { tx, ty, spd: u.cruiseSpd * (st.speedMult || 1) };
  });

  // Cycle through patrol waypoints
  reg('patrol', (u, st) => {
    const p = u.patrol && u.patrol.length ? u.patrol : [[u.x, u.y]];
    const [tx, ty] = p[u.wpIdx % p.length];
    if (Math.hypot(tx - u.x, ty - u.y) < 0.8) u.wpIdx++;
    return { tx, ty, spd: (u.patrolSpd || 10) * (st.speedMult || 1) };
  });

  reg('shadow', (u, st, o) => station(u, o, st.range || 5, 100));
  reg('escort', (u, st, o) => station(u, o, st.range || 3, 120));

  // Cut across the ownship's bow
  reg('harass', (u, st, o) => {
    const p = offsetPoint(o, o.hdg, st.range || 1.2);
    return { tx: p.x, ty: p.y, spd: u.maxSpd };
  });

  // Hold a set range from the ownship, bow on
  reg('posture', (u, st, o) => {
    const p = offsetPoint(o, U.bearing(o, u), st.range || 4), dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.5 ? u.maxSpd * U.clamp(dd / 3, 0.3, 1) : Math.max(o.spd, 4), desired: dd < 1 ? U.bearing(u, o) : null };
  });

  // Close straight in on the ownship and hold at a given range
  reg('approach', (u, st, o) => {
    const r = st.range != null ? st.range : 0.5, p = offsetPoint(o, U.bearing(o, u), r), dd = U.dist(u, p);
    return { tx: p.x, ty: p.y, spd: dd > 0.3 ? u.maxSpd : o.spd, desired: dd < 0.3 ? o.hdg : null };
  });

  // Run away from the threat the "conflict" factor found (or from the ownship), then resume the lane once calm
  reg('flee', (u, st, o) => {
    const src = u.threat || o;
    const away = U.bearing(src, u);
    return { desired: away, spd: u.maxSpd * (st.speedMult || 1) };
  });
})();
