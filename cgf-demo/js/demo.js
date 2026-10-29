// Hands-off demo runner. A demo is a scripted list of steps that drive both the trainee and the
// instructor, with a caption for the audience. Demo scripts live in demos/*.js and call CGF.registerDemo.
//
// Step fields (all optional):
//   caption  text shown over the map (and written to the event log)
//   do(api)  run once when the step starts
//   prompt   an instructor prompt, typed visibly into the Instructor command box and then sent the same
//            way the instructor's would be: to the local LLM if enabled, otherwise the keyword parser
//   fallback keyword-parser version of the prompt, used if the LLM is off or unavailable
//            (e.g. prompt "calm everyone down", fallback "calm R-F1; calm R-F2")
//   until(api) => bool   step waits until this is true...
//   hold     ...and at least this many REAL seconds have passed (counted after the prompt has run)
//   timeout  ...or give up after this many REAL seconds
//   speed    simulation speed for this step (time scale, sim seconds per real second): fast through quiet
//            stretches, slow at the moments that matter
//   focus    camera target for this step: a unit name, 'own', or {x, y}; zoom: the view half-width to glide to
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;
  const TYPE_MS = 45; // per character, so the audience can read the prompt as it is typed

  // Demo-level fields (besides id, name, scenario, mode, params, steps):
  //   places: { <scenario id>: [x, y, hdg] }  where BLUE-1 starts whenever the demo loads or restarts that scenario,
  //           nearer the action than the scenario's default start (the maps are large)
  //   view:   { zoom }  the camera follows BLUE-1 at this half-width when a scenario loads (default: whole map)
  CGF.demos = {};
  CGF.registerDemo = d => { if (!d || !d.id) throw new Error('a demo needs an id'); CGF.demos[d.id] = d; CGF.emit('registry'); };

  // Each time a scenario loads during a demo: put BLUE-1 at the demo's start for it, and follow it with the camera
  CGF.on('reset', () => {
    const d = R.active; if (!d) return;
    const p = d.places && d.places[CGF.scenario.id];
    if (p) api.place(p[0], p[1], p[2]);
    const st = d.steps[R.idx];   // a step that loads a scenario and sets its own focus keeps it
    if (d.view && d.view.zoom && CGF.render && CGF.render.focus && !(st && st.focus)) setTimeout(() => { if (R.active === d) CGF.render.focus(CGF.sim.own, { half: d.view.zoom * (CGF.scenario.scale.range || 1) }); }, 0);
  });

  const R = { active: null, idx: -1, startReal: 0, steerTo: null, steerUnit: null, loop: false, typing: null };

  function clearSteer() { R.steerTo = null; R.steerUnit = null; }

  // Helpers available to demo steps
  const api = {
    units: force => CGF.sim.units.filter(u => u.force === force && u.role === 'cgf'),
    unit: name => CGF.sim.units.find(u => u.name === name),
    maxLevel: force => Math.max(-1, ...api.units(force).map(u => u.stateIdx)),
    top: force => api.units(force).sort((a, b) => b.tension - a.tension)[0],
    nearest: force => api.units(force).sort((a, b) => U.dist(a, CGF.sim.own) - U.dist(b, CGF.sim.own))[0],
    steerTo(x, y) { R.steerTo = { x, y }; R.steerUnit = null; },
    steerToUnit(u) { R.steerUnit = u; R.steerTo = null; },
    heading(h) { clearSteer(); CGF.sim.own.ordHdg = h; },
    speed(v) { CGF.sim.own.ordSpd = v; },
    select(u) { if (u) CGF.sim.selected = u; },
    tab(name) { CGF.emit('demo-tab', name); },
    params(p) { Object.assign(CGF.params, p); CGF.emit('params'); },
    // Camera: glide to and follow an entity of interest (unit, unit name, 'own' or {x, y}); half = zoom
    focus(target, half) { if (CGF.render && CGF.render.focus) CGF.render.focus(target, { half }); },
    overview() { if (CGF.render && CGF.render.overview) CGF.render.overview(); },
    // Zoom out just enough to show all these units (names or units) at once, centred between them
    frame(list, margin) {
      const us = list.map(x => typeof x === 'string' ? (x === 'own' ? CGF.sim.own : api.unit(x)) : x).filter(Boolean);
      if (!us.length) return;
      const xs = us.map(u => u.x), ys = us.map(u => u.y);
      const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
      const half = Math.max(...us.map(u => Math.max(Math.abs(u.x - c.x), Math.abs(u.y - c.y)))) * (margin || 1.4) + 4 * (CGF.scenario.scale.range || 1);
      api.focus(c, half);
    },
    // Units that joined a teammate's response (cooperating CGFs), newest last
    teammates: () => [...new Set(CGF.sim.actions.filter(x => x.action.startsWith('Joined the response')).map(x => x.unit))],
    timeScale(x) { CGF.params.timeScale = x; CGF.emit('params'); },
    place(x, y, hdg) { const o = CGF.sim.own; o.x = x; o.y = y; if (hdg != null) { o.hdg = hdg; o.ordHdg = hdg; } o.track = []; },
    events: type => CGF.simEvents.log().filter(e => !type || e.type === type),
    adjustments: () => (CGF.Adapt.current ? CGF.Adapt.current.adjustments : []),
    teamActions: () => CGF.sim.actions.filter(x => x.action.startsWith('Joined the response')).length,
    // Start an adaptive session in this page (warship crew, scripted trainees); the step waits until it is running
    startAdaptive(opts) { R.waiting = true; return CGF.adaptRuntime.startLocal(opts).finally(() => { R.waiting = false; R.startReal = performance.now(); }); },
    // Load another scenario mid-demo (keeps the demo running)
    load(id, opts) {
      clearSteer();
      CGF.loadScenario(id, opts && opts.harnesses, { mode: (opts && opts.mode) || (R.active && R.active.mode) || 'exercise' });
      CGF.sim.running = true; CGF.emit('run');
    },
    inject: CGF.inject,
    actions: CGF.actions
  };

  function caption(text) {
    CGF.emit('caption', text || '');
    if (text) CGF.log('DEMO: ' + text, 'instr');
  }

  function next() {
    R.idx++;
    const st = R.active.steps[R.idx];
    if (!st) { finish(); return; }
    R.startReal = performance.now();
    if (st.caption != null) caption(st.caption);
    if (st.do) st.do(api);
    if (st.speed) api.timeScale(st.speed);
    if (st.focus) api.focus(st.focus, st.zoom);
    else if (st.zoom) api.focus('own', st.zoom);
    if (st.prompt) { api.tab('instructor'); R.typing = { text: st.prompt, fallback: st.fallback, shown: 0, nextAt: performance.now() + 400 }; }
  }

  function finish() {
    const d = R.active;
    if (R.loop && d) { setTimeout(() => { if (R.active === d) CGF.demo.start(d.id, { loop: true }); }, 4000); R.idx = 1e9; return; }
    R.active = null; clearSteer(); R.typing = null;
    if (CGF.sim.running) CGF.actions.toggleRun();
    CGF.emit('demo', false);
  }

  CGF.demo = {
    start(id, opts) {
      const d = CGF.demos[id];
      if (!d) { CGF.log(`Unknown demo: ${id}`, 'alert'); return; }
      R.active = d; R.idx = -1; R.loop = !!(opts && opts.loop); clearSteer(); R.typing = null;
      CGF.loadScenario(d.scenario, d.harnesses, { mode: d.mode || 'exercise' });
      api.params(Object.assign({ aggression: 1, sensitivity: 1, reaction: 30, decay: 1, detection: 20 }, d.params || {}));
      CGF.sim.running = true; CGF.emit('run');
      CGF.emit('demo', true);
      next();
    },
    stop() {
      if (!R.active) return;
      R.active = null; clearSteer(); R.typing = null;
      caption('');
      CGF.log('Demo stopped. You have control.', 'sys');
      CGF.emit('demo', false);
    },
    isRunning: () => !!R.active,
    // Called every frame by main.js
    update() {
      const now = performance.now(), frameMs = now - (R.lastFrame || now);
      R.lastFrame = now;
      if (!R.active) return;
      const sim = CGF.sim, st = R.active.steps[R.idx];
      if (!st) return;
      if (R.waiting) { R.startReal += frameMs; return; }                     // a session is still starting
      if (!sim.running && !sim.outcome) { R.startReal += frameMs; return; } // paused: hold the clock too

      // Type the instructor prompt one character at a time, send it, and wait for the answer
      if (R.typing) {
        const T = R.typing;
        if (T.sent) return; // waiting for the model
        while (now >= T.nextAt && T.shown < T.text.length) { T.shown++; T.nextAt += TYPE_MS; }
        CGF.ui.showTyping(T.text.slice(0, T.shown), false);
        if (T.shown >= T.text.length && now >= T.nextAt + 500) {
          T.sent = true;
          CGF.ui.showTyping(T.text, true);
          const active = R.active;
          CGF.ui.submitPrompt(T.text, { auto: true, fallback: T.fallback }).finally(() => {
            if (R.active !== active || R.typing !== T) return;
            R.typing = null;
            R.startReal = performance.now();
          });
        }
        return;
      }

      if (R.steerUnit && !sim.units.includes(R.steerUnit)) R.steerUnit = null; // scenario was reloaded
      if (R.steerUnit) R.steerTo = { x: R.steerUnit.x, y: R.steerUnit.y };
      if (R.steerTo) sim.own.ordHdg = Math.round(U.bearing(CGF.displayedOwn(), R.steerTo));
      if (sim.outcome && !st.allowOutcome) { finish(); return; }
      const elapsed = (now - R.startReal) / 1000;
      const ready = (!st.until || st.until(api)) && elapsed >= (st.hold || 0);
      if (ready || (st.timeout && elapsed >= st.timeout)) next();
    }
  };
})();
