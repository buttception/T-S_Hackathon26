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

  // The last run's session records, kept for the report and the competency update (INTERFACES §9.1):
  //   { allocation_id, records: { A: <session record>, B: <session record> } }
  // Only valid records are stored, so whoever reads this never has to re-check the shape.
  const RUN_KEY = 'cgf.lastRun';

  // Errors in a session record a pane sent: the record must be valid (INTERFACES §9.1, with every adjusted value
  // inside the allocation's envelope) and must describe the run this pane was given: same pane, scenario, seed,
  // mode, platform type and crew.
  function checkRecord(record, config, pane) {
    const errs = C.validateSessionRecord(record, { envelope: config.envelope });
    if (record === null || typeof record !== 'object') return errs;
    if (record.pane !== pane) errs.push(`record.pane: expected "${pane}", got ${JSON.stringify(record.pane)}`);
    if (record.scenario !== config.scenario) errs.push(`record.scenario: this pane ran "${config.scenario}"`);
    if (record.seed !== config.seed) errs.push(`record.seed: this pane was given seed ${config.seed}`);
    if (record.mode !== config.mode) errs.push(`record.mode: this pane was given "${config.mode}"`);
    if (record.platform !== config.platform.type) errs.push(`record.platform: this pane was given a ${config.platform.type}`);
    const want = JSON.stringify(config.crew.map(m => ({ seat: m.seat, trainee_id: m.trainee_id })));
    if (JSON.stringify(record.crew) !== want) errs.push('record.crew: differs from the crew this pane was given');
    return errs;
  }

  // The run with one more record in it. Records of another allocation are dropped, so a stale run never mixes in.
  function mergeRun(prev, allocation_id, pane, record) {
    const same = prev && prev.allocation_id === allocation_id && prev.records && typeof prev.records === 'object';
    return { allocation_id, records: Object.assign({}, same ? prev.records : {}, { [pane]: record }) };
  }

  CGF.hostLink = { STORE_KEY, RUN_KEY, parseAllocation, paneUrl, checkRecord, mergeRun };

  // ------------------------------------------------------------ page
  if (!document.getElementById('hostApp')) return;   // loaded by the test page: functions only

  const $ = id => document.getElementById(id), esc = U.esc;
  const panes = {};   // pane letter -> { config, frame, state, status, record, recordErrors, ... }
  let allocationId = null, run = null;   // run: the valid session records received so far (see RUN_KEY)

  function readStored() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function saveRun() { try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); return true; } catch (e) { return false; } }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

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
        (p.record ? `<div class="small">Session record: ${Array.isArray(p.record.events) ? p.record.events.length : '?'} events, ` +
          `${Array.isArray(p.record.adjustments) ? p.record.adjustments.length : '?'} adjustments ` +
          (p.recordErrors.length ? '<span class="chip bad">invalid, not saved</span>' : '<span class="chip good">valid, saved</span>') + '</div>' +
          (p.recordErrors.length ? `<div class="warn small">${p.recordErrors.slice(0, 3).map(esc).join('<br>')}${p.recordErrors.length > 3 ? `<br>and ${p.recordErrors.length - 3} more` : ''}</div>` : '') +
          (p.reportUrl ? `<div class="small"><a class="btn" href="${esc(p.reportUrl)}" target="_blank" rel="noopener">Open report for pane ${esc(pane)}</a></div>` : '') +
          (p.reportError ? `<div class="warn small">${esc(p.reportError)}</div>` : '') : '') +
        (p.apiMissing && p.apiMissing.length ? `<div class="warn small">The runtime is missing calls the link needs: ${p.apiMissing.map(esc).join(', ')}. Tell whoever changed the runtime.</div>` : '') +
        (p.error ? `<div class="warn small">${esc(p.error)}</div>` : '');
    }
    const all = Object.values(panes), usable = all.length && all.every(p => p.state === 'ready');
    $('btnStart').disabled = $('btnPause').disabled = $('btnRestart').disabled = !usable;
    $('btnExport').disabled = !(run && Object.keys(run.records).length);
  }

  function onMessage(ev) {
    const pane = Object.keys(panes).find(k => panes[k].frame.contentWindow === ev.source);
    if (!pane) return;                                  // not one of our panes (origins are opaque under file://)
    const msg = ev.data, errs = L.validateMessage(msg);
    if (errs.length || L.TYPES[msg.type].from !== 'pane' || msg.pane !== pane) return;
    const p = panes[pane];
    if (msg.type === 'hello') { p.state = 'loading'; p.apiMissing = msg.api.missing || []; p.error = null; p.status = null; p.record = null; send(pane, 'init', { config: p.config }); }
    else if (msg.type === 'ready') { p.state = 'ready'; p.error = null; }
    else if (msg.type === 'status') p.status = msg;
    else if (msg.type === 'ended') { p.status = Object.assign({}, p.status, { outcome: msg.outcome, running: false }); p.endText = msg.text; }
    else if (msg.type === 'record') {
      p.record = msg.record; p.recordErrors = checkRecord(msg.record, p.config, pane);
      p.reportUrl = null; p.reportError = null;
      if (!p.recordErrors.length) {   // only valid records are kept
        run = mergeRun(run, allocationId, pane, msg.record); saveRun();
        if (CGF.Report && typeof CGF.Report.finishSession === 'function') {   // Glenda's lane: reports, history entries, page URL
          try { p.reportUrl = CGF.Report.finishSession(msg.record).url; } catch (e) { p.reportError = 'The report could not be built: ' + e.message; }
        }
        // The competency update runs after the report (INTERFACES §9): report, then Assess.update, then History.attachAssessment
        if (!p.reportError && CGF.Assess && typeof CGF.Assess.update === 'function') {
          try { CGF.Assess.update(msg.record); p.assessed = true; } catch (e) { p.assessError = 'The competency update failed: ' + e.message; }
        }
      }
      // A hook for whatever consumes the records (the report, the competency update): no polling of localStorage needed
      window.dispatchEvent(new CustomEvent('cgf:session-record', { detail: { pane, record: msg.record, errors: p.recordErrors, run } }));
    }
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
    allocationId = a.allocation_id;
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
    $('btnRestart').onclick = () => Object.keys(panes).forEach(k => { panes[k].status = null; panes[k].record = null; send(k, 'restart'); });
    $('btnExport').onclick = () => { if (run) download(`${allocationId}-session-records.json`, JSON.stringify(run, null, 2)); };
    render();
  }

  boot();
})();
