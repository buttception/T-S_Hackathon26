// End-of-training report page (report.html): the debrief for every trainee in a session, with their
// history and what to work on next. Builds nothing itself; reads Report, History and Debrief (why the CGFs
// acted as they did, and how this session calibrates the trainee's next one).
//
// What it shows, by URL:
//   report.html?session=<id>#record=<session record>   opened by the host when a run ends (Report.finishSession)
//   report.html?session=<id>[,<id>]                     those sessions, from the history store
//   report.html?trainee=<id>                            that trainee's latest session
//   report.html                                         the latest session of every known trainee (demo: the G1 pair)
//
// Markup uses rp-* class hooks for the design lane; no colours or spacing are set here.
// Owner: Glenda (report lane).
(function () {
  'use strict';
  const CGF = window.CGF, R = CGF.Report, H = CGF.History, D = CGF.Debrief;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const label = k => R.LABELS[k] || k || '—';
  const seatLabel = s => R.SEAT_LABELS[s] || s || '—';
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const dur = t => `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s`;
  const titleCase = id => String(id || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const pct = v => Math.round(v * 100) + '%';
  const rateOf = c => c && c.success + c.fail ? c.success / (c.success + c.fail) : null;
  const meter = v => v == null ? '' : `<meter min="0" max="1" low="0.4" high="0.7" optimum="1" value="${v}"></meter>`;

  // Strength or weakness this session, from counted events (2 or more)
  function verdict(c) {
    const n = c ? c.success + c.fail : 0, r = rateOf(c);
    if (!n) return { cls: 'rp-none', text: 'Not tested' };
    if (n < R.MIN_EVENTS) return { cls: 'rp-thin', text: 'Too few events' };
    if (r >= R.STRONG_FROM) return { cls: 'rp-good', text: 'Strength' };
    if (r <= R.WEAK_TO) return { cls: 'rp-bad', text: 'Needs work' };
    return { cls: 'rp-mid', text: 'Developing' };
  }
  function bestAndWorst(f) {
    const firm = Object.entries(f.events_by_competency).filter(([, c]) => c.success + c.fail >= R.MIN_EVENTS).sort((a, b) => rateOf(a[1]) - rateOf(b[1]));
    if (!firm.length) return { best: null, worst: null };
    const worst = firm[0], best = firm[firm.length - 1];
    return { best: rateOf(best[1]) >= R.STRONG_FROM ? best[0] : null, worst: rateOf(worst[1]) <= R.WEAK_TO ? worst[0] : null };
  }
  const totals = f => Object.values(f.events_by_competency).reduce((a, c) => [a[0] + c.success, a[1] + c.fail], [0, 0]);

  // ------------------------------------------------------------ what to show
  function recordFromHash() {
    const m = /(?:^|&)record=([^&]*)/.exec(location.hash.slice(1));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return { error: 'The session record in the link could not be read.' }; }
  }

  function sessionsToShow() {
    const qs = new URLSearchParams(location.search), rec = recordFromHash();
    if (rec && rec.error) return { error: rec.error };
    if (rec) {
      const errs = R.checkRecord(rec);
      if (errs.length) return { error: errs.join('; ') };
      // The host normally appended these already; in a browser that keeps file:// storage per page, add them here
      for (const c of rec.crew) if (!H.find(c.trainee_id, rec.session_id)) H.append(R.entryFor(rec, R.build(rec, c.trainee_id)));
      return { sessions: [rec.session_id], records: { [rec.session_id]: rec } };
    }
    if (qs.get('session')) return { sessions: qs.get('session').split(',').filter(Boolean), records: {} };
    if (qs.get('trainee')) {
      const last = H.list(qs.get('trainee')).slice(-1)[0];
      return last ? { sessions: [last.session_id], records: {} } : { error: `No history for ${qs.get('trainee')}.` };
    }
    const latest = [...new Set(H.trainees().map(t => (H.list(t).slice(-1)[0] || {}).session_id).filter(Boolean))].sort().reverse();
    return { sessions: latest.slice(0, 2).reverse(), records: {} };   // the G1 pair: pane A first
  }

  function entriesFor(sid, rec) {
    const ids = rec ? rec.crew.map(c => c.trainee_id) : H.trainees();
    return ids.map(t => H.find(t, sid)).filter(Boolean);
  }

  // ------------------------------------------------------------ rendering
  function crewTable(entries, rec) {
    const seatOf = t => rec ? (rec.crew.find(c => c.trainee_id === t) || {}).seat : null;
    return `<table class="rp-table rp-crew"><thead><tr><th>Trainee</th><th>Seat</th><th>Events (success / fail)</th><th>Strongest</th><th>Needs most work</th><th>Next focus</th></tr></thead><tbody>` +
      entries.map(e => {
        const f = e.report.facts, [s, fl] = totals(f), bw = bestAndWorst(f);
        return `<tr><td><a href="#t-${esc(e.session_id)}-${esc(e.trainee_id)}">${esc(e.trainee_id)}</a></td><td>${esc(seatLabel(seatOf(e.trainee_id)))}</td>` +
          `<td>${s} / ${fl}</td><td class="rp-good">${esc(label(bw.best))}</td><td class="rp-bad">${esc(label(bw.worst))}</td><td>${esc(label(D.next(e.trainee_id, { record: rec }).target))}</td></tr>`;
      }).join('') + '</tbody></table>';
  }

  function competencyTable(e) {
    const f = e.report.facts, end = e.competency_means_end;
    return `<table class="rp-table rp-comp"><thead><tr><th>Competency</th><th>Profile at start</th><th>This session</th><th>Success rate</th><th>Assessment</th><th>After update</th></tr></thead><tbody>` +
      R.COMPETENCIES.map(k => {
        const c = f.events_by_competency[k], r = rateOf(c), v = verdict(c), m0 = f.competency_means_start[k], m1 = end && end[k];
        return `<tr><td>${esc(label(k))}</td><td>${meter(m0)} ${m0}</td><td>${c ? `${c.success} success · ${c.fail} fail` : '<span class="muted">—</span>'}</td>` +
          `<td>${r == null ? '' : `${meter(r)} ${pct(r)}`}</td><td class="${v.cls}">${v.text}</td>` +
          `<td>${m1 == null ? '<span class="muted">pending</span>' : `${meter(m1)} ${m1}${m1 > m0 ? ' ▲' : m1 < m0 ? ' ▼' : ''}`}</td></tr>`;
      }).join('') + '</tbody></table>' +
      (end ? '' : '<p class="muted small">“After update” fills in once the competency update has run for this session.</p>');
  }

  function historyTable(id, focus) {
    const rows = H.list(id).slice().reverse();
    return `<table class="rp-table rp-history"><thead><tr><th>Session</th><th>Scenario</th><th>Mode</th><th>Outcome</th><th>Main target</th><th>Success / fail</th><th>${esc(label(focus))}: start → after</th></tr></thead><tbody>` +
      rows.map(e => {
        const f = e.report.facts, [s, fl] = totals(f), end = e.competency_means_end;
        return `<tr><td>${esc(e.session_id)}</td><td>${esc(titleCase(e.scenario))}</td><td>${esc(e.mode)}</td><td class="${e.outcome === 'success' ? 'rp-good' : 'rp-bad'}">${esc(e.outcome)}</td>` +
          `<td>${esc(label(e.top_target))}</td><td>${s} / ${fl}</td><td>${f.competency_means_start[focus]} → ${end && end[focus] != null ? end[focus] : '<span class="muted">pending</span>'}</td></tr>`;
      }).join('') + '</tbody></table>';
  }

  // Why the CGFs got sharper or eased off for this trainee, phase by phase
  function whySection(e, rec) {
    if (!rec) return '';
    const w = D.why(rec, e.trainee_id);
    const dirText = p => p.source === 'instructor_steer' ? '◆ Instructor steer' : p.direction === 'up' ? '▲ Sharper (harder)' : p.direction === 'down' ? '▼ Eased off (easier)' : 'Held';
    const span = p => p.t0 === p.t1 ? mmss(p.t0) : `${mmss(p.t0)}–${mmss(p.t1)}`;
    const rows = w.phases.map(p => `<tr><td>${span(p)}</td><td class="${p.direction === 'up' ? 'rp-bad' : p.direction === 'down' ? 'rp-good' : ''}">${dirText(p)}</td>` +
      `<td>${esc(label(p.target))}</td><td>${p.changes.map(c => `${esc(c.behaviour)} <span class="muted small">(${esc(c.setting)} ${c.old} → ${c.new}${c.clamped ? ', capped' : ''})</span>`).join('<br>')}</td>` +
      `<td>${esc(p.reason)}${p.evidence.moments.length ? `<br><span class="muted small">Evidence: ${p.evidence.moments.map(m => `${mmss(m.t)} ${esc((R.EVENT_LABELS[m.type] || m.type).toLowerCase())}`).join('; ')}</span>` : ''}</td></tr>`).join('');
    return `<div class="rp-why"><h4>Why the CGFs acted this way</h4>${w.lines.map(l => `<p>${esc(l)}</p>`).join('')}` +
      (rows ? `<table class="rp-table rp-why-table"><thead><tr><th>When</th><th>CGF behaviour</th><th>Aimed at</th><th>What the CGFs did</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table>` : '') +
      (w.phases.length && w.crew_phases ? `<p class="muted small">${w.crew_phases} other adjustment${w.crew_phases === 1 ? '' : 's'} in this run served a crewmate's seat.</p>` : '') + '</div>';
  }

  // How this trainee's history sets up the CGFs for their next session (only on their latest session)
  function nextSection(e, rec) {
    const latest = H.list(e.trainee_id).slice(-1)[0];
    if (!latest || latest.session_id !== e.session_id)
      return '<div class="rp-next"><h4>Calibration for the next session</h4><p class="muted small">Shown on the trainee\u2019s latest session; open their latest report to see it.</p></div>';
    const n = D.next(e.trainee_id, { record: rec });
    return `<div class="rp-next"><h4>Calibration for the next session</h4>${n.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }

  function traineeSection(e, rec) {
    const id = e.trainee_id, ctx = H.context(id, 5), f = e.report.facts;
    const seat = rec ? (rec.crew.find(c => c.trainee_id === id) || {}).seat : null;
    const focus = ctx.weak[0] || R.COMPETENCIES.slice().sort((a, b) => f.competency_means_start[a] - f.competency_means_start[b])[0];
    const list = ks => ks.length ? ks.map(label).join(', ') : 'none yet';
    return `<section class="rp-trainee" id="t-${esc(e.session_id)}-${esc(id)}">
      <h3>${esc(id)}${seat ? ` <span class="muted">· ${esc(seatLabel(seat))}</span>` : ''}</h3>
      <p class="rp-narrative">${esc(e.report.narrative)}</p>
      ${competencyTable(e)}
      ${whySection(e, rec)}
      ${nextSection(e, rec)}
      <div class="rp-context"><b>${ctx.sessions === 1 ? 'From this session' : `Across the last ${ctx.sessions} sessions`}</b> · weak: ${esc(list(ctx.weak))} · strong: ${esc(list(ctx.strong))}.</div>
      <details class="rp-history-wrap"${H.list(id).length > 1 ? ' open' : ''}><summary>Training history (${H.list(id).length} session${H.list(id).length === 1 ? '' : 's'})</summary>${historyTable(id, focus)}</details>
    </section>`;
  }

  function momentsSection(rec) {
    if (!rec) return '<p class="muted small">Key moments are available when the report is opened from the end of a run.</p>';
    const ev = rec.events;
    const adj = rec.adjustments;
    return `<details class="rp-moments"><summary>Key moments (${ev.length} events, ${adj.length} CGF adjustments)</summary>
      <table class="rp-table"><thead><tr><th>Time</th><th>Trainee</th><th>What happened</th><th>Competency</th><th>Result</th></tr></thead><tbody>` +
      ev.map(e => `<tr><td>${mmss(e.t)}</td><td>${esc(e.trainee_id)}</td><td>${esc(R.EVENT_LABELS[e.type] || e.type)}</td><td>${esc(e.competency ? label(e.competency) : '—')}</td>` +
        `<td class="${e.outcome === 'success' ? 'rp-good' : e.outcome === 'fail' ? 'rp-bad' : ''}">${esc(e.outcome || '—')}</td></tr>`).join('') +
      `</tbody></table>` +
      (adj.length ? `<table class="rp-table"><thead><tr><th>Time</th><th>Difficulty</th><th>Setting</th><th>Change</th><th>Target</th><th>Source</th></tr></thead><tbody>` +
        adj.map(a => `<tr><td>${mmss(a.t)}</td><td>${a.pressure_direction === 'up' ? '▲ raised' : a.pressure_direction === 'down' ? '▼ lowered' : 'held'}</td>` +
          `<td>${esc(a.setting)}</td><td>${a.old} → ${a.new}${a.clamped ? ' (clamped)' : ''}</td><td>${esc(label(a.target_competency))}</td><td>${esc(a.source)}</td></tr>`).join('') +
        '</tbody></table>' : '<p class="muted small">No CGF adjustments in this session.</p>') + '</details>';
  }

  function sessionSection(sid, rec) {
    const entries = entriesFor(sid, rec);
    if (!entries.length) return `<section class="rp-session"><h2>Session ${esc(sid)}</h2><p>No report found for this session.</p></section>`;
    const e0 = entries[0];
    const meta = [rec && rec.pane ? `Pane ${rec.pane}` : null, titleCase(e0.scenario), e0.mode, rec ? `seed ${rec.seed}` : null,
      rec ? dur(rec.duration_s) : null, rec ? `${titleCase(rec.platform)} crew of ${rec.crew.length}` : null].filter(Boolean).join(' · ');
    return `<section class="rp-session">
      <h2>Session ${esc(sid)} <span class="rp-outcome ${e0.outcome === 'success' ? 'rp-good' : 'rp-bad'}">${e0.outcome === 'success' ? '✓ Completed' : '✗ Failed'}</span></h2>
      <p class="muted">${esc(meta)}</p>
      ${crewTable(entries, rec)}
      ${entries.map(e => traineeSection(e, rec)).join('')}
      ${momentsSection(rec)}
    </section>`;
  }

  function render() {
    const want = sessionsToShow();
    if (want.error) { $('rpBody').innerHTML = `<p class="rp-bad">${esc(want.error)}</p>`; return; }
    const blocks = want.sessions.map(sid => sessionSection(sid, want.records[sid] || H.record(sid)));
    $('rpBody').innerHTML = blocks.join('') || '<p>No sessions to report yet. Finish a run on the host page, or open this page with ?trainee=…</p>';
    $('rpSub').textContent = want.sessions.length > 1 ? `${want.sessions.length} sessions` : want.sessions[0] || '';
    $('rpTrainee').innerHTML = '<option value="">Jump to a trainee…</option>' + H.trainees().map(t => `<option>${esc(t)}</option>`).join('');
    window.__rpShown = want;
  }

  function exportJson() {
    const want = window.__rpShown || { sessions: [] };
    const data = want.sessions.flatMap(sid => entriesFor(sid, (want.records || {})[sid] || H.record(sid)));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `report-${want.sessions.join('_') || 'none'}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function init() {
    $('rpPrint').addEventListener('click', () => window.print());
    $('rpExport').addEventListener('click', exportJson);
    $('rpTrainee').addEventListener('change', e => { if (e.target.value) location.href = 'report.html?trainee=' + encodeURIComponent(e.target.value); });
    try { render(); } catch (err) { $('rpBody').innerHTML = `<p class="rp-bad">Could not build the report: ${esc(err.message)}</p>`; }
  }

  CGF.uiReport = { init, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
