// Trainee allocation page (allocate.html): pick trainees from the seeded roster, put one in each run slot
// (pane A, pane B), set the shared run options, and hand off one scenario config per slot
// (docs/INTERFACES.md §3). Starting the run is linked later; this page only produces valid configs.
//
// The pure functions (CGF.allocate.*) carry no DOM access so tests/allocate.html can check them.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, C = CGF.contracts;

  const STORE_KEY = 'cgf.allocation';         // localStorage: [configA, configB]
  const SLOTS = ['A', 'B'];
  const SUPPORTED = ['strait-transit'];        // scenarios with a competency signal (G1)
  const DEFAULTS = { scenario: 'strait-transit', seed: 1234, mode: 'adaptive', duration_s: 1200, eval_interval_s: 30 };
  const LABELS = {
    hail_discipline: 'Hail', collision_avoidance: 'Collision', territorial_awareness: 'Territorial',
    weapons_discipline: 'Weapons', piracy_response: 'Piracy'
  };

  // ------------------------------------------------------------ pure functions
  const mean = c => c.alpha / (c.alpha + c.beta);

  // Per competency: alpha, beta, mean, evidence n, whether n is enough, and whether it is the bare prior
  function summarise(profile) {
    const out = {};
    for (const k of C.COMPETENCIES) {
      const c = profile.competencies[k], ab = c || C.PRIOR, n = ab.alpha + ab.beta;
      out[k] = { alpha: ab.alpha, beta: ab.beta, mean: mean(ab), n, enough: n >= C.EVIDENCE_MIN, prior: !c };
    }
    return out;
  }

  // Next seed from the current one (31-bit LCG): repeatable, no Math.random
  const nextSeed = s => (Math.imul(s >>> 0, 1103515245) + 12345) & 0x7fffffff;

  // Field-level problems with a selection, as { field: message }. Empty object = ready.
  function checkSelection(sel, scenarioIds) {
    const e = {}, o = sel.opts;
    for (const s of SLOTS) {
      if (!sel.slots[s]) e['slot' + s] = `Pick a trainee for slot ${s}.`;
      else if (!sel.agents[s]) e['agent' + s] = `Pick a scripted agent for slot ${s}.`;
    }
    if (sel.slots.A && sel.slots.A === sel.slots.B) e.slotB = 'Slots A and B need different trainees.';
    if (!SUPPORTED.includes(o.scenario)) e.scenario = 'This scenario has no competency signal yet.';
    else if (scenarioIds && !scenarioIds.includes(o.scenario)) e.scenario = 'Scenario is not loaded.';
    if (!Number.isInteger(o.seed) || o.seed < 0) e.seed = 'Seed must be a whole number, 0 or more.';
    if (!(o.duration_s > 0)) e.duration_s = 'Duration must be more than 0.';
    if (!(o.eval_interval_s > 0)) e.eval_interval_s = 'Interval must be more than 0.';
    else if (o.eval_interval_s >= o.duration_s) e.eval_interval_s = 'Interval must be shorter than the duration.';
    return e;
  }

  // One §3 scenario config per slot, in slot order (A, B). Both share scenario, seed, mode, timing and envelope.
  function buildRunConfigs(sel, envelope) {
    const o = sel.opts, scenario_id = `${o.scenario.replace(/-/g, '_')}_${o.seed}`;
    return SLOTS.map(s => ({
      scenario_id, scenario: o.scenario, seed: o.seed, mode: o.mode,
      duration_s: o.duration_s, eval_interval_s: o.eval_interval_s,
      envelope: JSON.parse(JSON.stringify(envelope)),
      trainee: { trainee_id: sel.slots[s], agent_profile: sel.agents[s] }
    }));
  }

  // Inverse of buildRunConfigs, for restoring a saved allocation. Returns null if it doesn't fit.
  function selectionFrom(configs) {
    if (!Array.isArray(configs) || configs.length !== SLOTS.length) return null;
    if (configs.some(c => C.validateScenarioConfig(c).length)) return null;
    const a = configs[0];
    return {
      slots: { A: configs[0].trainee.trainee_id, B: configs[1].trainee.trainee_id },
      agents: { A: configs[0].trainee.agent_profile, B: configs[1].trainee.agent_profile },
      opts: { scenario: a.scenario, seed: a.seed, mode: a.mode, duration_s: a.duration_s, eval_interval_s: a.eval_interval_s }
    };
  }

  const handoffUrl = configs => 'host.html?alloc=' + encodeURIComponent(JSON.stringify(configs));

  CGF.allocate = { STORE_KEY, SLOTS, SUPPORTED, DEFAULTS, mean, summarise, nextSeed, checkSelection,
    buildRunConfigs, selectionFrom, handoffUrl };

  // ------------------------------------------------------------ page
  if (!document.getElementById('allocApp')) return;   // loaded by the test page: functions only

  const F = window.CGF_FIXTURES || {};
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const st = {
    profiles: [], summaries: {}, envelope: null, scenarioIds: [],
    slots: { A: null, B: null }, agents: { A: '', B: '' }, active: 'A',
    opts: Object.assign({}, DEFAULTS), sortKey: 'trainee_id', sortDir: 1, weakAt: '', status: ''
  };

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } },
    write(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  function barColor(m) { return m < 0.4 ? '#ff7b54' : m < 0.6 ? '#ffd166' : '#4dd17a'; }

  function compCell(s) {
    const title = s.prior ? 'No data: prior alpha 1, beta 1'
      : `mean ${s.mean.toFixed(2)} · alpha ${s.alpha}, beta ${s.beta} · evidence ${s.n}${s.enough ? '' : ' (not enough, needs ' + C.EVIDENCE_MIN + ')'}`;
    const cls = s.prior ? 'bar prior' : s.enough ? 'bar' : 'bar thin';
    return `<td title="${esc(title)}"><div class="${cls}"><i style="width:${(s.mean * 100).toFixed(0)}%;background:${barColor(s.mean)}"></i></div>` +
      `<span class="val">${s.prior ? '—' : s.mean.toFixed(2)}</span></td>`;
  }

  function sortedRows() {
    let rows = st.profiles.slice();
    if (st.weakAt) rows = rows.filter(p => { const s = st.summaries[p.trainee_id][st.weakAt]; return s.enough && s.mean < 0.5; });
    const key = p => st.sortKey === 'trainee_id' ? p.trainee_id
      : st.sortKey === 'sessions' ? p.sessions_completed : st.summaries[p.trainee_id][st.sortKey].mean;
    return rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * st.sortDir; });
  }

  function renderRoster() {
    const head = [['trainee_id', 'Trainee'], ['sessions', 'Sessions'], ...C.COMPETENCIES.map(k => [k, LABELS[k]])]
      .map(([k, l]) => `<th data-sort="${k}" class="${st.sortKey === k ? 'sorted' : ''}">${l}${st.sortKey === k ? (st.sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const rows = sortedRows();
    const body = rows.map(p => {
      const sum = st.summaries[p.trainee_id], inSlot = SLOTS.find(s => st.slots[s] === p.trainee_id);
      return `<tr data-id="${esc(p.trainee_id)}" class="${inSlot ? 'taken' : ''}">` +
        `<td class="id">${inSlot ? `<span class="slotTag">${inSlot}</span>` : ''}${esc(p.trainee_id)}</td>` +
        `<td class="num">${p.sessions_completed}</td>` + C.COMPETENCIES.map(k => compCell(sum[k])).join('') + '</tr>';
    }).join('');
    $('roster').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body ||
      `<tr><td colspan="${2 + C.COMPETENCIES.length}" class="muted">No trainee matches this filter.</td></tr>`}</tbody>`;
    $('rosterCount').textContent = `${rows.length} of ${st.profiles.length} trainees`;
  }

  function renderSlots(errs) {
    const agents = F.agentProfiles || [];
    $('slots').innerHTML = SLOTS.map(s => {
      const id = st.slots[s], e = errs['slot' + s] || errs['agent' + s];
      const sum = id && st.summaries[id];
      const mini = sum ? C.COMPETENCIES.map(k => `<span title="${LABELS[k]}: ${sum[k].prior ? 'no data' : sum[k].mean.toFixed(2)}">` +
        `<b style="background:${sum[k].prior ? 'var(--line)' : barColor(sum[k].mean)}"></b>${LABELS[k]}</span>`).join('') : '';
      return `<div class="slot ${st.active === s ? 'active' : ''}" data-slot="${s}">` +
        `<div class="slotHead"><span class="slotName">Pane ${s}</span>` +
        `<span class="grow">${id ? `<b>${esc(id)}</b>` : `<span class="muted">${st.active === s ? 'Click a trainee in the roster' : 'Click here, then a trainee'}</span>`}</span>` +
        (id ? `<button data-clear="${s}" title="Clear slot ${s}">Clear</button>` : '') + '</div>' +
        (sum ? `<div class="mini">${mini}</div>` : '') +
        `<label class="field"><span>Scripted agent</span><select data-agent="${s}"><option value="">Choose…</option>` +
        agents.map(a => `<option value="${esc(a.path)}" ${st.agents[s] === a.path ? 'selected' : ''}>${esc(a.label)}</option>`).join('') +
        '</select></label>' + (e ? `<div class="err">${esc(e)}</div>` : '') + '</div>';
    }).join('');
  }

  function renderOptions(errs) {
    for (const f of ['scenario', 'seed', 'duration_s', 'eval_interval_s']) $('err_' + f).textContent = errs[f] || '';
  }

  function render() {
    const errs = checkSelection(st, st.scenarioIds), ready = !Object.keys(errs).length;
    renderRoster(); renderSlots(errs); renderOptions(errs);
    let configs = null, cErrs = [];
    if (ready) {
      configs = buildRunConfigs(st, st.envelope);
      cErrs = configs.flatMap((c, i) => C.validateScenarioConfig(c, { scenarios: st.scenarioIds }).map(m => `Slot ${SLOTS[i]}: ${m}`));
    }
    const ok = ready && !cErrs.length;
    $('btnSave').disabled = $('btnExport').disabled = !ok;
    $('output').textContent = ok ? JSON.stringify(configs, null, 2) : '';
    $('outputNote').innerHTML = ok ? 'Two valid scenario configs (INTERFACES §3), slot A first.'
      : cErrs.length ? cErrs.map(esc).join('<br>') : `<span class="muted">Fill both slots and fix the marked fields to build the configs.</span>`;
    $('handoffUrl').value = ok ? handoffUrl(configs) : '';
    $('status').textContent = st.status;
    return ok ? configs : null;
  }

  function assign(id) {
    const other = st.active === 'A' ? 'B' : 'A';
    if (st.slots[other] === id) st.slots[other] = null;   // moving a trainee between slots
    st.slots[st.active] = id;
    if (!st.agents[st.active]) st.agents[st.active] = (F.defaultAgent || {})[id] || ((F.agentProfiles || [])[0] || {}).path || '';
    if (!st.slots[other]) st.active = other;
    st.status = '';
    render();
  }

  function readOpts() {
    const num = id => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
    st.opts = { scenario: $('optScenario').value, seed: num('optSeed'), mode: $('optMode').value,
      duration_s: num('optDuration'), eval_interval_s: num('optInterval') };
  }
  function writeOpts() {
    $('optScenario').value = st.opts.scenario; $('optSeed').value = st.opts.seed; $('optMode').value = st.opts.mode;
    $('optDuration').value = st.opts.duration_s; $('optInterval').value = st.opts.eval_interval_s;
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function wire() {
    $('roster').addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (th) {   // first click on a column sorts ascending, so the weakest trainee comes first
        const k = th.dataset.sort;
        st.sortDir = st.sortKey === k ? -st.sortDir : 1; st.sortKey = k;
        return render();
      }
      const tr = e.target.closest('tr[data-id]');
      if (tr) assign(tr.dataset.id);
    });
    $('slots').addEventListener('click', e => {
      const clr = e.target.closest('[data-clear]');
      if (clr) { const s = clr.dataset.clear; st.slots[s] = null; st.agents[s] = ''; st.active = s; return render(); }
      const slot = e.target.closest('.slot');
      if (slot && !e.target.closest('select')) { st.active = slot.dataset.slot; render(); }
    });
    $('slots').addEventListener('change', e => {
      const s = e.target.dataset.agent;
      if (s) { st.agents[s] = e.target.value; render(); }
    });
    $('btnSwap').onclick = () => {
      [st.slots.A, st.slots.B] = [st.slots.B, st.slots.A];
      [st.agents.A, st.agents.B] = [st.agents.B, st.agents.A];
      render();
    };
    $('weakAt').onchange = e => { st.weakAt = e.target.value; render(); };
    for (const id of ['optScenario', 'optSeed', 'optMode', 'optDuration', 'optInterval'])
      $(id).addEventListener('input', () => { readOpts(); st.status = ''; render(); });
    $('btnReroll').onclick = () => {
      st.opts.seed = nextSeed(Number.isInteger(st.opts.seed) ? st.opts.seed : DEFAULTS.seed);
      writeOpts(); render();
    };
    $('btnSave').onclick = () => {
      const configs = render(); if (!configs) return;
      st.status = store.write(configs) ? `Saved to this browser (${STORE_KEY}).` : 'Browser storage is blocked here. Use the link or Export JSON instead.';
      render();
    };
    $('btnExport').onclick = () => {
      const configs = render(); if (!configs) return;
      download(`allocation-${configs[0].scenario_id}.json`, JSON.stringify(configs, null, 2));
    };
    $('btnCopy').onclick = () => {
      const el = $('handoffUrl'); if (!el.value) return;
      el.select();
      const done = () => { st.status = 'Link copied.'; render(); };
      if (navigator.clipboard) navigator.clipboard.writeText(el.value).then(done, () => { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    $('btnReset').onclick = () => {
      st.slots = { A: null, B: null }; st.agents = { A: '', B: '' }; st.active = 'A';
      st.opts = Object.assign({}, DEFAULTS); st.status = ''; writeOpts(); render();
    };
  }

  async function boot() {
    const qs = new URLSearchParams(location.search);
    await U.loadScript(qs.get('config') || 'config.js');
    for (const src of (window.CGF_CONFIG && window.CGF_CONFIG.scenarios) || []) {
      try { await U.loadScript(src); } catch (err) { console.error(err); }
    }
    st.scenarioIds = Object.keys(CGF.scenarios);

    const bad = [];
    st.profiles = (F.profiles || []).filter(p => { const e = C.validateProfile(p); if (e.length) bad.push(...e); return !e.length; });
    if (bad.length) console.error('roster fixture:', bad);
    st.profiles.forEach(p => { st.summaries[p.trainee_id] = summarise(p); });
    st.envelope = F.envelopeDefault;
    const envErrs = C.validateEnvelope(st.envelope);
    if (envErrs.length) throw new Error('default envelope fixture: ' + envErrs.join('; '));

    $('optScenario').innerHTML = st.scenarioIds.map(id => {
      const s = CGF.scenarios[id], ok = SUPPORTED.includes(id);
      return `<option value="${esc(id)}" ${ok ? '' : 'disabled'}>${esc(s.name || id)}${ok ? '' : ' (no competency signal yet)'}</option>`;
    }).join('');
    $('weakAt').innerHTML = '<option value="">All trainees</option>' +
      C.COMPETENCIES.map(k => `<option value="${k}">Weak at ${LABELS[k].toLowerCase()} (mean below 0.50)</option>`).join('');
    $('envelope').innerHTML = Object.entries(st.envelope).map(([k, e]) =>
      `<tr><td>${esc(k)}</td><td class="num">${e.min}</td><td class="num">${e.base}</td><td class="num">${e.max}</td></tr>`).join('');

    // Restore the last saved allocation, if it still fits this roster
    const saved = selectionFrom(store.read());
    if (saved && SLOTS.every(s => st.summaries[saved.slots[s]])) {
      Object.assign(st, saved); st.status = 'Restored the last saved allocation.';
    }
    writeOpts(); wire(); render();
  }

  boot().catch(err => {
    console.error(err);
    $('status').textContent = 'Failed to start: ' + err.message;
  });
})();
