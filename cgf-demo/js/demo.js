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
//   spot     a panel element (CSS selector) the step talks about: its tab is opened and highlighted, and the element
//            scrolled into view and highlighted until the next step
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;
  const TYPE_MS = 45; // per character, so the audience can read the prompt as it is typed

  // Demo highlight on the panel: the tab a demo switches to, and the element a step is about (step "spot").
  // The look uses the AI-source tokens (as #cmd.typing does) until Eevee styles .demo-focus / .demo-spot in CSS.
  const HL = { outline: '2px solid var(--source-ai)', boxShadow: '0 0 0 4px var(--source-ai-bg)', outlineOffset: '1px' };
  const lit = new Set();
  function highlight(el, cls) {
    if (!el) return;
    el.classList.add(cls); Object.assign(el.style, HL); lit.add(el);
  }
  function unhighlight(cls) {
    for (const el of [...lit]) if (el.classList.contains(cls)) { el.classList.remove(cls); for (const k of Object.keys(HL)) el.style[k] = ''; lit.delete(el); }
  }
  function focusTab(name) {
    unhighlight('demo-focus');
    highlight(document.querySelector(`.tab[data-tab="${name}"]`), 'demo-focus');
  }

  // Demo-level fields (besides id, name, scenario, mode, params, steps):
  //   pace:   play the demo this many times faster in real time: holds, timeouts, prompt typing and the pages after it
  //           are divided by it, and each step's simulation speed multiplied by it (the same sim time passes per step)
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

  const pace = () => (R.active && R.active.pace) || 1;

  function clearSteer() { R.steerTo = null; R.steerUnit = null; }

  // The units a prompt acted on, from the engine's 'instr-target' events while it runs. Works whatever the wording,
  // so the camera can follow an LLM prompt too.
  let targets = null;
  CGF.on('instr-target', u => { if (targets) targets.add(u); });
  CGF.on('reset', () => { targets = null; });   // a scenario load: the reset handler above sets the view

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
    tab(name) { CGF.emit('demo-tab', name); if (R.active) focusTab(name); },
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
      const s = CGF.scenario.scale.range || 1;
      const half = Math.max(Math.max(...us.map(u => Math.max(Math.abs(u.x - c.x), Math.abs(u.y - c.y)))) * (margin || 1.4) + 4 * s, 10 * s);
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
    if (st.speed) api.timeScale(st.speed * pace());
    if (st.focus) api.focus(st.focus, st.zoom);
    else if (st.zoom) api.focus('own', st.zoom);
    if (st.prompt) { api.tab('instructor'); R.typing = { text: st.prompt, fallback: st.fallback, shown: 0, nextAt: performance.now() + 400 }; }
    unhighlight('demo-spot');
    if (st.spot) spot(st.spot);
  }

  // Open the tab that holds this panel element, then bring it into view and highlight it for the step
  function spot(sel) {
    const el = document.querySelector(sel); if (!el) return;
    const pane = el.closest('[data-pane]');
    if (pane) api.tab(pane.dataset.pane);
    highlight(el, 'demo-spot');
    setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);   // after the tab is shown
  }

  // After the last step: other pages full-screen over the runtime, one after another (demo field "after":
  // [{ url, seconds, caption, record }]). record: true passes the demo's last adaptive session record in the link,
  // the way report.html reads it (#record=...). The pages are not changed; Esc closes the overlay.
  let overlay = null, overlayTimer = null;
  CGF.on('session-record', r => { if (R.active && r && r.mode !== 'fixed') R.record = r; });
  function closeOverlay() {
    if (!overlay) return;
    clearTimeout(overlayTimer);
    const cap = document.getElementById('caption');
    cap.style.top = cap.style.bottom = '';
    document.getElementById('mapWrap').appendChild(cap);   // the caption goes back over the map
    overlay.remove(); overlay = null; caption('');
  }
  function showAfter(list, record, done) {
    const box = document.createElement('div'), frame = document.createElement('iframe');
    Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: 50, background: 'var(--surface-bg)' });
    Object.assign(frame.style, { width: '100%', height: '100%', border: '0' });
    const cap = document.getElementById('caption');
    Object.assign(cap.style, { top: 'auto', bottom: '16px' });   // over the page's footer, not its title
    box.appendChild(frame); box.appendChild(cap); document.body.appendChild(box);
    overlay = box;
    let i = -1;
    (function step() {
      if (overlay !== box) return;
      const p = list[++i];
      if (!p) { closeOverlay(); done(); return; }
      frame.src = p.url + (p.record && record ? '#record=' + encodeURIComponent(JSON.stringify(record)) : '');
      caption(p.caption || '');
      overlayTimer = setTimeout(step, (p.seconds || 20) * 1000 / pace());
    })();
  }

  function finish() {
    const d = R.active;
    if (d && d.after && !R.afterShown) {   // the demo stays active (Esc still stops it) while the pages show
      R.afterShown = true; R.idx = 1e9;
      if (CGF.sim.running) CGF.actions.toggleRun();
      unhighlight('demo-spot'); unhighlight('demo-focus');
      showAfter(d.after, R.record, () => { if (R.active === d) finish(); });
      return;
    }
    if (R.loop && d) { setTimeout(() => { if (R.active === d) CGF.demo.start(d.id, { loop: true }); }, 4000); R.idx = 1e9; return; }
    R.active = null; clearSteer(); R.typing = null; unhighlight('demo-spot'); unhighlight('demo-focus');
    if (CGF.sim.running) CGF.actions.toggleRun();
    CGF.emit('demo', false);
  }

  CGF.demo = {
    start(id, opts) {
      const d = CGF.demos[id];
      if (!d) { CGF.log(`Unknown demo: ${id}`, 'alert'); return; }
      closeOverlay();
      R.active = d; R.idx = -1; R.loop = !!(opts && opts.loop); clearSteer(); R.typing = null; R.record = null; R.afterShown = false;
      CGF.loadScenario(d.scenario, d.harnesses, { mode: d.mode || 'exercise' });
      api.params(Object.assign({ aggression: 1, sensitivity: 1, reaction: 30, decay: 1, detection: 20 }, d.params || {}));
      CGF.sim.running = true; CGF.emit('run');
      CGF.emit('demo', true);
      next();
    },
    stop() {
      closeOverlay();
      if (!R.active) return;
      R.active = null; clearSteer(); R.typing = null; unhighlight('demo-spot'); unhighlight('demo-focus');
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
        while (now >= T.nextAt && T.shown < T.text.length) { T.shown++; T.nextAt += TYPE_MS / pace(); }
        CGF.ui.showTyping(T.text.slice(0, T.shown), false);
        if (T.shown >= T.text.length && now >= T.nextAt + 500) {
          T.sent = true;
          CGF.ui.showTyping(T.text, true);
          const active = R.active, mine = targets = new Set();
          CGF.ui.submitPrompt(T.text, { auto: true, fallback: T.fallback }).finally(() => {
            if (R.active !== active || R.typing !== T) return;
            R.typing = null;
            R.startReal = performance.now();
            // show what the prompt did: the preview card in the panel, and the units it changed on the map
            const card = document.getElementById('llmPreview');
            if (card && !card.classList.contains('hidden')) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
            const changed = targets === mine ? [...mine].filter(u => CGF.sim.units.includes(u)) : [];
            targets = null;
            if (changed.length && !st.focus) {
              const s = CGF.scenario.scale.range || 1, spread = Math.max(...changed.map(u => Math.max(...changed.map(v => U.dist(u, v)))));
              if (spread < CGF.scenario.view.half * 0.6) api.frame(changed);
              else api.focus(changed.sort((a, b) => U.dist(a, CGF.sim.own) - U.dist(b, CGF.sim.own))[0], 18 * s);   // too spread out: the nearest
            }
          });
        }
        return;
      }

      if (R.steerUnit && !sim.units.includes(R.steerUnit)) R.steerUnit = null; // scenario was reloaded
      if (R.steerUnit) R.steerTo = { x: R.steerUnit.x, y: R.steerUnit.y };
      if (R.steerTo) sim.own.ordHdg = Math.round(U.bearing(CGF.displayedOwn(), R.steerTo));
      if (sim.outcome && !st.allowOutcome) { finish(); return; }
      const elapsed = (now - R.startReal) / 1000;
      const ready = (!st.until || st.until(api)) && elapsed >= (st.hold || 0) / pace();
      if (ready || (st.timeout && elapsed >= st.timeout / pace())) next();
    }
  };
})();
