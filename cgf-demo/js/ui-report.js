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
    // rp-good / rp-bad etc. stay beside the rp-level--* classes until css/report.css moves to them (R17)
    if (!n) return { cls: 'rp-level--none rp-none', text: 'Not tested' };
    if (n < R.MIN_EVENTS) return { cls: 'rp-level--thin rp-thin', text: 'Too few events' };
    if (r >= R.STRONG_FROM) return { cls: 'rp-level--strength rp-good', text: 'Strength' };
    if (r <= R.WEAK_TO) return { cls: 'rp-level--focus rp-bad', text: 'Focus area' };
    return { cls: 'rp-level--developing rp-mid', text: 'Developing' };
  }
  // Classes by meaning (design/requests.md R17); the legacy rp-good / rp-bad ride along until report.css moves over
  // One event is evidence about a competency, not a pass or fail of the session (R20): its own classes and words
  const resultCls = o => o === 'success' ? 'rp-result--met' : o === 'fail' ? 'rp-result--missed' : '';
  const resultText = o => o === 'success' ? 'met' : o === 'fail' ? 'missed' : '—';
  const outcomeCls = o => o === 'success' ? 'rp-outcome--success rp-good' : o === 'fail' ? 'rp-outcome--fail rp-bad' : '';
  const dirCls = d => d === 'up' ? 'rp-dir--up rp-bad' : d === 'down' ? 'rp-dir--down rp-good' : '';

  // "30 Oct 2026, run 2" from a session id such as s_20261030_02; other ids are shown as they are
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function sessionTitle(sid) {
    const m = /^s_(\d{4})(\d{2})(\d{2})_(\d+)$/.exec(sid || '');
    return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}, run ${+m[4]}` : String(sid || '');
  }

  // The template narrative, one sentence per line so the figures do not run together (R18). The text itself is
  // the validated report.narrative, unchanged; sentences end with ". " before a capital letter, never inside 0.26.
  function narrativeLines(text) {
    const lines = String(text || '').split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
    return `<ul class="rp-narrative rp-narrative-lines">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
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
      for (const c of R.traineesOf(rec)) if (!H.find(c.trainee_id, rec.session_id)) H.append(R.entryFor(rec, R.build(rec, c.trainee_id)));
      return { sessions: [rec.session_id], records: { [rec.session_id]: rec } };
    }
    if (qs.get('session')) return { sessions: qs.get('session').split(',').filter(Boolean), records: {} };
    if (qs.get('trainee')) {
      const last = H.list(qs.get('trainee')).slice(-1)[0];
      return last ? { sessions: [last.session_id], records: {} } : { error: `No history for ${qs.get('trainee')}.` };
    }
    const latest = [...new Set(H.trainees().map(t => (H.list(t).slice(-1)[0] || {}).session_id).filter(Boolean))].sort().reverse();
    return { sessions: latest.slice(0, 2).reverse(), records: {} };   // the G1 pair: older first
  }

  function entriesFor(sid, rec) {
    const ids = rec ? R.traineesOf(rec).map(c => c.trainee_id) : H.trainees();
    return ids.map(t => H.find(t, sid)).filter(Boolean);
  }

  // ------------------------------------------------------------ rendering
  function crewTable(entries, rec) {
    const seatOf = t => rec ? (rec.crew.find(c => c.trainee_id === t) || {}).seat : null;
    return `<table class="rp-table rp-crew"><thead><tr><th>Trainee</th><th>Seat</th><th>Events (success / fail)</th><th>Strongest</th><th>Focus area</th><th>Next session presses</th></tr></thead><tbody>` +
      entries.map(e => {
        const f = e.report.facts, [s, fl] = totals(f), bw = bestAndWorst(f);
        return `<tr><td><a href="#t-${esc(e.session_id)}-${esc(e.trainee_id)}">${esc(e.trainee_id)}</a></td><td>${esc(seatLabel(seatOf(e.trainee_id)))}</td>` +
          `<td>${s} / ${fl}</td><td class="rp-level--strength rp-good">${esc(label(bw.best))}</td><td class="rp-level--focus rp-bad">${esc(label(bw.worst))}</td><td>${esc(label(D.next(e.trainee_id, { record: rec }).target))}</td></tr>`;
      }).join('') +
      // AI partners are listed, not assessed (INTERFACES §3.2): one line each, no figures
      (rec ? R.partnersOf(rec) : []).map(p => `<tr class="rp-partner"><td>${esc(p.trainee_id)}</td><td>${esc(seatLabel(p.seat))}</td>` +
        `<td colspan="4" class="muted">${esc(R.partnerLine(p))}; not assessed</td></tr>`).join('') + '</tbody></table>';
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
        return `<tr><td title="${esc(e.session_id)}">${esc(sessionTitle(e.session_id))}</td><td>${esc(titleCase(e.scenario))}</td><td>${esc(e.mode)}</td><td class="${outcomeCls(e.outcome)}">${esc(e.outcome)}</td>` +
          `<td>${esc(label(e.top_target))}</td><td>${s} / ${fl}</td><td>${f.competency_means_start[focus]} → ${end && end[focus] != null ? end[focus] : '<span class="muted">pending</span>'}</td></tr>`;
      }).join('') + '</tbody></table>';
  }

  const nameOf = id => { const p = R.profileOf(id); return p && p.name ? `${p.name} (${id})` : id; };
  const isLatest = e => (H.list(e.trainee_id).slice(-1)[0] || {}).session_id === e.session_id;

  // Key facts in one line at the top of a trainee's debrief
  function keyFacts(e, rec, w, n) {
    const [s, fl] = totals(e.report.facts);
    const steps = w ? w.phases.flatMap(p => p.adjustments) : [];
    const ups = steps.filter(a => a.pressure_direction === 'up').length, downs = steps.filter(a => a.pressure_direction === 'down').length;
    const item = (k, v, cls) => `<span class="rp-kf${cls ? ' ' + cls : ''}"><span class="muted">${k}:</span> <b>${v}</b></span>`;
    return `<p class="rp-keyfacts">` + [item('Events handled', `${s} of ${s + fl}`),
      w ? item('CGFs got sharper', `▲ ${ups} step${ups === 1 ? '' : 's'}`, 'rp-dir--up rp-bad') : '', w ? item('CGFs eased off', `▼ ${downs} step${downs === 1 ? '' : 's'}`, 'rp-dir--down rp-good') : '',
      n ? item('Next session presses', esc(label(n.target))) : ''].filter(Boolean).join(' · ') + '</p>';
  }

  // Why the CGFs got sharper or eased off for this trainee: a timeline, then one card per phase
  function whySection(e, rec, w) {
    if (!rec) return '';
    const span = p => p.t0 === p.t1 ? `at ${mmss(p.t0)}` : `${mmss(p.t0)} to ${mmss(p.t1)}`;
    const head = p => p.source === 'instructor_steer' ? '◆ Instructor steer' : p.direction === 'up' ? '▲ CGFs got sharper (harder)' : p.direction === 'down' ? '▼ CGFs eased off (easier)' : 'CGFs held';
    const cards = w.phases.map(p => `<div class="rp-phase rp-phase-${esc(p.direction)}">
        <div class="rp-phase-head"><b class="${dirCls(p.direction)}">${head(p)}</b> <span class="muted">${span(p)} · aimed at ${esc(label(p.target).toLowerCase())}</span></div>
        <p class="rp-phase-why">${esc(p.reason)}</p>
        <ul class="rp-phase-did">${p.changes.map(c => `<li>${esc(c.behaviour)} <span class="muted small">${esc(c.setting)} ${c.old} → ${c.new}${c.clamped ? ', capped at the envelope' : ''}</span></li>`).join('')}</ul>
        ${p.evidence.moments.length ? `<p class="muted small">Based on: ${p.evidence.moments.map(m => `${mmss(m.t)} ${esc((R.EVENT_LABELS[m.type] || m.type).toLowerCase())}`).join(' · ')}</p>` : ''}
      </div>`).join('');
    return `<div class="rp-why"><h4>Why the CGFs acted this way</h4>${w.lines.map(l => `<p>${esc(l)}</p>`).join('')}
      ${CGF.ReportCharts.timeline(rec, e.trainee_id)}
      ${w.phases.length ? '<p class="muted small">Top: how far the CGFs were pushed above the instructor\u2019s base settings. Bottom: the trainee\u2019s results on that competency (● handled, ○ missed) and their success rate over the last 10 events; the shaded strip is the target band.</p>' : ''}
      ${cards}
      ${w.phases.length && w.crew_phases ? `<p class="muted small">${w.crew_phases} other adjustment${w.crew_phases === 1 ? '' : 's'} in this run served a crewmate's seat.</p>` : ''}</div>`;
  }

  // How this trainee's history sets up the CGFs for their next session (only on their latest session)
  function nextSection(e, n) {
    if (!n) return '<div class="rp-next"><h4>Calibration for the next session</h4><p class="muted small">Shown on the trainee\u2019s latest session; open their latest report to see it.</p></div>';
    return `<div class="rp-next"><h4>Calibration for the next session</h4>
      ${n.target ? CGF.ReportCharts.trend(H.list(e.trainee_id), n.target, n.mean) : ''}
      ${n.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }

  function traineeSection(e, rec) {
    const id = e.trainee_id, ctx = H.context(id, 5), f = e.report.facts;
    const seat = rec ? (rec.crew.find(c => c.trainee_id === id) || {}).seat : null;
    const focus = ctx.weak[0] || R.COMPETENCIES.slice().sort((a, b) => f.competency_means_start[a] - f.competency_means_start[b])[0];
    const list = ks => ks.length ? ks.map(label).join(', ') : 'none yet';
    const w = rec ? D.why(rec, id) : null, latest = isLatest(e);
    const n = latest ? D.next(id, { record: rec }) : null;
    return `<section class="rp-trainee" id="t-${esc(e.session_id)}-${esc(id)}" data-trainee="${esc(id)}" data-session="${esc(e.session_id)}">
      <h3>${esc(nameOf(id))}${seat ? ` <span class="muted">· ${esc(seatLabel(seat))} seat</span>` : ''}</h3>
      ${keyFacts(e, rec, w, n)}
      ${narrativeLines(e.report.narrative)}
      ${whySection(e, rec, w)}
      <div class="rp-skills"><h4>Competencies</h4>
        ${CGF.ReportCharts.profile(e, latest ? D.nextProfile(id).comps : null)}
        <details class="rp-comp-wrap"><summary>Competency table</summary>${competencyTable(e)}</details></div>
      ${nextSection(e, n)}
      <div class="rp-context"><b>${ctx.sessions === 1 ? 'From this session' : `Across the last ${ctx.sessions} sessions`}</b> · focus areas: ${esc(list(ctx.weak))} · strengths: ${esc(list(ctx.strong))}.</div>
      <details class="rp-history-wrap"><summary>Training history (${H.list(id).length} session${H.list(id).length === 1 ? '' : 's'})</summary>${historyTable(id, focus)}</details>
    </section>`;
  }

  // Key moments, in two sections: what the trainees did, then what the CGFs changed
  function momentsSection(rec) {
    if (!rec) return '<p class="muted small">Key moments are available when the report is opened from the end of a run.</p>';
    const ev = rec.events, adj = rec.adjustments;
    // Who an adjustment served: its seat, or for records without one, the trainee behind its evidence events
    const byId = {};
    for (const e of ev) byId[e.event_id] = e;
    const servedBy = a => {
      if (a.seat) { const t = (rec.crew.find(c => c.seat === a.seat) || {}).trainee_id; return `${seatLabel(a.seat)}${t ? ` (${t})` : ''}`; }
      const t = (a.evidence_event_ids || []).map(id => (byId[id] || {}).trainee_id).find(Boolean);
      return t || '—';
    };
    const events = `<details class="rp-moments rp-moments-events"><summary>Trainee events (${ev.length})</summary>` +
      (ev.length ? `<table class="rp-table"><thead><tr><th>Time</th><th>Trainee</th><th>What happened</th><th>Competency</th><th>Result</th></tr></thead><tbody>` +
        ev.map(e => `<tr><td>${mmss(e.t)}</td><td>${esc(e.trainee_id)}</td><td>${esc(R.EVENT_LABELS[e.type] || e.type)}</td><td>${esc(e.competency ? label(e.competency) : '—')}</td>` +
          `<td class="${resultCls(e.outcome)}">${resultText(e.outcome)}</td></tr>`).join('') +
        '</tbody></table>' : '<p class="muted small">No events were recorded in this session.</p>') + '</details>';
    const adjustments = `<details class="rp-moments rp-moments-adjustments"><summary>CGF adjustments (${adj.length})</summary>` +
      (adj.length ? `<table class="rp-table"><thead><tr><th>Time</th><th>Difficulty</th><th>What the CGFs did</th><th>Setting</th><th>Change</th><th>Aimed at</th><th>For</th><th>Source</th></tr></thead><tbody>` +
        adj.map(a => `<tr><td>${mmss(a.t)}</td><td class="${dirCls(a.pressure_direction)}">${a.pressure_direction === 'up' ? '▲ raised' : a.pressure_direction === 'down' ? '▼ lowered' : 'held'}</td>` +
          `<td>${esc(D.behaviour(a.setting, a.old, a.new))}</td><td>${esc(a.setting)}</td><td>${a.old} → ${a.new}${a.clamped ? ' (clamped)' : ''}</td>` +
          `<td>${esc(label(a.target_competency))}</td><td>${esc(servedBy(a))}</td><td>${esc(a.source)}</td></tr>`).join('') +
        '</tbody></table>' : '<p class="muted small">No CGF adjustments in this session.</p>') + '</details>';
    return `<div class="rp-moments-wrap"><h3>Key moments</h3>${events}${adjustments}</div>`;
  }

  function sessionSection(sid, rec) {
    const entries = entriesFor(sid, rec);
    if (!entries.length) return `<section class="rp-session"><h2>${esc(sessionTitle(sid))}</h2><p>No report found for this session (${esc(sid)}).</p></section>`;
    const e0 = entries[0];
    const meta = [sid, titleCase(e0.scenario), e0.mode, rec ? `seed ${rec.seed}` : null,
      rec ? dur(rec.duration_s) : null, rec ? `${titleCase(rec.platform)} crew of ${rec.crew.length}${R.partnersOf(rec).length ? ` (${R.partnersOf(rec).length} AI partner${R.partnersOf(rec).length === 1 ? '' : 's'})` : ''}` : null].filter(Boolean).join(' · ');
    return `<section class="rp-session">
      <h2>${esc(sessionTitle(sid))} <span class="rp-outcome ${outcomeCls(e0.outcome)}">${e0.outcome === 'success' ? '✓ Completed' : '✗ Failed'}</span></h2>
      <p class="muted">${esc(meta)}</p>
      ${crewTable(entries, rec)}
      ${entries.map(e => traineeSection(e, rec)).join('')}
      ${momentsSection(rec)}
    </section>`;
  }

  function render() {
    const want = sessionsToShow();
    if (want.error) { $('rpBody').innerHTML = `<p class="rp-error rp-bad">${esc(want.error)}</p>`; return; }
    const blocks = want.sessions.map(sid => sessionSection(sid, want.records[sid] || H.record(sid)));
    $('rpBody').innerHTML = blocks.join('') || '<p>No sessions to report yet. Finish a run on the host page, or open this page with ?trainee=…</p>';
    $('rpSub').textContent = want.sessions.length > 1 ? `${want.sessions.length} sessions` : want.sessions[0] ? sessionTitle(want.sessions[0]) : '';
    // Trainees on this page scroll to their section; any other trainee opens their latest report
    const here = [...document.querySelectorAll('.rp-trainee')].map(sec => ({ id: sec.id, trainee: sec.dataset.trainee, sid: sec.dataset.session }));
    const multi = new Set(here.map(h => h.sid)).size > 1;
    const others = H.trainees().filter(t => !here.some(h => h.trainee === t));
    $('rpTrainee').innerHTML = '<option value="">Jump to a trainee…</option>' +
      (here.length ? `<optgroup label="In this report">${here.map(h => `<option value="#${esc(h.id)}">${esc(nameOf(h.trainee))}${multi ? ` · ${esc(sessionTitle(h.sid))}` : ''}</option>`).join('')}</optgroup>` : '') +
      (others.length ? `<optgroup label="Other trainees (opens their latest report)">${others.map(t => `<option value="${esc(t)}">${esc(nameOf(t))}</option>`).join('')}</optgroup>` : '');
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

  // Smooth scroll to a section (instant when the user prefers reduced motion). The hash is left alone, because
  // it can hold the session record. The section gets rp-jump-target for a moment, as a hook for a highlight.
  let jumpTimer = null;
  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const h = el.querySelector('h3');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    document.querySelectorAll('.rp-jump-target').forEach(x => x.classList.remove('rp-jump-target'));
    el.classList.add('rp-jump-target');
    clearTimeout(jumpTimer);
    jumpTimer = setTimeout(() => el.classList.remove('rp-jump-target'), 2000);
  }

  // Back-to-top button: shown once the header has scrolled out of view. Fixed placement is the design lane's
  // (.rp-to-top); without it the button sits after the report.
  function initToTop() {
    const btn = $('rpTop');
    if (!btn) return;
    const update = () => { btn.hidden = window.scrollY < 400; };
    window.addEventListener('scroll', update, { passive: true });
    update();
    btn.addEventListener('click', () => {
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      const h = document.querySelector('.rp-header h1');
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    });
  }

  function init() {
    initToTop();
    $('rpPrint').addEventListener('click', () => window.print());
    // Print (button or Ctrl+P) with every collapsed section open, then put them back (R19)
    let closed = [];
    window.addEventListener('beforeprint', () => {
      const now = [...document.querySelectorAll('#rpBody details:not([open])')];   // added to, so a repeated event keeps the list
      now.forEach(d => { d.open = true; });
      closed = closed.concat(now);
    });
    window.addEventListener('afterprint', () => { closed.forEach(d => { d.open = false; }); closed = []; });
    $('rpExport').addEventListener('click', exportJson);
    $('rpTrainee').addEventListener('change', e => {
      const v = e.target.value;
      if (!v) return;
      if (v[0] === '#') jumpTo(v.slice(1)); else location.href = 'report.html?trainee=' + encodeURIComponent(v);
    });
    // Links to a trainee's section (crew table) scroll the same way
    $('rpBody').addEventListener('click', e => {
      const a = e.target.closest('a[href^="#t-"]');
      if (a) { e.preventDefault(); jumpTo(a.getAttribute('href').slice(1)); }
    });
    try { render(); } catch (err) { $('rpBody').innerHTML = `<p class="rp-error rp-bad">Could not build the report: ${esc(err.message)}</p>`; }
  }

  CGF.uiReport = { init, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
