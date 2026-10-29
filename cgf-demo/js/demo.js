// Hands-off demo runner. A demo is a scripted list of steps that drive both the trainee and the
// instructor, with a caption for the audience. Demo scripts live in demos/*.js and call CGF.registerDemo.
//
// Step fields (all optional):
//   caption  text shown over the map (and written to the event log)
//   do(api)  run once when the step starts
//   until(api) => bool   step waits until this is true...
//   hold     ...and at least this many REAL seconds have passed (time to read the caption)
//   timeout  ...or give up after this many REAL seconds
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  CGF.demos = {};
  CGF.registerDemo = d => { if (!d || !d.id) throw new Error('a demo needs an id'); CGF.demos[d.id] = d; CGF.emit('registry'); };

  const R = { active: null, idx: -1, startReal: 0, steerTo: null, steerUnit: null, loop: false };

  // Helpers available to demo steps
  const api = {
    units: force => CGF.sim.units.filter(u => u.force === force && u.role === 'cgf'),
    unit: name => CGF.sim.units.find(u => u.name === name),
    maxLevel: force => Math.max(-1, ...api.units(force).map(u => u.stateIdx)),
    top: force => api.units(force).sort((a, b) => b.tension - a.tension)[0],
    nearest: force => api.units(force).sort((a, b) => U.dist(a, CGF.sim.own) - U.dist(b, CGF.sim.own))[0],
    steerTo(x, y) { R.steerTo = { x, y }; R.steerUnit = null; },
    steerToUnit(u) { R.steerUnit = u; R.steerTo = null; },
    heading(h) { R.steerTo = null; R.steerUnit = null; CGF.sim.own.ordHdg = h; },
    speed(kts) { CGF.sim.own.ordSpd = kts; },
    select(u) { if (u) CGF.sim.selected = u; },
    tab(name) { CGF.emit('demo-tab', name); },
    params(p) { Object.assign(CGF.params, p); CGF.emit('params'); },
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
  }

  function finish() {
    const d = R.active;
    if (R.loop && d) { setTimeout(() => { if (R.active === d) CGF.demo.start(d.id, { loop: true }); }, 4000); R.idx = 1e9; return; }
    R.active = null; R.steerTo = null; R.steerUnit = null;
    if (CGF.sim.running) CGF.actions.toggleRun();
    CGF.emit('demo', false);
  }

  CGF.demo = {
    start(id, opts) {
      const d = CGF.demos[id];
      if (!d) { CGF.log(`Unknown demo: ${id}`, 'alert'); return; }
      R.active = d; R.idx = -1; R.loop = !!(opts && opts.loop); R.steerTo = null; R.steerUnit = null;
      CGF.loadScenario(d.scenario, d.harnesses, { mode: d.mode || 'exercise' });
      api.params(Object.assign({ aggression: 1, sensitivity: 1, reaction: 30, decay: 1, detection: 20 }, d.params || {}));
      CGF.sim.running = true; CGF.emit('run');
      CGF.emit('demo', true);
      next();
    },
    stop() {
      if (!R.active) return;
      R.active = null; R.steerTo = null; R.steerUnit = null;
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
      if (!sim.running && !sim.outcome) { R.startReal += frameMs; return; } // paused: hold the clock too
      if (R.steerUnit) R.steerTo = { x: R.steerUnit.x, y: R.steerUnit.y };
      if (R.steerTo) sim.own.ordHdg = Math.round(U.bearing(CGF.displayedOwn(), R.steerTo));
      if (sim.outcome && !st.allowOutcome) { finish(); return; }
      const elapsed = (performance.now() - R.startReal) / 1000;
      const ready = (!st.until || st.until(api)) && elapsed >= (st.hold || 0);
      if (ready || (st.timeout && elapsed >= st.timeout)) next();
    }
  };
})();
