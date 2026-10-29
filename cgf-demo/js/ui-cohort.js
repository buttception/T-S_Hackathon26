// Cohort overview (cohort.html, J6): where the whole intake is developing, so the curriculum can improve.
// It is NOT a ranking: trainees are listed in id order, never sorted by performance, and the page says so
// (design/PRINCIPLES.md, Ethical AI: "the cohort heatmap is for improving the curriculum, not for performance management").
//
// Reads Assess only (cohortSummary, profiles). Every figure is computed by Assess; this file chooses words and a
// heat level. The pure functions (CGF.cohortView.*) carry no DOM access so tests/assess.html can check them.
// Markup uses cohort-* and heat--* classes; colours come from css/cohort.css, which uses the design tokens.
// Owner: JL (assess lane).
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  const LONG = {
    hail_discipline: 'Hail discipline', collision_avoidance: 'Collision avoidance', territorial_awareness: 'Territorial awareness',
    weapons_discipline: 'Weapons discipline', speed_management: 'Speed management', threat_evaluation: 'Threat evaluation',
    contact_detection: 'Contact detection', picture_reporting: 'Picture reporting', escalation_control: 'Escalation control'
  };
  const label = k => LONG[k] || k;

  // A mean (0 to 1) to a heat level 0 (lowest) to 4 (highest) on the five-step data scale; null means no evidence
  function heatLevel(mean) {
    if (mean === null || mean === undefined || Number.isNaN(mean)) return null;
    return mean < 0.2 ? 0 : mean < 0.4 ? 1 : mean < 0.6 ? 2 : mean < 0.8 ? 3 : 4;
  }

  // One row per known trainee, in id order. Each cell is { mean, enough }: the mean only counts with enough evidence.
  function matrix(profiles, competencies, evidenceMin) {
    return profiles.slice().sort((a, b) => (a.trainee_id < b.trainee_id ? -1 : a.trainee_id > b.trainee_id ? 1 : 0)).map(p => {
      const cells = {};
      for (const k of competencies) {
        const ab = (p.competencies || {})[k], n = ab ? ab.alpha + ab.beta : 0;
        cells[k] = n >= evidenceMin ? { mean: Math.round(ab.alpha / n * 100) / 100, enough: true } : { mean: null, enough: false };
      }
      return { trainee_id: p.trainee_id, name: p.name || p.trainee_id, sessions: p.sessions_completed, cells };
    });
  }

  // The sentence under a competency in the summary, for the instructor reading the curriculum
  function summaryNote(c) {
    if (!c.rated) return 'Not measured yet: no trainee has enough evidence.';
    if (c.rated < 5) return `Only ${c.rated} trainee${c.rated === 1 ? '' : 's'} rated, so treat the mean with care.`;
    if (c.share_below_half >= 0.4) return `${Math.round(c.share_below_half * 100)}% of rated trainees are below 0.50: a candidate for more practice time.`;
    return `${c.below_half} of ${c.rated} rated trainees are below 0.50.`;
  }

  CGF.cohortView = { LONG, label, heatLevel, matrix, summaryNote };

  // ------------------------------------------------------------ page
  if (!document.getElementById('cohortApp')) return;   // loaded by the test page: functions only

  const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const st = { names: false };

  function render() {
    const A = CGF.Assess, C = CGF.contracts, sum = A.cohortSummary(), comps = C.COMPETENCIES;
    $('cohortCount').textContent = `${sum.trainees} trainees in the seeded cohort. A competency counts for a trainee only with enough evidence (at least ${A.EVIDENCE_MIN} events' worth).`;

    $('cohortSummary').innerHTML = '<thead><tr><th>Competency</th><th>Rated</th><th>Cohort mean</th><th>Below 0.50</th><th>What it suggests</th></tr></thead><tbody>' +
      comps.map(k => {
        const c = sum.competencies[k];
        return `<tr><td>${esc(label(k))}</td><td class="num">${c.rated} of ${sum.trainees}</td>` +
          `<td>${c.mean === null ? '<span class="muted">no evidence</span>' : `<span class="cohort-bar"><i style="width:${Math.round(c.mean * 100)}%"></i></span> <span class="val">${c.mean.toFixed(2)}</span>`}</td>` +
          `<td class="num">${c.rated ? `${c.below_half} (${Math.round(c.share_below_half * 100)}%)` : '—'}</td><td class="small">${esc(summaryNote(c))}</td></tr>`;
      }).join('') + '</tbody>';

    const rows = matrix(A.profiles(), comps, A.EVIDENCE_MIN);
    $('cohortMatrix').innerHTML = '<thead><tr><th>Trainee</th><th>Sessions</th>' + comps.map(k => `<th>${esc(label(k))}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => `<tr><th scope="row">${esc(st.names ? r.name : r.trainee_id)}</th><td class="num">${r.sessions}</td>` + comps.map(k => {
        const cell = r.cells[k], lv = heatLevel(cell.mean);
        return cell.enough ? `<td class="heat heat--${lv}" title="mean ${cell.mean.toFixed(2)}">${cell.mean.toFixed(2)}</td>`
          : '<td class="heat heat--none" title="not enough evidence yet">—</td>';
      }).join('') + '</tr>').join('') + '</tbody>';
  }

  $('showNames').onchange = e => { st.names = e.target.checked; render(); };
  render();
})();
