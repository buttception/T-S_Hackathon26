// Host page (host.html): reads the Allocation that allocate.html produced, expands it into the scenario config,
// loads the runtime (runtime.html?linked=1) in an iframe and drives it through postMessage.
// Protocol: contracts/link.js. The runtime runs its own code; this page never touches its DOM
// (it cannot: under file:// it is cross-origin).
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
      // Old saved allocations (before 2026-10-29) held the crew as slots[0].crew; read-only shim, never written back.
      if (a && typeof a === 'object' && !('crew' in a) && Array.isArray(a.slots) && a.slots[0] && Array.isArray(a.slots[0].crew)) {
        a = Object.assign({}, a, { crew: a.slots[0].crew }); delete a.slots;
      }
      const errs = C.validateAllocation(a);
      if (!errs.length) return { allocation: a, source, errors: [] };
      problems.push(...errs.map(m => `${source}: ${m}`));
    }
    return { allocation: null, source: null, errors: problems };
  }

  const runtimeUrl = () => 'runtime.html?linked=1';

  // The last run's session records, kept for the report and the competency update (INTERFACES §9.1):
  //   { allocation_id, record: <session record> }
  // Only valid records are stored, so whoever reads this never has to re-check the shape.
  const RUN_KEY = 'cgf.lastRun';

  // Errors in a session record the runtime sent: the record must be valid (INTERFACES §9.1, with every adjusted value
  // inside the allocation's envelope) and must describe the run it was given: same scenario, seed,
  // mode, platform type and crew.
  function checkRecord(record, config) {
    const errs = C.validateSessionRecord(record, { envelope: config.envelope });
    if (record === null || typeof record !== 'object') return errs;
    if (record.scenario !== config.scenario) errs.push(`record.scenario: this run was given "${config.scenario}"`);
    if (record.seed !== config.seed) errs.push(`record.seed: this run was given seed ${config.seed}`);
    if (record.mode !== config.mode) errs.push(`record.mode: this run was given "${config.mode}"`);
    if (record.platform !== config.platform.type) errs.push(`record.platform: this run was given a ${config.platform.type}`);
    // The same seats, people and roles, whatever the key order. A partner is identified by its own id and whose runs it copies.
    const sig = m => [m && m.seat, m && m.trainee_id, (m && m.role) || 'trainee', m && m.role === 'partner' ? (m.derived_from && m.derived_from.trainee_id) : ''].join('|');
    const have = Array.isArray(record.crew) ? record.crew.map(sig) : null;
    if (!have || JSON.stringify(have) !== JSON.stringify(config.crew.map(sig))) errs.push('record.crew: differs from the crew this run was given');
    return errs;
  }

  // The run as stored: the latest valid record of this allocation. A new record replaces the old one.
  function makeRun(allocation_id, record) { return { allocation_id, record }; }

  // The record as the report builder sees it. Glenda's builder lists an AI partner in the crew table and gives it no
  // report or history entry (INTERFACES §3.2), so the record goes through whole, partner entries included.
  function forReport(record) { return record; }

  CGF.hostLink = { STORE_KEY, RUN_KEY, parseAllocation, runtimeUrl, checkRecord, makeRun, forReport };

  // ------------------------------------------------------------ page
  if (!document.getElementById('hostApp')) return;   // loaded by the test page: functions only

  const $ = id => document.getElementById(id), esc = U.esc;
  let rt = null;   // the one runtime: { config, frame, state, status, record, recordErrors, ... }
  let allocationId = null, run = null;   // run: the valid session records received so far (see RUN_KEY)

  function readStored() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function saveRun() { try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); return true; } catch (e) { return false; } }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function send(type, payload) {
    if (!rt || !rt.frame.contentWindow) return;
    rt.frame.contentWindow.postMessage(L.message(type, payload), '*');
  }

  const clock = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  const MODE_NAMES = { adaptive: 'Adaptive practice', fixed: 'Fixed assessment' };

  function render() {
    const cfg = (rt || {}).config, badge = $('modeBadge');   // same names and classes as the allocation page
    if (badge) {
      badge.hidden = !cfg;
      if (cfg) {
        const fixed = cfg.mode === 'fixed';
        badge.className = 'modeBadge ' + (fixed ? 'mode-fixed' : 'mode-adaptive');
        badge.textContent = (fixed ? '■ ' : '↻ ') + (MODE_NAMES[cfg.mode] || cfg.mode) + (fixed ? ' · no adjustments' : '');
      }
    }
    if (rt) {
      const p = rt, el = $('info'), st = p.status;
      const chip = p.state === 'error' ? `<span class="chip bad">error</span>`
        : p.state === 'loading' ? `<span class="chip">loading</span>`
        : st && st.outcome ? `<span class="chip ${st.outcome === 'success' ? 'good' : 'bad'}">${esc(st.outcome)}</span>`
        : st && st.running ? `<span class="chip run">running</span>` : `<span class="chip">ready, paused</span>`;
      el.innerHTML = `<div class="runTitle"><b>Training run</b> ${chip}` +
        `<span class="grow"></span><span class="muted small">${st ? clock(st.t) + ' sim · ' : ''}${esc(p.config.scenario)}</span></div>` +
        `<div class="crewLine">${p.config.crew.map(m => `<span title="${esc(m.agent_profile)}">${esc(m.seat)} <b>${esc(m.trainee_id)}</b></span>`).join('')}</div>` +
        (st ? `<div class="muted small">warnings ${st.stats.warnings} · ignored ${st.stats.ignored} · acknowledged ${st.stats.acks} · peak tension ${st.stats.maxTension}</div>` : '') +
        (p.record ? `<div class="small">Session record: ${Array.isArray(p.record.events) ? p.record.events.length : '?'} events, ` +
          `${Array.isArray(p.record.adjustments) ? p.record.adjustments.length : '?'} adjustments ` +
          (p.recordErrors.length ? '<span class="chip bad">invalid, not saved</span>' : '<span class="chip good">valid, saved</span>') + '</div>' +
          (p.recordErrors.length ? `<div class="warn small">${p.recordErrors.slice(0, 3).map(esc).join('<br>')}${p.recordErrors.length > 3 ? `<br>and ${p.recordErrors.length - 3} more` : ''}</div>` : '') +
          (p.reportUrl ? `<div class="small"><a class="btn" href="${esc(p.reportUrl)}" target="_blank" rel="noopener">Open report</a></div>` : '') +
          (p.reportError ? `<div class="warn small">${esc(p.reportError)}</div>` : '') +
          (p.compareUrl ? `<div class="small"><a class="btn" href="${esc(p.compareUrl)}" target="_blank" rel="noopener">${p.record.mode === 'fixed' ? 'Saved as a baseline: compare runs' : 'Compare with the fixed baseline'}</a></div>` : '') : '') +
        (p.apiMissing && p.apiMissing.length ? `<div class="warn small">The runtime is missing calls the link needs: ${p.apiMissing.map(esc).join(', ')}. Tell whoever changed the runtime.</div>` : '') +
        (p.error ? `<div class="warn small">${esc(p.error)}</div>` : '');
    }
    const usable = !!rt && rt.state === 'ready';
    $('btnStart').disabled = $('btnPause').disabled = $('btnRestart').disabled = !usable;
    $('btnExport').disabled = !(run && run.record);
  }

  function onMessage(ev) {
    if (!rt || rt.frame.contentWindow !== ev.source) return;   // not our runtime (origins are opaque under file://)
    const msg = ev.data, errs = L.validateMessage(msg);
    if (errs.length || L.TYPES[msg.type].from !== 'runtime') return;
    const p = rt;
    if (msg.type === 'hello') { p.state = 'loading'; p.apiMissing = msg.api.missing || []; p.error = null; p.status = null; p.record = null; send('init', { config: p.config }); }
    else if (msg.type === 'ready') { p.state = 'ready'; p.error = null; }
    else if (msg.type === 'status') p.status = msg;
    else if (msg.type === 'ended') { p.status = Object.assign({}, p.status, { outcome: msg.outcome, running: false }); p.endText = msg.text; }
    else if (msg.type === 'record') {
      p.record = msg.record; p.recordErrors = checkRecord(msg.record, p.config);
      p.reportUrl = null; p.reportError = null;
      if (!p.recordErrors.length) {   // only valid records are kept
        run = makeRun(allocationId, msg.record); saveRun();
        if (CGF.Report && typeof CGF.Report.finishSession === 'function') {   // Glenda's lane: reports, history entries, page URL
          try { p.reportUrl = CGF.Report.finishSession(forReport(msg.record)).url; } catch (e) { p.reportError = 'The report could not be built: ' + e.message; }
        }
        // Keep the run so it can be compared with a fixed baseline (compare.html); a fixed run is the baseline itself
        if (CGF.Runs && typeof CGF.Runs.save === 'function') {
          try { CGF.Runs.save(msg.record); p.compareUrl = 'compare.html?run=' + encodeURIComponent(msg.record.session_id); } catch (e) { p.compareUrl = null; }
        }
        // The competency update runs after the report (INTERFACES §9): report, then Assess.update, then History.attachAssessment
        if (!p.reportError && CGF.Assess && typeof CGF.Assess.update === 'function') {
          try { CGF.Assess.update(msg.record); p.assessed = true; } catch (e) { p.assessError = 'The competency update failed: ' + e.message; }
        }
      }
      // A hook for whatever consumes the records (the report, the competency update): no polling of localStorage needed
      window.dispatchEvent(new CustomEvent('cgf:session-record', { detail: { record: msg.record, errors: p.recordErrors, run } }));
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
    const a = found.allocation, config = C.expandAllocation(a), sh = a.shared;
    allocationId = a.allocation_id;
    $('summary').innerHTML = `<b>${esc(a.allocation_id)}</b> · ${esc(sh.platform.type)} ${esc(sh.platform.model)} · ${esc(sh.scenario)} · seed ${sh.seed} · ` +
      `${esc(sh.mode)} · ${sh.duration_s} s <span class="muted small">(from the ${found.source})</span>`;
    window.addEventListener('message', onMessage);
    const frame = $('frame');
    rt = { config, frame, state: 'loading', status: null, apiMissing: [], error: null };
    frame.src = runtimeUrl();
    $('btnStart').onclick = () => send('start');
    $('btnPause').onclick = () => send('pause');
    $('btnRestart').onclick = () => { rt.status = null; rt.record = null; send('restart'); };
    $('btnExport').onclick = () => { if (run) download(`${allocationId}-session-records.json`, JSON.stringify(run, null, 2)); };
    render();
  }

  boot();
})();
