// Debrief charts: inline SVG built from the session record and the history, for report.html.
//
//   ReportCharts.timeline(record, trainee_id)   -> svg   CGF pressure over the run above the trainee's results on the target
//   ReportCharts.profile(entry, next)           -> svg   each competency: profile at start, this session, next session
//   ReportCharts.trend(entries, competency, next) -> svg one competency across the trainee's sessions
//   ReportCharts.series(record, trainee_id)     -> the computed series behind timeline (also used by the tests)
//
// Every value plotted is computed here from the record; nothing is estimated. Colours are role variables
// (--rp-chart-pressure, --rp-chart-ok, --rp-chart-miss and the rest of ROLE below) that fall back to the theme
// tokens, so the design lane restyles them from CSS; every element also carries an rp-chart-* class. Misses are
// a different shape (hollow ring) as well as a different colour. Owner: Glenda (report lane). Needs report.js and debrief.js.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};
  const R = CGF.Report, D = CGF.Debrief;
  const WINDOW = 10;                         // rolling window, as the live signal (INTERFACES §6)
  const BAND = [0.4, 0.7];                   // the default challenge band (§6)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const label = k => R.LABELS[k] || k;
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const r1 = v => Math.round(v * 10) / 10;
  // Each chart role has its own variable, --rp-chart-<role>, for the design lane to set in css/tokens.css;
  // until it does, the role falls back to the theme token named here. miss = a missed event (success-rate chart),
  // focus = a focus area (competencies chart)
  const ROLE = { label: 'muted', title: 'text', grid: 'line', base: 'muted', band: 'line', track: 'line', bg: 'bg',
    'phase-up': 'warn', 'phase-down': 'accent', pressure: 'warn', rate: 'text', ok: 'accent', miss: 'warn', focus: 'warn',
    start: 'muted', next: 'text', trend: 'accent', pressed: 'warn' };
  const colour = role => `var(--rp-chart-${role}, var(--${ROLE[role]}))`;
  const st = (prop, role, extra) => `style="${prop}:${colour(role)}${extra ? ';' + extra : ''}"`;
  const ring = role => `style="fill:${colour('bg')};stroke:${colour(role)}" stroke-width="2.5"`;   // hollow marker
  const txt = (x, y, s, cls, anchor) => `<text class="rp-chart-${cls || 'label'}" x="${r1(x)}" y="${r1(y)}"${anchor ? ` text-anchor="${anchor}"` : ''} font-size="${cls === 'title' ? 12 : 11}"${cls === 'title' ? ' font-weight="600"' : ''} ${st('fill', cls === 'title' ? 'title' : 'label')}>${esc(s)}</text>`;
  const svgOpen = (w, h, cls, aria) => `<svg class="rp-chart ${cls}" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(aria)}" preserveAspectRatio="xMinYMin meet"><title>${esc(aria)}</title>`;

  // ------------------------------------------------------------ session timeline
  // The trainee's main target this run: the competency most of their phases aimed at, else their most-tested one
  function series(record, id) {
    const w = D.why(record, id);
    const tally = {};
    for (const p of w.phases) tally[p.target] = (tally[p.target] || 0) + p.adjustments.length;
    let target = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || null;
    if (!target) {
      const n = {};
      for (const e of record.events) if (e.trainee_id === id && e.competency) n[e.competency] = (n[e.competency] || 0) + 1;
      target = Object.keys(n).sort((a, b) => n[b] - n[a])[0] || null;
    }
    // Pressure: +1 for each sharper step, -1 for each easing step, over the adjustments that served this trainee
    const steps = [];
    let level = 0;
    for (const p of w.phases) for (const a of p.adjustments) {
      level += a.pressure_direction === 'up' ? 1 : a.pressure_direction === 'down' ? -1 : 0;
      steps.push({ t: a.t, level });
    }
    // The trainee's results on the target, with the success rate over the last WINDOW of them
    const results = [], recent = [];
    for (const e of record.events) {
      if (e.trainee_id !== id || e.competency !== target || (e.outcome !== 'success' && e.outcome !== 'fail')) continue;
      recent.push(e.outcome === 'success' ? 1 : 0);
      if (recent.length > WINDOW) recent.shift();
      results.push({ t: e.t, outcome: e.outcome, type: e.type, rate: recent.reduce((s, v) => s + v, 0) / recent.length });
    }
    const end = Math.max(record.duration_s || 0, ...record.events.map(e => e.t), ...record.adjustments.map(a => a.t), 60);
    return { target, steps, results, phases: w.phases, end };
  }

  function timeline(record, id) {
    const s = series(record, id);
    if (!s.steps.length && !s.results.length) return '';
    const W = 760, L = 72, Rm = 14, P1 = [24, 96], P2 = [134, 220], H = 250;
    const x = t => L + (t / s.end) * (W - L - Rm);
    const top = Math.max(1, ...s.steps.map(p => Math.abs(p.level)));
    const yP = v => P1[1] - ((v + (s.steps.some(p => p.level < 0) ? top : 0)) / (s.steps.some(p => p.level < 0) ? 2 * top : top)) * (P1[1] - P1[0]);
    const yR = v => P2[1] - v * (P2[1] - P2[0]);
    const out = [svgOpen(W, H, 'rp-chart-timeline', `CGF pressure and ${label(s.target)} results over the run`)];

    // Phase spans across both panels
    for (const p of s.phases) {
      const x0 = x(p.t0), x1 = Math.max(x(p.t1), x0 + 4);
      out.push(`<rect class="rp-chart-phase rp-chart-phase-${p.direction}" x="${r1(x0)}" y="${P1[0]}" width="${r1(x1 - x0)}" height="${P2[1] - P1[0]}" ${st('fill', p.direction === 'up' ? 'phase-up' : 'phase-down', 'opacity:.12')}/>`);
    }
    // Time axis
    const tick = s.end > 1500 ? 300 : 120;
    for (let t = 0; t <= s.end; t += tick) {
      out.push(`<line class="rp-chart-grid" x1="${r1(x(t))}" x2="${r1(x(t))}" y1="${P1[0]}" y2="${P2[1]}" ${st('stroke', 'grid')}/>`);
      out.push(txt(x(t), H - 12, mmss(t), 'tick', 'middle'));
    }

    // Panel 1: CGF pressure, a step line from base
    out.push(txt(L, P1[0] - 8, 'CGF pressure (above the instructor\u2019s base settings)', 'title'), txt(L - 6, P1[0] + 10, 'harder', 'hint', 'end'), txt(L - 6, yP(0) + 4, 'base', 'hint', 'end'));
    out.push(`<line class="rp-chart-base" x1="${L}" x2="${W - Rm}" y1="${r1(yP(0))}" y2="${r1(yP(0))}" ${st('stroke', 'base', 'stroke-dasharray:3 3')}/>`);
    if (s.steps.length) {
      let d = `M${L},${r1(yP(0))}`;
      for (const p of s.steps) d += ` H${r1(x(p.t))} V${r1(yP(p.level))}`;
      d += ` H${W - Rm}`;
      out.push(`<path class="rp-chart-pressure" d="${d}" fill="none" stroke-width="2.5" ${st('stroke', 'pressure')}/>`);
      for (const p of s.steps) out.push(`<circle class="rp-chart-step" cx="${r1(x(p.t))}" cy="${r1(yP(p.level))}" r="3" ${st('fill', 'pressure')}/>`);
    } else out.push(txt(L + 8, P1[0] + 30, 'No CGF adjustments served this trainee', 'hint'));

    // Panel 2: the trainee's results on the target, with the rolling success rate and the challenge band
    out.push(txt(L, P2[0] - 8, `Trainee\u2019s ${label(s.target).toLowerCase()}: success rate over the last ${WINDOW} events`, 'title'));
    out.push(`<rect class="rp-chart-band" x="${L}" y="${r1(yR(BAND[1]))}" width="${W - L - Rm}" height="${r1(yR(BAND[0]) - yR(BAND[1]))}" ${st('fill', 'band', 'opacity:.55')}/>`);
    out.push(txt(W - Rm - 4, yR(BAND[1]) + 12, 'target band', 'hint', 'end'));
    for (const v of [0, 0.5, 1]) out.push(txt(L - 6, yR(v) + 4, Math.round(v * 100) + '%', 'tick', 'end'));
    if (s.results.length) {
      out.push(`<polyline class="rp-chart-rate" points="${s.results.map(p => `${r1(x(p.t))},${r1(yR(p.rate))}`).join(' ')}" fill="none" stroke-width="2" ${st('stroke', 'rate', 'opacity:.7')}/>`);
      for (const p of s.results) {
        const ok = p.outcome === 'success';
        out.push(`<circle class="rp-chart-ev rp-chart-ev-${ok ? 'ok' : 'fail'}" cx="${r1(x(p.t))}" cy="${r1(yR(p.rate))}" r="5" ` +
          (ok ? st('fill', 'ok') : `fill="none" stroke-width="2.5" ${st('stroke', 'miss')}`) +
          `><title>${esc(mmss(p.t))} ${esc((R.EVENT_LABELS[p.type] || p.type).toLowerCase())}</title></circle>`);
      }
    } else out.push(txt(L + 8, P2[0] + 30, 'No results on this competency', 'hint'));
    out.push('</svg>');
    return out.join('');
  }

  // ------------------------------------------------------------ competency profile
  // next: the result of Debrief.next for this trainee (optional); its projected means come from nextProfile
  function profile(entry, nextComps) {
    const f = entry.report.facts;
    // Competencies with something to show: tested this session, in the next-session profile, or off the prior
    const keys = R.COMPETENCIES.filter(k => f.events_by_competency[k] || (nextComps && nextComps[k]) || f.competency_means_start[k] !== 0.5);
    if (!keys.length) return '';
    const W = 760, L = 170, Rm = 64, row = 30, H = keys.length * row + 40;
    const x = v => L + v * (W - L - Rm);
    const out = [svgOpen(W, H, 'rp-chart-profile', 'Competencies: profile at start, this session and next session')];
    out.push(`<rect class="rp-chart-band" x="${r1(x(BAND[0]))}" y="4" width="${r1(x(BAND[1]) - x(BAND[0]))}" height="${keys.length * row}" ${st('fill', 'band', 'opacity:.35')}/>`);
    keys.forEach((k, i) => {
      const y = 4 + i * row, mid = y + row / 2;
      const m0 = f.competency_means_start[k], c = f.events_by_competency[k];
      const rate = c && c.success + c.fail ? c.success / (c.success + c.fail) : null;
      const n = nextComps && nextComps[k] ? nextComps[k].alpha / (nextComps[k].alpha + nextComps[k].beta) : null;
      out.push(txt(L - 10, mid + 4, label(k), 'label', 'end'));
      out.push(`<rect class="rp-chart-track" x="${L}" y="${mid - 5}" width="${W - L - Rm}" height="10" rx="5" ${st('fill', 'track', 'opacity:.6')}/>`);
      out.push(`<rect class="rp-chart-start" x="${L}" y="${mid - 5}" width="${r1(x(m0) - L)}" height="10" rx="5" ${st('fill', 'start', 'opacity:.75')}><title>Profile at start: ${m0}</title></rect>`);
      if (rate != null) out.push(`<circle class="rp-chart-ev rp-chart-ev-${rate >= R.STRONG_FROM ? 'ok' : rate <= R.WEAK_TO ? 'fail' : 'mid'}" cx="${r1(x(rate))}" cy="${mid}" r="6" ` +
        (rate > R.WEAK_TO ? st('fill', 'ok') : ring('focus')) +
        `><title>This session: ${c.success} of ${c.success + c.fail}</title></circle>`);
      if (n != null) out.push(`<line class="rp-chart-next" x1="${r1(x(n))}" x2="${r1(x(n))}" y1="${mid - 10}" y2="${mid + 10}" stroke-width="3" ${st('stroke', 'next')}><title>Next session: ${Math.round(n * 100) / 100}</title></line>`);
      out.push(txt(W - Rm + 16, mid + 4, rate == null ? '—' : Math.round(rate * 100) + '%', 'value'));
    });
    const ly = keys.length * row + 26;
    out.push(`<rect x="${L}" y="${ly - 9}" width="18" height="10" rx="5" ${st('fill', 'start', 'opacity:.75')}/>`, txt(L + 24, ly, 'profile at start'));
    out.push(`<circle cx="${L + 140}" cy="${ly - 4}" r="5" ${st('fill', 'ok')}/>`, txt(L + 150, ly, 'this session'));
    out.push(`<circle cx="${L + 250}" cy="${ly - 4}" r="5" fill="none" stroke-width="2.5" ${st('stroke', 'focus')}/>`, txt(L + 260, ly, 'focus area'));
    if (nextComps) out.push(`<line x1="${L + 360}" x2="${L + 360}" y1="${ly - 10}" y2="${ly + 2}" stroke-width="3" ${st('stroke', 'next')}/>`, txt(L + 368, ly, 'next session'));
    out.push('</svg>');
    return out.join('');
  }

  // ------------------------------------------------------------ one competency across sessions
  const shortDate = sid => { const m = /_(\d{4})(\d{2})(\d{2})_/.exec(sid || ''); return m ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]}` : sid; };
  function trend(entries, k, nextMean) {
    const pts = entries.map(e => ({ v: e.report.facts.competency_means_start[k], pressed: e.top_target === k, label: shortDate(e.session_id) }))
      .filter(p => p.v != null);
    if (nextMean != null) pts.push({ v: nextMean, pressed: null, label: 'next' });
    if (pts.length < 2) return '';
    const W = 760, L = 40, Rm = 24, T = 14, B = 150, H = 196;
    const x = i => L + 20 + i * ((W - L - Rm - 40) / (pts.length - 1)), y = v => B - v * (B - T);
    const out = [svgOpen(W, H, 'rp-chart-trend', `${label(k)} across ${pts.length - (nextMean != null ? 1 : 0)} sessions`)];
    out.push(`<rect class="rp-chart-band" x="${L}" y="${r1(y(BAND[1]))}" width="${W - L - Rm}" height="${r1(y(BAND[0]) - y(BAND[1]))}" ${st('fill', 'band', 'opacity:.45')}/>`);
    for (const v of [0, 0.5, 1]) out.push(`<line class="rp-chart-grid" x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}" ${st('stroke', 'grid')}/>`, txt(L - 6, y(v) + 4, v.toFixed(1), 'tick', 'end'));
    const solid = pts.slice(0, nextMean != null ? -1 : undefined);
    out.push(`<polyline class="rp-chart-line" points="${solid.map((p, i) => `${r1(x(i))},${r1(y(p.v))}`).join(' ')}" fill="none" stroke-width="2.5" ${st('stroke', 'trend')}/>`);
    if (nextMean != null) {
      const i = pts.length - 1;
      out.push(`<line class="rp-chart-line-next" x1="${r1(x(i - 1))}" y1="${r1(y(pts[i - 1].v))}" x2="${r1(x(i))}" y2="${r1(y(pts[i].v))}" stroke-width="2.5" ${st('stroke', 'trend', 'stroke-dasharray:5 4')}/>`);
    }
    pts.forEach((p, i) => {
      const fill = p.pressed ? st('fill', 'pressed') : ring(p.pressed === null ? 'next' : 'trend');
      out.push(`<circle class="rp-chart-pt${p.pressed ? ' rp-chart-pressed' : ''}" cx="${r1(x(i))}" cy="${r1(y(p.v))}" r="6" ${fill}><title>${esc(p.label)}: ${p.v}${p.pressed ? ' (CGFs pressed it)' : ''}</title></circle>`);
      out.push(txt(x(i), y(p.v) - 12, String(p.v), 'value', 'middle'), txt(x(i), B + 20, p.label, 'tick', 'middle'));
    });
    out.push(`<circle cx="${L + 26}" cy="${H - 12}" r="5" ${st('fill', 'pressed')}/>`, txt(L + 36, H - 8, 'session where the CGFs pressed it'));
    out.push(`<circle cx="${L + 266}" cy="${H - 12}" r="5" fill="none" stroke-width="2" ${st('stroke', 'trend')}/>`, txt(L + 276, H - 8, 'not pressed'));
    out.push('</svg>');
    return out.join('');
  }

  CGF.ReportCharts = { WINDOW, BAND, series, timeline, profile, trend };
})();
