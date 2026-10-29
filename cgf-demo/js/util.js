// Shared maths and helpers. No dependencies. Units: nautical miles, knots, degrees (0 = north, clockwise), seconds.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm360 = a => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => { let d = norm360(a - b); if (d > 180) d -= 360; return d; }; // a relative to b, -180..180
  const bearing = (a, b) => norm360(deg(Math.atan2(b.x - a.x, b.y - a.y)));
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const vel = s => ({ x: Math.sin(rad(s.hdg)) * s.spd, y: Math.cos(rad(s.hdg)) * s.spd }); // kts
  const pad3 = n => String(Math.round(norm360(n)) % 360).padStart(3, '0');

  // Closest point of approach between a and b: distance (nm) and time (s, negative = already passed)
  function cpaCalc(a, b) {
    const rx = b.x - a.x, ry = b.y - a.y, va = vel(a), vb = vel(b);
    const vx = (vb.x - va.x) / 3600, vy = (vb.y - va.y) / 3600, vv = vx * vx + vy * vy;
    if (vv < 1e-12) return { cpa: Math.hypot(rx, ry), tcpa: 0 };
    const t = -(rx * vx + ry * vy) / vv, tt = Math.max(t, 0);
    return { cpa: Math.hypot(rx + vx * tt, ry + vy * tt), tcpa: t };
  }
  // Range rate in knots, positive = opening
  function rangeRate(a, b) {
    const rx = b.x - a.x, ry = b.y - a.y, d = Math.hypot(rx, ry) || 1e-6, va = vel(a), vb = vel(b);
    return ((vb.x - va.x) * rx + (vb.y - va.y) * ry) / d;
  }
  function pointInPoly(x, y, poly) {
    if (!poly || poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function turnToward(s, desired, dt, turnRate) {
    const d = angDiff(desired, s.hdg), step = (turnRate != null ? turnRate : s.turnRate || 1) * dt;
    s.hdg = norm360(s.hdg + clamp(d, -step, step));
  }
  function accelToward(s, target, dt, maxSpd) {
    target = clamp(target, 0, maxSpd != null ? maxSpd : s.maxSpd);
    const a = (s.accel || 0.25) * dt;
    s.spd += clamp(target - s.spd, -a, a);
  }
  function move(s, dt) { const v = vel(s); s.x += v.x * dt / 3600; s.y += v.y * dt / 3600; }
  function polyCentroid(poly) {
    if (!poly || !poly.length) return null;
    const s = poly.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
    return { x: s[0] / poly.length, y: s[1] / poly.length };
  }

  const fmtTime = t => {
    const s = Math.floor(8 * 3600 + t);
    return [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  };
  const fmtDur = t => `${Math.floor(t / 60)}m ${String(Math.floor(t % 60)).padStart(2, '0')}s`;
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Classic <script> injection works from file://, unlike fetch() or ES modules.
  const loadScript = src => new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('could not load ' + src));
    document.head.appendChild(el);
  });

  CGF.util = { rad, deg, clamp, norm360, angDiff, bearing, dist, vel, pad3, cpaCalc, rangeRate, pointInPoly,
    turnToward, accelToward, move, polyCentroid, fmtTime, fmtDur, hexA, esc, loadScript };
})();
