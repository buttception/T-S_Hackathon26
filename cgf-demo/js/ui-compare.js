// Run comparison (compare.html): a fixed-mode baseline beside an adaptive run on the same seed and crew, so the
// instructor (and the judges) can see what the adaptation changed and why. Reads Runs only; every figure comes from
// Runs.compare and the sentences are its templates.
//
//   compare.html                       the latest adaptive run, against its fixed baseline if there is one
//   compare.html?run=<id>              that run, against its fixed baseline
//   compare.html?run=<id>&baseline=<id>
//
// The pure function CGF.compareView.choose carries no DOM access so tests/assess.html can check it.
// Markup uses compare-* classes; css/compare.css uses the design tokens. Owner: JL (assess lane).
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  // Which two runs to show. Returns { run, baseline, problem }. `runs` is Runs.list(); `query` is { run?, baseline? }.
  function choose(runs, query) {
    query = query || {};
    if (!runs.length) return { run: null, baseline: null, problem: 'none' };
    const byId = id => runs.find(r => r.session_id === id) || null;
    const run = query.run ? byId(query.run) : runs.slice().reverse().find(r => r.mode === 'adaptive') || runs[runs.length - 1];
    if (!run) return { run: null, baseline: null, problem: 'missing-run' };
    if (run.mode !== 'adaptive') return { run, baseline: null, problem: 'not-adaptive' };
    const baseline = query.baseline ? byId(query.baseline) : CGF.Runs.baselineFor(run, runs);
    if (query.baseline && !baseline) return { run, baseline: null, problem: 'missing-baseline' };
    return { run, baseline, problem: baseline ? null : 'no-baseline' };
  }

  CGF.compareView = { choose };

  // ------------------------------------------------------------ page
  if (!document.getElementById('compareApp')) return;   // loaded by the test page: functions only

  const $ = id => document.getElementById(id), esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const qs = new URLSearchParams(location.search);
  const query = { run: qs.get('run'), baseline: qs.get('baseline') };
  const label = k => CGF.cohortView.label(k);
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const optionLabel = r => `${r.session_id} · ${r.mode} · seed ${r.seed} · ${r.outcome}`;

  const PROBLEMS = {
    none: 'No runs are saved in this browser yet. Run a session from the host page and it appears here.',
    'missing-run': 'That run is not saved in this browser.',
    'not-adaptive': 'That run was a fixed-mode run, which is the baseline. Pick an adaptive run to compare against a baseline.',
    'missing-baseline': 'That baseline is not saved in this browser.',
    'no-baseline': 'There is no fixed-mode baseline for this run yet. Go back to the allocation page, keep the same platform, crew, scenario and seed, set Mode to Fixed assessment, run it, and return here.'
  };

  function sideTable(b, r) {
    const row = (name, x, y) => `<tr><th scope="row">${esc(name)}</th><td>${x}</td><td>${y}</td></tr>`;
    return '<table class="compare-table"><thead><tr><th></th><th>Fixed baseline</th><th>This run (adaptive)</th></tr></thead><tbody>' +
      row('Session', esc(b.session_id), esc(r.session_id)) + row('Outcome', esc(b.outcome), esc(r.outcome)) +
      row('Length', mmss(b.duration_s), mmss(r.duration_s)) + row('Events', b.events, r.events) + row('Adjustments by the AI', b.adjustments, r.adjustments) + '</tbody></table>' +
      `<p class="small muted">Same seed ${esc(r.seed)}, scenario ${esc(r.scenario)}, ${esc(r.platform)}, crew ${r.crew.map(m => `${esc(m.seat)} ${esc(m.trainee_id)}`).join(' · ')}.</p>`;
  }

  function competencyTable(c) {
    const bar = rate => rate === null ? '<span class="muted">—</span>' : `<span class="compare-bar"><i style="width:${Math.round(rate * 100)}%"></i></span> <span class="val">${Math.round(rate * 100)}%</span>`;
    return '<table class="compare-table"><thead><tr><th>Competency</th><th>Baseline</th><th>This run</th><th>Change</th><th>Adjustments aimed at it</th></tr></thead><tbody>' +
      c.by_competency.map(x => `<tr><th scope="row">${esc(label(x.competency))}</th>` +
        `<td>${bar(x.baseline.rate)} <span class="muted small">${x.baseline.success}/${x.baseline.success + x.baseline.fail}</span></td>` +
        `<td>${bar(x.run.rate)} <span class="muted small">${x.run.success}/${x.run.success + x.run.fail}</span></td>` +
        `<td class="num">${x.delta === null ? '<span class="muted" title="too few events in one of the runs">—</span>' : (x.delta >= 0 ? '+' : '') + Math.round(x.delta * 100) + ' pts'}</td>` +
        `<td class="num">${x.adjustments_aimed}</td></tr>`).join('') + '</tbody></table>' +
      '<p class="small muted">Rates are successes over counted events. "—" means fewer than 3 events in one of the runs, so no change is claimed.</p>';
  }

  function settingsTable(c) {
    if (!c.adjustments.settings.length) return '<p class="muted">The AI made no adjustments in this run.</p>';
    return '<table class="compare-table"><thead><tr><th>Setting</th><th>Changes</th><th>From</th><th>To</th></tr></thead><tbody>' +
      c.adjustments.settings.map(s => `<tr><th scope="row">${esc(s.setting)}</th><td class="num">${s.changes}</td><td class="num">${s.first_old}</td><td class="num">${s.last_new}</td></tr>`).join('') + '</tbody></table>';
  }

  function render() {
    const runs = CGF.Runs.list(), pick = choose(runs, query);
    $('pickRun').innerHTML = runs.slice().reverse().map(r => `<option value="${esc(r.session_id)}" ${pick.run && r.session_id === pick.run.session_id ? 'selected' : ''}>${esc(optionLabel(r))}</option>`).join('');
    $('pickBaseline').innerHTML = '<option value="">Find automatically</option>' + runs.filter(r => r.mode === 'fixed').reverse()
      .map(r => `<option value="${esc(r.session_id)}" ${pick.baseline && query.baseline === r.session_id ? 'selected' : ''}>${esc(optionLabel(r))}</option>`).join('');
    if (pick.problem || !pick.run || !pick.baseline) { $('compareBody').innerHTML = `<p class="compare-problem">${esc(PROBLEMS[pick.problem] || '')}</p>`; return; }
    const c = CGF.Runs.compare(pick.baseline, pick.run);
    $('compareBody').innerHTML = '<h2>The two runs</h2>' + sideTable(c.baseline, c.run) + '<h2>By competency</h2>' + competencyTable(c) +
      '<h2>What the AI changed</h2>' + settingsTable(c) + '<h2>In words</h2><ul class="compare-notes">' + c.notes.map(n => `<li>${esc(n)}</li>`).join('') + '</ul>';
  }

  $('pickRun').onchange = e => { query.run = e.target.value; query.baseline = $('pickBaseline').value || null; render(); };
  $('pickBaseline').onchange = e => { query.baseline = e.target.value || null; render(); };
  render();
})();
