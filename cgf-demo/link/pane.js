// Pane adapter: lets a runtime page be driven by the host page (host.html). Loaded by one <script> tag at the end
// of runtime.html. It does nothing unless the page is inside an iframe AND opened with ?pane=<letter>, so
// runtime.html on its own behaves exactly as before.
//
// This file only uses the runtime's public CGF API (listed in link/README.md). It never edits the runtime's files
// or DOM, except for its own small overlay. Adaptation code subscribes to the 'link-init' event
// (CGF.on('link-init', config => ...)) instead of editing this file.
//
// Protocol: contracts/link.js. Host -> pane: init, start, pause, restart. Pane -> host: hello, ready, status,
// ended, record, error. `record` carries the session record (INTERFACES §9.1) that the runtime emits as the
// 'session-record' event when an adaptive run ends; this file forwards it and does not look inside it.
(function () {
  'use strict';
  const CGF = window.CGF;
  const qs = new URLSearchParams(location.search), pane = qs.get('pane');
  if (!CGF || !pane || window.parent === window) return;   // inert outside a linked pane

  const REQUIRED = {   // the runtime API this adapter depends on; reported in `hello` when something is missing
    'CGF.loadScenario': () => typeof CGF.loadScenario === 'function',
    'CGF.scenarios': () => CGF.scenarios && typeof CGF.scenarios === 'object',
    'CGF.sim': () => CGF.sim && typeof CGF.sim === 'object',
    'CGF.sim.running': () => 'running' in CGF.sim,
    'CGF.sim.outcome': () => 'outcome' in CGF.sim,
    'CGF.sim.t': () => typeof CGF.sim.t === 'number',
    'CGF.sim.stats': () => CGF.sim.stats && typeof CGF.sim.stats === 'object',
    'CGF.actions.toggleRun': () => CGF.actions && typeof CGF.actions.toggleRun === 'function',
    'CGF.on': () => typeof CGF.on === 'function',
    'CGF.emit': () => typeof CGF.emit === 'function',
    'CGF.params': () => CGF.params && typeof CGF.params === 'object',
    'CGF.util.loadScript': () => CGF.util && typeof CGF.util.loadScript === 'function'
  };

  let config = null, lastStatus = '', overlay = null;
  const L = () => CGF.link;
  const send = (type, payload) => window.parent.postMessage(L().message(type, pane, payload), '*');
  const fail = message => send('error', { message });

  function apiReport() {
    const missing = [];
    for (const [name, ok] of Object.entries(REQUIRED)) { let good = false; try { good = !!ok(); } catch (e) { /* missing */ } if (!good) missing.push(name); }
    return { ok: missing.length === 0, missing };
  }

  function drawOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'linkOverlay';
      overlay.style.cssText = 'position:fixed;left:10px;bottom:6px;z-index:50;pointer-events:none;max-width:calc(100% - 430px);' +
        'background:rgba(10,20,32,.92);border:1px solid #2f6db0;border-left:4px solid #4da6ff;border-radius:5px;' +
        'padding:4px 9px;font:12px/1.4 "Segoe UI",system-ui,Arial,sans-serif;color:#d6e2f0';
      document.body.appendChild(overlay);
    }
    const esc = CGF.util.esc, crew = config.crew.map(m => `${esc(m.seat)} <b>${esc(m.trainee_id)}</b>`).join(' · ');
    overlay.innerHTML = `<b>Pane ${esc(pane)}</b> · ${esc(config.platform.type)} ${esc(config.platform.model)} · ${crew}`;
    document.title = `Pane ${pane} · ${config.platform.model}`;
  }

  function load() {
    CGF.loadScenario(config.scenario);   // default exercise mode; the allocation's adaptive/fixed is a separate setting
    // Keep the link on the live sim object. The envelope is recorded, not applied: its values are on a different
    // scale from CGF.params, and applying them is the adaptation lane's job.
    CGF.sim.link = { pane, config, seed: config.seed, adaptation: config.mode, envelope: config.envelope };
    drawOverlay();
    lastStatus = '';   // a reloaded scenario always reports its fresh state, even if it looks like the last one
    CGF.emit('link-init', config);
    send('ready', { scenario: CGF.scenario.id, domain: CGF.scenario.domain || 'sea', platform: config.platform, crew: config.crew });
  }

  function onInit(msg) {
    const errs = (CGF.contracts ? CGF.contracts.validateScenarioConfig(msg.config) : ['contracts not loaded']);
    if (errs.length) return fail('init: ' + errs.join('; '));
    if (!CGF.scenarios[msg.config.scenario]) return fail(`init: scenario "${msg.config.scenario}" is not loaded in this runtime`);
    const want = CGF.contracts.DOMAIN_BY_TYPE[msg.config.platform.type], got = CGF.scenarios[msg.config.scenario].domain || 'sea';
    if (want !== got) return fail(`init: a ${msg.config.platform.type} needs a ${want} scenario; "${msg.config.scenario}" is ${got}`);
    config = msg.config;
    load();
  }

  function onMessage(ev) {
    if (ev.source !== window.parent) return;   // origins are opaque under file://, so check the sender instead
    const msg = ev.data, errs = L().validateMessage(msg);
    if (errs.length || L().TYPES[msg.type].from !== 'host') return;
    if (msg.pane !== pane) return;
    try {
      if (msg.type === 'init') return onInit(msg);
      if (!config) return fail(`${msg.type}: send init first`);
      if (msg.type === 'start' && !CGF.sim.running && !CGF.sim.outcome) CGF.actions.toggleRun();
      else if (msg.type === 'pause' && CGF.sim.running) CGF.actions.toggleRun();
      else if (msg.type === 'restart') load();
    } catch (e) { fail(`${msg.type}: ${e.message}`); }
  }

  function status() {
    const s = CGF.sim; if (!s || !config) return;
    const st = s.stats || {}, body = { t: Math.round(s.t), running: !!s.running, outcome: s.outcome || null,
      stats: { warnings: st.warnings || 0, ignored: st.ignored || 0, acks: st.acks || 0, maxTension: Math.round(st.maxTension || 0) } };
    const key = JSON.stringify(body);
    if (key !== lastStatus) { lastStatus = key; send('status', body); }
  }

  async function boot() {
    try {
      await CGF.util.loadScript('contracts/contracts.js');
      await CGF.util.loadScript('contracts/link.js');
    } catch (e) { return; }                       // without the contracts there is nothing to speak
    // runtime main.js boots asynchronously: wait for the first scenario before saying hello
    const t0 = Date.now();
    while (!(CGF.sim && CGF.scenario)) {
      if (Date.now() - t0 > 15000) return send('error', { message: 'hello: the runtime did not finish booting in 15 s' });
      await new Promise(r => setTimeout(r, 50));
    }
    window.addEventListener('message', onMessage);
    CGF.on('reset', () => { if (config && CGF.sim && !CGF.sim.link) CGF.sim.link = { pane, config, seed: config.seed, adaptation: config.mode, envelope: config.envelope }; });
    CGF.on('outcome', (kind, text) => { if (kind) send('ended', { outcome: kind, text: String(text || '') }); });
    CGF.on('session-record', r => { if (r && typeof r === 'object' && !Array.isArray(r)) send('record', { record: r }); });
    setInterval(status, 500);
    send('hello', { api: apiReport() });          // exactly once
  }

  boot();
})();
