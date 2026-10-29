// Host page (host.html): reads the Allocation that allocate.html produced, expands it into one scenario config
// per pane, loads each pane (runtime.html?pane=A, ?pane=B) in an iframe and drives them through postMessage.
// Protocol: contracts/link.js. The panes run the runtime's own code; this page never touches their DOM
// (it cannot: under file:// they are cross-origin).
//
// The pure functions (CGF.hostLink.*) carry no DOM access so tests/link.html can check them.
(function () {
  'use strict';
  const CGF = window.CGF, C = CGF.contracts, L = CGF.link, U = CGF.util;

  const STORE_KEY = 'cgf.allocation';   // same key allocate.html writes

  // Where the allocation comes from: the ?alloc= link first (always works), then browser storage.
  // Returns { allocation, source, errors }. allocation is null when nothing usable was found.
  function parseAllocation(search, storedText) {
    const sources = [['link', new URLSearchParams(search || '').get('alloc')], ['storage', storedText]];
    const problems = [];
    for (const [source, text] of sources) {
      if (!text) continue;
      let a;
      try { a = JSON.parse(text); } catch (e) { problems.push(`${source}: not valid JSON`); continue; }
      const errs = C.validateAllocation(a);
      if (!errs.length) return { allocation: a, source, errors: [] };
      problems.push(...errs.map(m => `${source}: ${m}`));
    }
    return { allocation: null, source: null, errors: problems };
  }

  const paneUrl = pane => `runtime.html?pane=${encodeURIComponent(pane)}`;

  CGF.hostLink = { STORE_KEY, parseAllocation, paneUrl };

  // ------------------------------------------------------------ page
  if (!document.getElementById('hostApp')) return;   // loaded by the test page: functions only

  const $ = id => document.getElementById(id), esc = U.esc;
  const panes = {};   // pane letter -> { config, frame, state, detail, status }

  function readStored() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }

  function send(pane, type, payload) {
    const p = panes[pane]; if (!p || !p.frame.contentWindow) return;
    p.frame.contentWindow.postMessage(L.message(type, pane, payload), '*');
  }

  const clock = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  function render() {
    for (const [pane, p] of Object.entries(panes)) {
      const el = $('info' + pane), st = p.status;
      const chip = p.state === 'error' ? `<span class="chip bad">error</span>`
        : p.state === 'loading' ? `<span class="chip">loading</span>`
        : st && st.outcome ? `<span class="chip ${st.outcome === 'success' ? 'good' : 'bad'}">${esc(st.outcome)}</span>`
        : st && st.running ? `<span class="chip run">running</span>` : `<span class="chip">ready, paused</span>`;
      el.innerHTML = `<div class="paneTitle"><b>Pane ${esc(pane)}</b> ${chip}` +
        `<span class="grow"></span><span class="muted small">${st ? clock(st.t) + ' sim · ' : ''}${esc(p.config.scenario)}</span></div>` +
        `<div class="crewLine">${p.config.crew.map(m => `<span title="${esc(m.agent_profile)}">${esc(m.seat)} <b>${esc(m.trainee_id)}</b></span>`).join('')}</div>` +
        (st ? `<div class="muted small">warnings ${st.stats.warnings} · ignored ${st.stats.ignored} · acknowledged ${st.stats.acks} · peak tension ${st.stats.maxTension}</div>` : '') +
        (p.apiMissing && p.apiMissing.length ? `<div class="warn small">The runtime is missing calls the link needs: ${p.apiMissing.map(esc).join(', ')}. Tell whoever changed the runtime.</div>` : '') +
        (p.error ? `<div class="warn small">${esc(p.error)}</div>` : '');
    }
    const all = Object.values(panes), usable = all.length && all.every(p => p.state === 'ready');
    $('btnStart').disabled = $('btnPause').disabled = $('btnRestart').disabled = !usable;
  }

  function onMessage(ev) {
    const pane = Object.keys(panes).find(k => panes[k].frame.contentWindow === ev.source);
    if (!pane) return;                                  // not one of our panes (origins are opaque under file://)
    const msg = ev.data, errs = L.validateMessage(msg);
    if (errs.length || L.TYPES[msg.type].from !== 'pane' || msg.pane !== pane) return;
    const p = panes[pane];
    if (msg.type === 'hello') { p.state = 'loading'; p.apiMissing = msg.api.missing || []; p.error = null; p.status = null; send(pane, 'init', { config: p.config }); }
    else if (msg.type === 'ready') { p.state = 'ready'; p.error = null; }
    else if (msg.type === 'status') p.status = msg;
    else if (msg.type === 'ended') { p.status = Object.assign({}, p.status, { outcome: msg.outcome, running: false }); p.endText = msg.text; }
    else if (msg.type === 'error') { p.state = 'error'; p.error = msg.message; }
    render();
  }

  function boot() {
    const found = parseAllocation(location.search, readStored());
    if (!found.allocation) {
      $('empty').hidden = false; $('stage').hidden = true;
      $('emptyWhy').innerHTML = found.errors.length ? found.errors.map(esc).join('<br>') : 'No allocation has been saved in this browser yet.';
      return;
    }
    const a = found.allocation, configs = C.expandAllocation(a), sh = a.shared;
    $('summary').innerHTML = `<b>${esc(a.allocation_id)}</b> · ${esc(sh.platform.type)} ${esc(sh.platform.model)} · ${esc(sh.scenario)} · seed ${sh.seed} · ` +
      `${esc(sh.mode)} · ${sh.duration_s} s <span class="muted small">(from the ${found.source})</span>`;
    window.addEventListener('message', onMessage);
    configs.forEach((config, i) => {
      const pane = a.slots[i].pane, frame = $('frame' + pane);
      panes[pane] = { config, frame, state: 'loading', status: null, apiMissing: [], error: null };
      frame.src = paneUrl(pane);
    });
    $('btnStart').onclick = () => Object.keys(panes).forEach(k => send(k, 'start'));
    $('btnPause').onclick = () => Object.keys(panes).forEach(k => send(k, 'pause'));
    $('btnRestart').onclick = () => Object.keys(panes).forEach(k => { panes[k].status = null; send(k, 'restart'); });
    render();
  }

  boot();
})();
