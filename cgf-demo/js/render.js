// 2D plan-view renderer (canvas). Reads CGF.scenario and CGF.sim; never changes them.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  let ctx, W = 0, H = 0, scale = 1;
  const cam = { x: 0, y: 0 };
  const view = { half: 36 }; // half the visible map height/width in nm

  const toScreen = (x, y) => [W / 2 + (x - cam.x) * scale, H / 2 - (y - cam.y) * scale];
  const toWorld = (sx, sy) => ({ x: cam.x + (sx - W / 2) / scale, y: cam.y - (sy - H / 2) / scale });

  function polyPath(poly) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath();
  }
  // Sea-surface frame shapes after MIL-STD-2525 / APP-6: friend circle, hostile/suspect diamond,
  // neutral square, unknown quatrefoil. Colour and dashed frame come from the identity entry.
  function symbol(x, y, shape, size) {
    ctx.beginPath();
    if (shape === 'diamond') { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); }
    else if (shape === 'square') ctx.rect(x - size * .8, y - size * .8, size * 1.6, size * 1.6);
    else if (shape === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
    else { const r = size * .5; for (const [dx, dy] of [[0, -r], [r, 0], [0, r], [-r, 0]]) { ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); } }
  }
  function drawIdentity(sx, sy, id, size, alphaFill) {
    symbol(sx, sy, id.shape, size);
    ctx.fillStyle = U.hexA(id.light, alphaFill); ctx.fill();
    ctx.strokeStyle = id.color; ctx.lineWidth = 1.8;
    if (id.dashed) ctx.setLineDash([3, 2]);
    ctx.stroke(); ctx.setLineDash([]);
  }
  function label(text, x, y, color) {
    ctx.font = '11px Consolas, monospace';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(8,16,26,.78)'; ctx.fillRect(x - 2, y - 10, w + 4, 13);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function drawTrack(track, color) {
    ctx.fillStyle = U.hexA(color, .35);
    for (const [x, y] of track) { const [sx, sy] = toScreen(x, y); ctx.fillRect(sx - 1, sy - 1, 2, 2); }
  }
  function leader(sx, sy, s) { // 6-minute speed/heading leader
    const v = U.vel(s);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + v.x * 0.1 * scale, sy - v.y * 0.1 * scale); ctx.stroke();
  }
  function dashedLine(a, b, color) {
    const [ax, ay] = toScreen(a.x, a.y), [bx, by] = toScreen(b.x, b.y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawOwn(x, y, alpha) {
    const sim = CGF.sim, own = sim.own, id = CGF.style.identity.friend, color = id.color, [sx, sy] = toScreen(x, y);
    const force = CGF.scenario.forces[own.force];
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    leader(sx, sy, own);
    drawIdentity(sx, sy, id, 8, .35);
    if (alpha === 1) {
      label(`${force.tag} ${own.name}`, sx + 11, sy - 4, id.light);
      ctx.strokeStyle = U.hexA(color, .55); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(U.rad(own.ordHdg)) * 26, sy - Math.cos(U.rad(own.ordHdg)) * 26); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  function draw(canvas, opts) {
    const S = CGF.scenario, sim = CGF.sim;
    const dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width; H = r.height; scale = Math.min(W, H) / (2 * view.half);
    const own = sim.own, shownOwn = CGF.displayedOwn(), instructor = opts && opts.instructor;
    const forceColor = k => (S.forces[k] && S.forces[k].color) || CGF.style.defaultForceColor;

    ctx.fillStyle = '#0a1726'; ctx.fillRect(0, 0, W, H);

    // claimed zones (contiguous first, then territorial), coloured by owning force
    for (const kind of ['contiguous', 'territorial']) {
      for (const z of S.zones.filter(z => z.kind === kind)) {
        const c = forceColor(z.owner);
        polyPath(z.poly);
        ctx.fillStyle = U.hexA(c, kind === 'territorial' ? .09 : .05); ctx.fill();
        if (kind === 'contiguous') ctx.setLineDash([6, 6]);
        ctx.strokeStyle = U.hexA(c, kind === 'territorial' ? .7 : .45); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    for (const l of S.land) {
      polyPath(l.poly); ctx.fillStyle = '#1e2b22'; ctx.fill(); ctx.strokeStyle = '#3d5443'; ctx.stroke();
      const c = U.polyCentroid(l.poly);
      if (c && l.name) { const [lx, ly] = toScreen(c.x, c.y); ctx.fillStyle = U.hexA(forceColor(l.owner), .8); ctx.font = '12px Segoe UI, sans-serif'; ctx.fillText(l.name, lx - 20, ly); }
    }

    // sea lanes
    ctx.strokeStyle = 'rgba(77,209,122,.18)'; ctx.lineWidth = 6;
    for (const lane of S.lanes) {
      ctx.beginPath();
      lane.points.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.stroke();
    }
    if (S.lanes.length) { const [lx, ly] = toScreen(S.lanes[0].points[0][0], -40); label('SLOC', lx - 34, ly, 'rgba(77,209,122,.7)'); }

    // grid
    ctx.strokeStyle = 'rgba(120,150,190,.08)'; ctx.lineWidth = 1;
    for (let g = -50; g <= 50; g += 5) {
      let [a, b] = toScreen(g, -50), [c, d] = toScreen(g, 50);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
      [a, b] = toScreen(-50, g); [c, d] = toScreen(50, g);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    }
    if (sim.fog) { ctx.fillStyle = 'rgba(160,175,190,.10)'; ctx.fillRect(0, 0, W, H); }

    // objective
    if (S.objective) {
      const [ox, oy] = toScreen(S.objective.x, S.objective.y);
      ctx.strokeStyle = '#4dd17a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, 1.5 * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy); ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6); ctx.stroke();
      label(S.objective.name || 'Objective', ox + 10, oy - 6, '#4dd17a');
    }

    // ownship range rings (centred on the displayed position)
    const [rx, ry] = toScreen(shownOwn.x, shownOwn.y), m = CGF.mods();
    ctx.strokeStyle = 'rgba(77,166,255,.18)'; ctx.lineWidth = 1;
    for (const rr of [5, 10]) {
      ctx.beginPath(); ctx.arc(rx, ry, rr * scale, 0, Math.PI * 2); ctx.stroke();
      label(rr + ' nm', rx + rr * scale * .71 + 2, ry - rr * scale * .71, 'rgba(140,180,230,.6)');
    }
    if (m.radarRangeNm < Infinity) {
      ctx.strokeStyle = 'rgba(255,179,71,.5)'; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(rx, ry, m.radarRangeNm * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // contacts (hidden by radar failure unless the instructor is looking)
    for (const u of sim.units) {
      const visible = CGF.visibleToTrainee(u);
      if (!visible && !instructor) continue;
      ctx.globalAlpha = visible ? 1 : 0.3;
      const id = CGF.identityOf(u), force = S.forces[u.force] || {}, tag = force.tag || '';
      drawTrack(u.track, id.color);
      const [sx, sy] = toScreen(u.x, u.y);
      ctx.strokeStyle = id.color; ctx.lineWidth = 1.5;
      leader(sx, sy, u);
      drawIdentity(sx, sy, id, u.role === 'cgf' && CGF.harnessOf(u).armed ? 7 : 6, .22);
      if (u === sim.selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.stroke(); }
      if (u.role === 'cgf') {
        const st = CGF.stateOf(u), sc = CGF.stateColor(u);
        label(`${tag} ${u.name} · ${st.name}`, sx + 11, sy - 4, u.stateIdx ? sc : id.light);
        ctx.fillStyle = '#1c2b40'; ctx.fillRect(sx + 11, sy + 2, 50, 4);
        ctx.fillStyle = sc; ctx.fillRect(sx + 11, sy + 2, 50 * u.tension / 100, 4);
        if (st.fcRadar) dashedLine(u, own, '#ff3b3b');
      } else label(`${tag} ${u.name}`, sx + 9, sy - 4, U.hexA(id.light, .85));
      ctx.globalAlpha = 1;
    }
    if (sim.fcTarget) dashedLine(own, sim.fcTarget, CGF.style.identity.friend.color);

    // ownship as displayed by its (possibly drifting) navigation; instructor also sees the truth
    drawTrack(own.track.map(([x, y]) => [x + sim.gpsDrift.x, y + sim.gpsDrift.y]), CGF.style.identity.friend.color);
    drawOwn(shownOwn.x, shownOwn.y, 1);
    if (instructor && (sim.gpsDrift.x || sim.gpsDrift.y)) {
      drawOwn(own.x, own.y, 0.45);
      const [tx, ty] = toScreen(own.x, own.y);
      label('TRUE POSITION (instructor)', tx + 10, ty + 16, '#d7a8ff');
    }

    // scale bar and pause hint
    ctx.strokeStyle = '#8aa0b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, H - 16); ctx.lineTo(14 + 10 * scale, H - 16); ctx.stroke();
    label('10 nm', 14, H - 22, '#8aa0b8');
    if (!sim.running && !sim.outcome) label(sim.t ? 'PAUSED' : 'PRESS START (or Space)', W / 2 - 60, H - 20, '#ffd166');
  }

  CGF.render = { draw, toWorld, toScreen, view, cam };
})();
