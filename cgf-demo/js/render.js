// 2D plan-view renderer (canvas). Reads CGF.scenario and CGF.sim; never changes them.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  let ctx, W = 0, H = 0, scale = 1;
  const cam = { x: 0, y: 0 };
  const view = { half: 36 }; // half the visible map height/width, in scenario distance units

  const BACKGROUND = { sea: '#0a1726', land: '#141b12', air: '#0b1220' };
  const TERRAIN_FILL = { sea: '#1e2b22', land: '#1f2a1a', air: '#16202b' };
  const LANE_STYLE = {
    sea:  { color: 'rgba(0,226,0,.16)', width: 6, label: 'rgba(0,226,0,.7)' },
    land: { color: 'rgba(190,180,150,.35)', width: 4, label: 'rgba(210,200,170,.85)' },
    air:  { color: 'rgba(170,200,255,.22)', width: 3, dash: [10, 6], label: 'rgba(170,200,255,.8)' }
  };

  const toScreen = (x, y) => [W / 2 + (x - cam.x) * scale, H / 2 - (y - cam.y) * scale];
  const toWorld = (sx, sy) => ({ x: cam.x + (sx - W / 2) / scale, y: cam.y - (sy - H / 2) / scale });

  // ------------------------------------------------------------ camera
  // The instructor pans by dragging and zooms with the wheel; demos move the camera with focus() / overview().
  // A focus glides there; a focus on a unit keeps following it until the user pans or another focus is set.
  const glide = { follow: null, to: null, half: null, last: 0 };
  const ZOOM_MIN = 0.12, ZOOM_MAX = 2;   // zoom limits, as fractions of the scenario's default view

  const halfLimits = () => { const b = CGF.scenario.view.half; return [b * ZOOM_MIN, b * ZOOM_MAX]; };
  const fitScale = () => Math.min(W, H) / (2 * view.half);

  // target: a unit (followed), a {x, y} point, or a unit name. opts.half: zoom to this half-width (default: keep)
  function focus(target, opts) {
    if (typeof target === 'string') target = CGF.sim.units.find(u => u.name === target) || (target === 'own' ? CGF.sim.own : null);
    if (!target) return;
    const isUnit = target === CGF.sim.own || CGF.sim.units.includes(target);
    glide.follow = isUnit && !(opts && opts.follow === false) ? target : null;
    glide.to = { x: target.x, y: target.y };
    glide.half = opts && opts.half ? U.clamp(opts.half, ...halfLimits()) : null;
  }
  function overview() {
    glide.follow = null; glide.to = { x: 0, y: 0 }; glide.half = CGF.scenario.view.half;
  }
  // Drag: move the map with the pointer (screen pixels). Stops any focus or follow.
  function panBy(dx, dy) {
    glide.follow = null; glide.to = null;
    cam.x -= dx / scale; cam.y += dy / scale;
  }
  // Wheel: zoom by factor, keeping the map point under the pointer where it is
  function zoomAt(factor, sx, sy) {
    glide.half = null;
    const before = toWorld(sx, sy);
    view.half = U.clamp(view.half * factor, ...halfLimits());
    scale = fitScale();
    const after = toWorld(sx, sy);
    cam.x += before.x - after.x; cam.y += before.y - after.y;
    if (glide.follow) glide.follow = null;   // zooming at a point other than the followed unit stops following
  }
  function stepCamera() {
    const now = performance.now(), dt = glide.last ? Math.min(0.1, (now - glide.last) / 1000) : 0;
    glide.last = now;
    if (glide.follow) {
      if (glide.follow !== CGF.sim.own && !CGF.sim.units.includes(glide.follow)) glide.follow = null;
      else glide.to = { x: glide.follow.x, y: glide.follow.y };
    }
    const k = 1 - Math.exp(-4 * dt);   // smooth, frame-rate independent
    if (glide.to) {
      cam.x += (glide.to.x - cam.x) * k; cam.y += (glide.to.y - cam.y) * k;
      if (!glide.follow && Math.abs(glide.to.x - cam.x) + Math.abs(glide.to.y - cam.y) < view.half * 0.002) glide.to = null;
    }
    if (glide.half) {
      view.half += (glide.half - view.half) * k;
      if (Math.abs(glide.half - view.half) < glide.half * 0.002) { view.half = glide.half; glide.half = null; }
    }
  }

  function polyPath(poly) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath();
  }

  // Frame shapes after MIL-STD-2525 / APP-6 for each battle dimension:
  //   sea surface: friend circle, hostile/suspect diamond, neutral square, unknown quatrefoil
  //   land:        friend rectangle, hostile/suspect diamond, neutral square, unknown quatrefoil
  //   air:         the upper half of each frame (dome, peaked "tent", open square), open at the bottom
  function symbol(x, y, shape, size, domain) {
    ctx.beginPath();
    if (domain === 'air') {
      const s = size * 1.05;
      if (shape === 'circle') { ctx.arc(x, y + s * .35, s, Math.PI, 0); }
      else if (shape === 'diamond') { ctx.moveTo(x - s, y + s * .6); ctx.lineTo(x - s, y); ctx.lineTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * .6); }
      else if (shape === 'square') { ctx.moveTo(x - s * .8, y + s * .6); ctx.lineTo(x - s * .8, y - s * .8); ctx.lineTo(x + s * .8, y - s * .8); ctx.lineTo(x + s * .8, y + s * .6); }
      else { ctx.arc(x - s * .45, y, s * .45, Math.PI, 0); ctx.arc(x, y - s * .45, s * .45, Math.PI, 0); ctx.arc(x + s * .45, y, s * .45, Math.PI, 0); }
      return;
    }
    if (shape === 'diamond') { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); }
    else if (shape === 'square') ctx.rect(x - size * .8, y - size * .8, size * 1.6, size * 1.6);
    else if (shape === 'circle') { if (domain === 'land') ctx.rect(x - size * 1.2, y - size * .75, size * 2.4, size * 1.5); else ctx.arc(x, y, size, 0, Math.PI * 2); }
    else { const r = size * .5; for (const [dx, dy] of [[0, -r], [r, 0], [0, r], [-r, 0]]) { ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); } }
  }
  function drawIdentity(sx, sy, id, size, alphaFill, domain) {
    symbol(sx, sy, id.shape, size, domain);
    if (domain !== 'air') { ctx.fillStyle = U.hexA(id.light, alphaFill); ctx.fill(); }
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
  function leader(sx, sy, s) { // speed/heading leader: where the unit will be in view.leaderMin minutes
    const v = U.vel(s), m = CGF.scenario.view.leaderMin / 60;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + v.x * m * scale, sy - v.y * m * scale); ctx.stroke();
  }
  function dashedLine(a, b, color) {
    const [ax, ay] = toScreen(a.x, a.y), [bx, by] = toScreen(b.x, b.y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawOwn(x, y, alpha) {
    const S = CGF.scenario, own = CGF.sim.own, id = CGF.style.identity.friend, [sx, sy] = toScreen(x, y);
    const force = S.forces[own.force], domain = own.domain || S.domain;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = id.color; ctx.lineWidth = 2;
    leader(sx, sy, own);
    drawIdentity(sx, sy, id, 8, .35, domain);
    if (alpha === 1) {
      label(`${force.tag} ${own.name}`, sx + 11, sy - 4, id.light);
      ctx.strokeStyle = U.hexA(id.color, .55); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(U.rad(own.ordHdg)) * 26, sy - Math.cos(U.rad(own.ordHdg)) * 26); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  function draw(canvas, opts) {
    const S = CGF.scenario, sim = CGF.sim, V = S.view, k = CGF.rangeScale(), dist = S.unitLabels.dist;
    const dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width; H = r.height;
    stepCamera();
    scale = fitScale();
    const own = sim.own, shownOwn = CGF.displayedOwn(), instructor = opts && opts.instructor;
    const forceColor = key => (S.forces[key] && S.forces[key].color) || CGF.style.defaultForceColor;

    ctx.fillStyle = BACKGROUND[S.domain] || BACKGROUND.sea; ctx.fillRect(0, 0, W, H);

    // terrain (land masses at sea, lakes / forest / hills on land), then claimed zones by owning force
    for (const l of S.land) {
      polyPath(l.poly); ctx.fillStyle = l.fill || TERRAIN_FILL[S.domain]; ctx.fill();
      ctx.strokeStyle = l.stroke || '#3d5443'; ctx.lineWidth = 1; ctx.stroke();
    }
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
      const c = U.polyCentroid(l.poly);
      if (c && l.name) { const [lx, ly] = toScreen(c.x, c.y); ctx.fillStyle = l.owner ? U.hexA(forceColor(l.owner), .8) : 'rgba(180,190,200,.6)'; ctx.font = '12px Segoe UI, sans-serif'; ctx.fillText(l.name, lx - 20, ly); }
    }

    // routes: sea lanes, roads, airways
    const ls = LANE_STYLE[S.domain] || LANE_STYLE.sea;
    for (const lane of S.lanes) {
      const st = LANE_STYLE[lane.style] || ls;
      ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.setLineDash(st.dash || []);
      ctx.beginPath();
      lane.points.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.stroke(); ctx.setLineDash([]);
      if (lane.label) { const [x, y] = lane.labelAt || lane.points[0]; const [lx, ly] = toScreen(x, y); label(lane.label, lx + 6, ly, st.label); }
    }

    // grid
    ctx.strokeStyle = 'rgba(120,150,190,.08)'; ctx.lineWidth = 1;
    const ext = S.bounds * 1.1, g0 = -Math.ceil(ext / V.grid) * V.grid;
    for (let g = g0; g <= ext; g += V.grid) {
      let [a, b] = toScreen(g, -ext), [c, d] = toScreen(g, ext);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
      [a, b] = toScreen(-ext, g); [c, d] = toScreen(ext, g);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    }
    if (sim.fog) { ctx.fillStyle = 'rgba(160,175,190,.10)'; ctx.fillRect(0, 0, W, H); }

    // objective
    if (S.objective) {
      const [ox, oy] = toScreen(S.objective.x, S.objective.y);
      ctx.strokeStyle = '#4dd17a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, 1.5 * k * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy); ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6); ctx.stroke();
      label(S.objective.name || 'Objective', ox + 10, oy - 6, '#4dd17a');
    }

    // ownship range rings (centred on the displayed position)
    const [rx, ry] = toScreen(shownOwn.x, shownOwn.y), m = CGF.mods();
    ctx.strokeStyle = 'rgba(77,166,255,.18)'; ctx.lineWidth = 1;
    for (const rr of V.rings) {
      ctx.beginPath(); ctx.arc(rx, ry, rr * scale, 0, Math.PI * 2); ctx.stroke();
      label(`${rr} ${dist}`, rx + rr * scale * .71 + 2, ry - rr * scale * .71, 'rgba(140,180,230,.6)');
    }
    if (m.radarRangeNm < Infinity) {
      ctx.strokeStyle = 'rgba(255,179,71,.5)'; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(rx, ry, m.radarRangeNm * k * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // contacts (hidden by radar failure unless the instructor is looking); surface first, aircraft on top
    const ordered = sim.units.slice().sort((a, b) => (CGF.domainOf(a) === 'air') - (CGF.domainOf(b) === 'air'));
    for (const u of ordered) {
      const visible = CGF.visibleToTrainee(u);
      if (!visible && !instructor) continue;
      ctx.globalAlpha = visible ? 1 : 0.3;
      const id = CGF.identityOf(u), force = S.forces[u.force] || {}, tag = force.tag || '', domain = CGF.domainOf(u);
      drawTrack(u.track, id.color);
      const [sx, sy] = toScreen(u.x, u.y);
      ctx.strokeStyle = id.color; ctx.lineWidth = 1.5;
      leader(sx, sy, u);
      drawIdentity(sx, sy, id, u.role === 'cgf' && CGF.harnessOf(u).armed ? 7 : 6, .22, domain);
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
    const bar = V.grid * 2;
    ctx.strokeStyle = '#8aa0b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, H - 16); ctx.lineTo(14 + bar * scale, H - 16); ctx.stroke();
    label(`${bar} ${dist}`, 14, H - 22, '#8aa0b8');
    if (!sim.running && !sim.outcome) label(sim.t ? 'PAUSED' : 'PRESS START (or Space)', W / 2 - 60, H - 20, '#ffd166');
  }

  // Each scenario sets its own default zoom
  // Each scenario opens on its default view, centred on the map
  CGF.on('reset', () => {
    view.half = CGF.scenario.view.half; cam.x = 0; cam.y = 0;
    glide.follow = null; glide.to = null; glide.half = null;
  });

  CGF.render = { draw, toWorld, toScreen, view, cam, focus, overview, panBy, zoomAt, following: () => glide.follow };
})();
