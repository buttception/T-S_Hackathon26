// Side panel, keyboard/mouse input and the instructor command parser.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, $ = id => document.getElementById(id), esc = U.esc;

  let activeTab = 'trainee', actFilter = '';

  const SLIDERS = [
    { key: 'aggression',  label: 'Aggression',     min: 0.2, max: 2.5, step: 0.1, fmt: v => v.toFixed(1) + '×' },
    { key: 'sensitivity', label: 'Sensitivity',    min: 0.2, max: 2,   step: 0.1, fmt: v => v.toFixed(1) + '×' },
    { key: 'reaction',    label: 'Reaction delay', min: 0,   max: 120, step: 5,   fmt: v => v + ' s' },
    { key: 'decay',       label: 'Calm-down rate', min: 0.2, max: 3,   step: 0.1, fmt: v => v.toFixed(1) + '×' },
    { key: 'detection',   label: 'CGF detection',  min: 5,   max: 40,  step: 1,   fmt: v => v + ' nm' },
    { key: 'timeScale',   label: 'Time scale',     min: 10,  max: 240, step: 10,  fmt: v => v + '×' }
  ];

  // ------------------------------------------------------------ logs
  function addLog(text, cls) {
    const div = document.createElement('div');
    div.className = 'l-' + cls;
    div.textContent = `[${U.fmtTime(CGF.sim ? CGF.sim.t : 0)}] ${text}`;
    const el = $('log'); el.appendChild(div);
    while (el.childNodes.length > 250) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }
  // Each entry carries its source (design R12): src-engine, src-instructor or src-llm; a state change is a state-chip
  const SRC_LABEL = { instructor: 'Instructor', llm: 'Instructor via LLM' };
  function actionHtml(a) {
    const f = CGF.scenario.forces[a.forceKey];   // force colours are force identity (scenario data); no force: muted class
    const src = a.src || 'engine';
    const detail = a.change ? `<div class="cause"><span class="state-chip">${esc(a.change.from)}</span> → <span class="state-chip">${esc(a.change.to)}</span></div>`
      : a.detail ? `<div class="cause">${esc(a.detail)}</div>` : '';
    return `<div class="act src-${src}"><span class="muted">${a.time}</span> <b ${f ? `style="color:${f.color}"` : 'class="unit--none"'}>${esc(a.unit)}</b> ${esc(a.action)}` +
      `${a.state ? ` <span class="muted">[${esc(a.state)}${a.tension !== '' ? ' · ' + a.tension : ''}]</span>` : ''}` +
      `${SRC_LABEL[src] ? ` <span class="srcTag">${SRC_LABEL[src]}</span>` : ''}` +
      `${a.cause && !SRC_LABEL[src] ? `<div class="cause">Why: ${esc(a.cause)}</div>` : ''}${detail}</div>`;
  }
  function renderActions() {
    const list = CGF.sim.actions.filter(a => !actFilter || a.forceKey === actFilter || !a.forceKey).slice(-300).reverse();
    $('actions').innerHTML = list.map(actionHtml).join('') || '<div class="muted">No CGF actions yet.</div>';
  }

  // ------------------------------------------------------------ builders
  // Slider key -> the setting name the instructor's envelope uses (INTERFACES §2)
  const ENVELOPE_KEY = { aggression: 'aggression', sensitivity: 'sensitivity', reaction: 'reaction_delay_s', decay: 'calm_down_rate', detection: 'detection' };
  function buildSliders() {
    $('sliders').innerHTML = SLIDERS.map(s => `<div class="slider"><span>${s.label}</span>
      <input type="range" id="sl-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${CGF.params[s.key]}">
      <span id="sv-${s.key}">${s.fmt(CGF.params[s.key])}</span></div>` +
      (ENVELOPE_KEY[s.key] ? `<div class="envelope muted small" id="env-${s.key}" hidden></div>` : '')).join('');
    for (const s of SLIDERS) $('sl-' + s.key).addEventListener('input', e => {
      CGF.params[s.key] = parseFloat(e.target.value); $('sv-' + s.key).textContent = s.fmt(CGF.params[s.key]);
    });
  }
  const harnessOptions = (sel, list) => (list || Object.values(CGF.harnesses)).map(h => `<option value="${esc(h.id)}"${h.id === sel ? ' selected' : ''}>${esc(h.name)}</option>`).join('');

  function buildRegistryLists() {
    const curS = $('scenarioSel').value || (CGF.scenario && CGF.scenario.id);
    $('scenarioSel').innerHTML = Object.values(CGF.scenarios).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    if (curS && CGF.scenarios[curS]) $('scenarioSel').value = curS;
    const curH = $('harnessSel').value;
    $('harnessSel').innerHTML = harnessOptions(curH);
    const curD = $('demoSel').value;
    $('demoSel').innerHTML = Object.values(CGF.demos || {}).filter(d => CGF.scenarios[d.scenario])
      .map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
    if (curD && CGF.demos[curD]) $('demoSel').value = curD;
    showHarnessDesc();
    if (CGF.sim) buildForceControls();
  }
  function showHarnessDesc() {
    const h = CGF.harnesses[$('harnessSel').value];
    $('harnessDesc').textContent = h ? `${h.description || ''} States: ${h.states.map(s => s.name).join(' → ')}.` : '';
  }

  function buildForceControls() {
    const S = CGF.scenario, sim = CGF.sim;
    const keys = Object.keys(S.forces).filter(k => k !== S.ownShip.force);
    $('forceHarnesses').innerHTML = keys.map(k => {
      const f = S.forces[k], H = sim.forceHarness[k];
      // teamwork (js/sim/team.js): the harness's value unless the instructor sets one for this force
      const tw = CGF.teamworkOf ? Math.round(CGF.teamworkOf(k) * 100) : 0;
      return forceRowHtml(k, true) +
        `<select data-force="${k}" aria-label="Harness for ${esc(f.label)}">${H ? '' : '<option value="">(no harness)</option>'}${harnessOptions(H && H.id, CGF.harnessesFor(k))}</select>` +
        (H && H.armed ? `<div class="slider"><span class="small muted">Teamwork</span>
        <input type="range" data-team="${k}" min="0" max="100" step="5" value="${tw}" title="How well this force's units share a picture and act together">
        <span id="tw-${k}">${tw}%</span></div>` : '');
    }).join('');
    $('forceList').innerHTML = Object.keys(S.forces).map(k => forceRowHtml(k, true)).join('');   // Setup is the instructor's page
    $('forces').innerHTML = Object.keys(S.forces).map(k => forceRowHtml(k, false)).join('');    // Trainee tab: no counts, no harnesses (R9)
    $('spawnForce').innerHTML = keys.filter(k => S.spawn[k]).map(k => `<option value="${k}">${esc(S.forces[k].label)}</option>`).join('');
    $('actFilter').innerHTML = '<option value="">All forces</option>' + keys.map(k => `<option value="${k}">${esc(S.forces[k].label)}</option>`).join('');
    $('actFilter').value = actFilter;
    buildLegend();
    refreshTargets();
  }

  // One force row everywhere (design R28). The force colour is scenario data, passed as --force (the CSS paints with it).
  // instr: add the instructor-only part (unit count, harness name); the trainee's markup never contains it (R9).
  function forceRowHtml(k, instr) {
    const S = CGF.scenario, sim = CGF.sim, f = S.forces[k], own = k === S.ownShip.force;
    const H = sim.forceHarness[k], n = sim.units.filter(u => u.force === k).length;
    const label = esc(f.label) + (own ? ' · you' : '');
    const detail = instr && !own ? `<span class="instrOnly">${n} unit${n === 1 ? '' : 's'} · <span class="harness">${H ? esc(H.name) : 'no harness'}</span></span>` : '';
    return `<div class="forceRow" data-force-row="${esc(k)}" style="--force:${f.color}"><i></i><span class="tag">${esc(f.tag)}</span><span class="label">${label}</span><span class="kind">${esc(f.kind || '')}</span>${detail}</div>`;
  }

  // Map key (design R27): "Symbol = identity" and "Tag and zone = force". Harness names only in the instructor view (R9).
  function buildLegend() {
    const S = CGF.scenario, instr = CGF.ui ? CGF.ui.isInstructorView() : false;
    const ID = CGF.style.identity;
    const shapeCss = id => id.shape === 'circle' ? 'border-radius:50%' : id.shape === 'diamond' ? 'transform:rotate(45deg) scale(.8)' : '';
    $('legendGroups').innerHTML =
      `<div class="legendGroup"><div class="legendHead">Symbol = identity</div>` +
      ['friend', 'hostile', 'suspect', 'neutral'].map(k => `<div><i style="border-color:${ID[k].color};border-style:${ID[k].dashed ? 'dashed' : 'solid'};background:${U.hexA(ID[k].light, .25)};${shapeCss(ID[k])}"></i>${ID[k].label}</div>`).join('') + `</div>` +
      `<div class="legendGroup"><div class="legendHead">Tag and zone = force</div>` +
      Object.keys(S.forces).map(k => forceRowHtml(k, instr)).join('') + `</div>`;
  }

  function refreshTargets() {
    const cur = $('injTarget').value;
    $('injTarget').innerHTML = CGF.cgfs().map(u => `<option value="${esc(u.name)}">${esc(u.name)} (${esc(CGF.forceOf(u).label)})</option>`).join('');
    if (CGF.cgfs().some(u => u.name === cur)) $('injTarget').value = cur;
    refreshStateOptions();
  }
  function refreshStateOptions() {
    const u = injTarget(), H = u && CGF.harnessOf(u);
    $('injState').innerHTML = H ? H.states.map(s => `<option>${esc(s.name)}</option>`).join('') : '';
  }
  function refreshMalfButtons() {
    const sim = CGF.sim;
    $('malfButtons').innerHTML = CGF.malfunctions.map(m =>
      `<button data-malf="${m.id}" class="${sim.malf[m.id] ? 'on' : ''}" title="${esc(m.desc)}">${esc(m.label)}</button>`).join('');
    $('malfBar').innerHTML = CGF.malfunctions.filter(m => sim.malf[m.id]).map(m => `<div class="malfTag">${esc(m.label.toUpperCase())}</div>`).join('');
    $('btnFog').classList.toggle('on', !!sim.fog);
  }
  function updateRunButton() {
    const sim = CGF.sim;
    $('btnRun').textContent = sim.outcome ? 'Finished' : sim.running ? 'Pause' : (sim.t > 0 ? 'Resume' : 'Start');
    $('btnRun').dataset.state = sim.outcome ? 'finished' : sim.running ? 'pause' : 'play';   // the CSS draws the icon from this (R22)
  }

  // What ends the run (R23): words for the toggle, the scenario line and the HUD
  const MODE_TEXT = { exercise: 'Ends at objective', freeplay: 'Free play' };
  function refreshModeToggle() {
    const mode = CGF.sim.mode;
    document.querySelectorAll('#modeToggle [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    const meta = $('scnMeta'); if (meta) meta.textContent = `${CGF.scenarioInfo(CGF.scenario).domain} · ${MODE_TEXT[mode] || mode}`;
  }

  // Scenario line (R25), mission brief and pinned objective (R26)
  function buildScenarioInfo() {
    const S = CGF.scenario, info = CGF.scenarioInfo(S), b = CGF.briefOf(S);
    const chips = Object.keys(S.forces).filter(k => k !== S.ownShip.force)
      .map(k => `<span class="chip"><i style="--force:${S.forces[k].color}"></i>${esc(S.forces[k].tag)}</span>`).join('');
    $('scn').innerHTML = `<div class="scnTop"><span class="scnName">${esc(info.shortName)}</span><span class="scnMeta" id="scnMeta"></span></div><div class="chips">${chips}</div>`;
    const el = $('brief');
    el.classList.toggle('muted', !b.structured);   // a plain-string brief renders as before: one muted paragraph
    el.innerHTML = !b.structured ? esc(b.text) : '<dl class="mission">' +
      (b.objective ? `<dt>Objective</dt><dd>${esc(b.objective)}</dd>` : '') +
      (b.situation.length ? `<dt>Situation</dt><dd><ul>${b.situation.map(s => `<li>${esc(s)}</li>`).join('')}</ul></dd>` : '') +
      (b.constraints ? `<dt>Constraints</dt><dd>${esc(b.constraints)}</dd>` : '') + '</dl>';
    const pin = $('objPin');
    pin.hidden = !b.objective;
    pin.innerHTML = b.objective ? `<b>Objective</b> · ${esc(b.objective)}` : '';
    refreshModeToggle();
  }
  const injTarget = () => CGF.sim.units.find(u => u.name === $('injTarget').value) || null;

  // ------------------------------------------------------------ periodic refresh
  // Adaptation on or off, always visible (design R3; the same names and classes as the allocation page)
  function refreshModeBadge() {
    const A = CGF.Adapt && CGF.Adapt.current, el = $('modeBadge');
    const [cls, text] = !A ? ['mode-none', 'No adaptive session'] : A.config.mode === 'fixed'
      ? ['mode-fixed', '■ Fixed assessment · no adjustments'] : ['mode-adaptive', '↻ Adaptive practice'];
    if (el.textContent !== text) { el.className = 'modeBadge ' + cls; el.textContent = text; }
  }

  // The instructor's envelope under each adjustable slider, and a mark when the engine's last request was clamped (design R14)
  function refreshEnvelopes() {
    const A = CGF.Adapt && CGF.Adapt.current, env = A ? A.config.envelope || {} : {};
    for (const s of SLIDERS) {
      const el = $('env-' + s.key), e = env[ENVELOPE_KEY[s.key]];
      if (!el) continue;
      el.hidden = !e;
      if (!e) continue;
      const last = A.adjustments.filter(a => a.setting === ENVELOPE_KEY[s.key]).pop();
      const html = `Instructor limits ${s.fmt(e.min)} to ${s.fmt(e.max)} · start ${s.fmt(e.base)}` +
        (last && last.clamped ? ` · <span class="clamped">clamped: asked for ${s.fmt(last.requested)}</span>` : '');
      if (el.innerHTML !== html) el.innerHTML = html;
    }
  }

  function refresh() {
    const sim = CGF.sim, S = CGF.scenario, o = sim.own, shown = CGF.displayedOwn();
    refreshModeBadge(); refreshEnvelopes();
    const zones = CGF.zonesAt(shown).filter(z => z.owner !== o.force);
    $('hud').textContent =
      `${U.fmtTime(sim.t)}   x${CGF.params.timeScale}   ${sim.mode === 'freeplay' ? 'FREE PLAY' : 'ENDS AT OBJECTIVE'}${sim.fog ? '   FOG' : ''}\n` +
      `${o.name}\n` +
      `HDG ${U.pad3(o.hdg)}  (ordered ${U.pad3(o.ordHdg)})\n` +
      `SPD ${o.spd.toFixed(0)} ${S.unitLabels.speed}  (ordered ${o.ordSpd})\n` +
      `POS ${shown.x.toFixed(1)}E ${shown.y.toFixed(1)}N ${S.unitLabels.dist}\n` +
      `ZONE ${zones.length ? zones.map(z => z.name).join(' / ') : 'Unclaimed'}\n` +
      `FC RADAR ${sim.fcTarget ? 'ON → ' + sim.fcTarget.name : 'off'}` +
      (S.objective ? `\nTo ${S.objective.name || 'objective'} ${U.dist(shown, S.objective).toFixed(1)} ${S.unitLabels.dist}` : '');

    const p = sim.posture;
    $('postureLabel').textContent = p < 0.15 ? 'Cautious' : p < 0.45 ? 'Assertive' : 'Provocative';
    $('postureLabel').className = p < 0.15 ? 'posture--cautious' : p < 0.45 ? 'posture--assertive' : 'posture--provocative';
    $('postureVal').textContent = `(${Math.round(p * 100)}/100)`;
    $('postureBar').style.width = (p * 100) + '%';

    if (activeTab === 'instructor') { renderWhy(); drawChart(); }
    if (activeTab !== 'trainee') return;

    // The trainee sees what a contact is doing, not what it thinks (design R9): no tension, no predicted next state
    const visible = sim.units.filter(CGF.visibleToTrainee).sort((a, b) => U.dist(o, a) - U.dist(o, b));
    $('contacts').innerHTML = visible.map(u => {
      const d = U.dist(o, u), b = U.bearing(o, u), color = CGF.forceColor(u);
      const head = `<span><b style="color:${color}">${esc(u.name)}</b> <span class="muted">${esc(u.type || '')} · ${esc(CGF.forceOf(u).label)}</span></span>`;
      if (u.role !== 'cgf') return `<div class="contact ${u === sim.selected ? 'sel' : ''}" data-name="${esc(u.name)}">${head}<span></span>
        <span class="meta">BRG ${U.pad3(b)} · RNG ${d.toFixed(1)} nm</span></div>`;
      const st = CGF.stateOf(u), lvl = Math.min(u.stateIdx || 0, 4);
      return `<div class="contact esc-${lvl} ${u === sim.selected ? 'sel' : ''}" data-name="${esc(u.name)}">${head}
        <span class="escState">${esc(st.name)}</span>
        <span class="meta">BRG ${U.pad3(b)} · RNG ${d.toFixed(1)} nm${u.warnPending ? ' · <b class="hailPending">HAIL PENDING (H)</b>' : ''}</span></div>`;
    }).join('') || '<div class="muted">No contacts on radar.</div>';

    const st = sim.stats, fleeing = CGF.cgfs().filter(u => !CGF.harnessOf(u).armed && u.stateIdx >= 2).length;
    const peaks = Object.entries(st.peak).map(([k, pk]) => [`Peak state · ${S.forces[k].label}`, pk.name]);
    // grouped (design R10): how it went, what the trainee did, the neutrals, and what the instructor did
    const groups = [
      ['Run', [['Elapsed', U.fmtDur(sim.t)], ...peaks]],
      ['Trainee', [['Warnings received', st.warnings], ['Warnings ignored', st.ignored], ['Hails acknowledged', st.acks],
        ['Time in foreign territorial waters', U.fmtDur(st.terrSec)], ['Time in foreign claimed zones', U.fmtDur(st.contSec)],
        ['Fire-control radar used', U.fmtDur(st.fcSec)]]],
      ['Neutral traffic', [['Merchants diverting/fleeing now', fleeing]]],
      ['Instructor', [['Instructor injects', st.injects], ['Malfunctions injected', st.malfs], ['Live harness swaps', st.swaps], ['CGF actions logged', sim.actions.length]]]
    ];
    $('aar').innerHTML = groups.map(([title, rows]) => `<div class="aarGroup"><h3>${esc(title)}</h3><div class="aar">` +
      rows.map(([a, b]) => `<span>${esc(a)}</span><span>${esc(b)}</span>`).join('') + '</div></div>').join('');
  }

  // Instructor tab: why the selected CGF is reacting, its tension and what it will do next (design R9)
  function renderWhy() {
    const sim = CGF.sim, o = sim.own, s = sim.selected;
    if (s && s.role === 'cgf') {
      const H = CGF.harnessOf(s);
      $('whyTitle').textContent = `Why is ${s.name} reacting?`;
      const next = s.pendingIdx !== null ? ` → ${H.states[s.pendingIdx].name} in ${Math.max(0, Math.ceil(CGF.params.reaction * (H.reactionMult || 1) - (sim.t - s.pendingSince)))}s` : '';
      const rows = Object.entries(s.factors).map(([k, f]) => [k, (H.weights[k] || 0) * f]).filter(([, v]) => Math.abs(v) > 0.05)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const agg = CGF.aggressionOf(s), rate = s.P > 0 ? s.P * agg * CGF.params.sensitivity : s.P;
      $('why').innerHTML = (rows.length ? rows.map(([k, v]) => `<div class="factor"><span>${esc((CGF.factors[k] || {}).label || k)}</span>
          <div class="bar"><div class="${v > 0 ? 'factor--raise' : 'factor--lower'}" style="width:${U.clamp(Math.abs(v) / 40 * 100, 3, 100)}%"></div></div>
          <span>${v > 0 ? '+' : ''}${v.toFixed(1)}</span></div>`).join('')
        : `<div class="muted">${U.dist(s, o) > CGF.detectionRange() ? 'Ownship not detected (outside CGF detection range).' : 'Nothing provocative right now.'}</div>`) +
        `<div class="muted small" style="margin-top:4px">${esc(CGF.stateOf(s).name)}${esc(next)} · ${H.armed ? 'tension' : 'alarm'} ${Math.round(s.tension)}/100. Harness: ${esc(H.name)}. Net ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}/min after aggression ×${agg.toFixed(2)}; calm-down −${(H.decayPerMin * CGF.params.decay).toFixed(1)}/min toward baseline ${H.baseTension}.</div>`;
    } else { $('whyTitle').textContent = 'Why is it reacting?'; $('why').innerHTML = '<div class="muted">Select a CGF contact.</div>'; }
  }

  function drawChart() {
    const c = $('chart'), g = c.getContext('2d'), w = c.width, h = c.height, data = CGF.sim.chart;
    // a canvas cannot use var(): read the chart tokens (css/tokens.css, --rt-chart-<role>) once per draw
    const cs = getComputedStyle(document.documentElement), tok = n => cs.getPropertyValue('--rt-chart-' + n).trim();
    g.fillStyle = tok('bg'); g.fillRect(0, 0, w, h);
    g.strokeStyle = tok('grid');
    for (const y of [25, 50, 75]) { g.beginPath(); g.moveTo(0, h - y / 100 * h); g.lineTo(w, h - y / 100 * h); g.stroke(); }
    if (data.length < 2) return;
    const n = Math.max(data.length, 60);
    for (const [idx, color] of [[0, tok('cgf')], [1, tok('trainee')]]) {
      g.strokeStyle = color; g.lineWidth = 1.5; g.beginPath();
      data.forEach((d, i) => { const x = i / (n - 1) * w, y = h - d[idx] / 100 * (h - 4) - 2; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
  }

  // ------------------------------------------------------------ instructor free-text command
  // Rule-based stand-in for a local LLM: it maps words to the same CGF.inject calls the buttons use.
  const HARNESS_WORDS = [
    [['non-hostile', 'non hostile', 'friendly', 'nonhostile'], 'non-hostile-state'],
    [['hostile'], 'hostile-state'],
    [['grey', 'gray', 'militia'], 'grey-zone'],
    [['pirate', 'piracy', 'raider', 'bandit'], 'raiders'],
    [['civil', 'traffic'], 'civil-traffic']
  ];
  const SCENARIO_WORDS = [
    [['sea and air', 'air and sea', 'sea-air', 'sea + air', 'combined'], 'sea-air'],
    [['land', 'border', 'road'], 'border-patrol'],
    [['air', 'airspace'], 'airspace-patrol'],
    [['piracy drill', 'anti-piracy'], 'piracy-drill'],
    [['sea', 'strait', 'maritime'], 'strait-transit']
  ];
  function findHarness(t) {
    for (const h of Object.values(CGF.harnesses)) if (t.includes(h.id) || t.includes(h.name.toLowerCase())) return h.id;
    for (const [words, id] of HARNESS_WORDS) if (CGF.harnesses[id] && words.some(w => t.includes(w))) return id;
    return null;
  }
  function findScenario(t) {
    for (const s of Object.values(CGF.scenarios)) if (t.includes(s.id)) return s.id;
    for (const [words, id] of SCENARIO_WORDS) if (CGF.scenarios[id] && words.some(w => new RegExp(`\\b${w}\\b`).test(t))) return id;
    return null;
  }
  function findForce(t) {
    const S = CGF.scenario;
    return Object.keys(S.forces).filter(k => k !== S.ownShip.force)
      .find(k => new RegExp(`\\b${k}\\b`).test(t) || new RegExp(`\\b${S.forces[k].tag.toLowerCase()}\\b`).test(t) ||
        t.includes(S.forces[k].label.toLowerCase())) || null;
  }

  // A prompt may hold several commands: "spawn red; escalate R-21 then set black to hostile"
  function runCommand(text) {
    const parts = String(text).split(/;|\bthen\b|\band then\b/i).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    addLog('INSTRUCTOR > ' + text, 'instr');
    for (const p of parts) runOne(p);
  }

  function runOne(text) {
    const t = text.toLowerCase().trim(); if (!t) return;
    const has = (...w) => w.some(x => t.includes(x));
    let done = 0;

    if (/^(restart|reset scenario|start again)\b/.test(t)) { restartScenario(); return; }
    if (has('load', 'open scenario', 'switch scenario', 'go to scenario')) {
      const sid = findScenario(t);
      if (sid) { loadScenario(sid); return; }
    }
    const force = findForce(t);
    if (force && has('set', 'switch', 'swap', 'change', 'make', 'become', ' to ')) {
      const hid = findHarness(t.replace(new RegExp(`\\b${force}\\b`, 'g'), ''));
      if (hid) { CGF.inject.setForceHarness(force, hid); return; }
    }
    if (has('freeplay', 'free play')) { CGF.inject.setMode('freeplay'); return; }
    if (has('exercise mode', 'scored mode')) { CGF.inject.setMode('exercise'); return; }
    if (has('repair', 'fix all', 'clear malf')) { CGF.inject.repairAll(); done++; }
    else {
      const M = CGF.inject.malfunction;
      if (has('rudder', 'steering')) { M('rudder', true); done++; }
      if (has('engine', 'propulsion')) { M('engine', true); done++; }
      if (has('radar fail', 'radar down', 'lose radar', 'radar failure')) { M('radar', true); done++; }
      if (has('comms', 'radio fail', 'radio down')) { M('comms', true); done++; }
      if (has('gps', 'navigation')) { M('gps', true); done++; }
      if (has('fire-control stuck', 'fc stuck', 'fire control stuck')) { M('fc', true); done++; }
    }
    if (has('spawn', 'add unit', 'reinforce')) { CGF.inject.spawn(force || $('spawnForce').value); done++; }
    if (has('fog')) { CGF.inject.fog(!has('clear fog', 'no fog')); done++; }

    const unit = CGF.cgfs().find(u => t.includes(u.name.toLowerCase())) || injTarget();
    const H = unit && CGF.harnessOf(unit);
    // longest matching state name wins, so "close block" is not read as "block"
    const st = H && H.states.filter(s => t.includes(s.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
    if (st) { CGF.inject.force(unit, st.name); done++; }
    else if (has('escalate', 'aggressive', 'angry')) { CGF.inject.adjust(unit, 25); done++; }
    else if (has('calm', 'de-escalate', 'deescalate', 'relax')) { CGF.inject.adjust(unit, -25); done++; }
    const q = text.match(/["“](.+?)["”]/);
    if (q || has('demand', 'hail')) { CGF.inject.radio(unit, q ? q[1] : ''); done++; }
    if (!done) addLog(`Not understood: "${text}". Try: escalate R-21 · force B-31 block · set red to non-hostile · spawn black · load land · restart · fog · rudder jam · repair`, 'sys');
  }

  function restartScenario() {
    CGF.loadScenario(CGF.scenario.id, currentHarnessIds());
    CGF.sim.running = true; CGF.emit('run');
    addLog('INSTRUCTOR restarted the scenario (harness choices kept).', 'instr');
  }
  function loadScenario(id) {
    CGF.loadScenario(id);
    CGF.sim.running = true; CGF.emit('run');
    addLog(`INSTRUCTOR loaded scenario: ${CGF.scenario.name}`, 'instr');
  }

  // ------------------------------------------------------------ local LLM prompting
  // submitPrompt sends the instructor's words to the local model (or the keyword parser), shows what
  // the model proposes, and applies it after the instructor clicks Apply (or at once with auto / no preview).
  let pendingPlan = null;

  function showPreview(html) {
    const el = $('llmPreview');
    el.innerHTML = html || '';
    el.classList.toggle('hidden', !html);
  }
  function planHtml(r, text, state) {
    const rows = r.plan.map(p => `<div class="${p.ok ? 'cmdok' : 'cmdbad'}">${p.ok ? '✓' : '✗'} ${esc(p.text)}</div>`).join('');
    const S = CGF.llm.settings;
    return `<div class="meta">${esc(S.model)} · ${(r.ms / 1000).toFixed(1)} s · "${esc(text)}"</div>` +
      (rows || '<div class="muted">No commands.</div>') +
      (r.question ? `<div class="q">Model asks: ${esc(r.question)}</div>` : '') +
      (state === 'pending' ? `<div class="row"><button id="btnPlanApply" class="primary">Apply</button><button id="btnPlanDiscard">Discard</button></div>`
        : `<div class="meta">${esc(state)}</div>`);
  }

  async function submitPrompt(text, opts) {
    opts = opts || {};
    text = String(text || '').trim();
    if (!text) return { via: 'none' };
    const S = CGF.llm.settings;
    if (!S.enabled) { runCommand(opts.fallback || text); return { via: 'keyword' }; }

    addLog(`INSTRUCTOR (LLM) > ${text}`, 'instr');
    pendingPlan = null;
    showPreview(`<div class="meta">Asking ${esc(S.model)}…</div>`);
    $('btnCmd').disabled = true;
    try {
      const r = await CGF.llm.interpret(text);
      modelReachable = true; refreshParserBadge();
      const okCount = r.plan.filter(p => p.ok).length;
      if (!okCount && opts.fallback && S.fallback) throw new Error(r.question ? `model asked: ${r.question}` : 'model returned no usable commands');
      if (!okCount) {
        addLog(r.question ? `LLM asks: ${r.question}` : 'LLM returned no usable commands.', 'sys');
        showPreview(planHtml(r, text, 'Nothing to apply. Rephrase the request.'));
      } else if (opts.auto || !S.preview) {
        CGF.llm.apply(r.plan, text);
        showPreview(planHtml(r, text, 'Applied'));
      } else {
        pendingPlan = { r, text };
        showPreview(planHtml(r, text, 'pending'));
      }
      return { via: 'llm', result: r };
    } catch (err) {
      if (!/model (asked|returned)/.test(err.message)) { modelReachable = false; refreshParserBadge(); }
      addLog(`LLM: ${err.message}`, 'alert');
      if (S.fallback) {
        showPreview(`<div class="cmdbad">LLM unavailable: ${esc(err.message)}</div><div class="meta">Used the keyword parser instead.</div>`);
        runCommand(opts.fallback || text);
        return { via: 'keyword', error: err.message };
      }
      showPreview(`<div class="cmdbad">LLM unavailable: ${esc(err.message)}</div>`);
      return { via: 'none', error: err.message };
    } finally { $('btnCmd').disabled = false; }
  }

  function refreshLlmControls() {
    const S = CGF.llm.settings;
    $('promptMode').value = S.enabled ? 'llm' : 'keyword';
    $('llmPreviewChk').checked = !!S.preview;
    $('llmProvider').value = S.provider; $('llmUrl').value = S.url; $('llmModel').value = S.model;
    $('llmFallback').checked = !!S.fallback;
    $('llmStatus').textContent = S.enabled ? `${S.model} @ ${S.url}${S.fallback ? ' · keyword fallback on' : ''}` : 'fixed command words, no model';
    refreshParserBadge();
    $('cmd').placeholder = S.enabled ? 'e.g. make the red jets more aggressive and have the black drone block BLUE-1'
      : 'e.g. escalate R-21 · set black to hostile · spawn red · gps drift · load air';
  }

  // Which parser is active (design R11): is-llm (model reached), is-fallback (keyword parser: chosen, or the model
  // failed and the fallback took over), is-offline (model unreachable and no fallback)
  let modelReachable = null;   // unknown until a prompt or a connection test
  function refreshParserBadge() {
    const S = CGF.llm.settings, el = $('parserBadge');
    const [cls, text] = !S.enabled ? ['is-fallback', 'Keyword parser']
      : modelReachable === false ? (S.fallback ? ['is-fallback', 'Keyword parser · model unavailable'] : ['is-offline', 'Local LLM unavailable'])
      : ['is-llm', 'Local LLM'];
    el.className = 'parserBadge ' + cls; el.textContent = text;
  }

  // Shows a prompt being typed into the instructor command box (used by hands-off demos)
  function showTyping(text, done) {
    const el = $('cmd');
    el.value = text;
    if (!el.classList.contains('typing') && !done) el.scrollIntoView({ block: 'center', behavior: 'smooth' });   // the audience sees the box being typed in
    el.classList.toggle('typing', !done);
    if (done) setTimeout(() => { if (el.value === text) el.value = ''; el.classList.remove('typing'); }, 600);
  }

  // ------------------------------------------------------------ wiring
  function init(config) {
    $('title').innerHTML = `${esc(config.title || 'CGF Trainer')} <small>· ${esc(config.subtitle || 'offline demo')}</small>`;
    document.title = config.title || 'CGF Trainer';
    buildSliders();
    buildRegistryLists();

    CGF.on('log', addLog);
    CGF.on('registry', buildRegistryLists);
    CGF.on('reset', () => {
      const S = CGF.scenario;
      $('log').innerHTML = ''; $('banner').style.display = 'none';
      if (!CGF.demo.isRunning()) $('caption').style.display = 'none'; // a finished demo's last caption goes away
      $('scenarioSel').value = S.id;
      buildScenarioInfo();
      buildForceControls(); refreshMalfButtons(); updateRunButton(); renderActions();
    });
    CGF.on('harness', () => { buildForceControls(); renderActions(); });
    CGF.on('units', () => { refreshTargets(); buildForceControls(); });
    CGF.on('malf', refreshMalfButtons);
    CGF.on('env', refreshMalfButtons);
    CGF.on('run', updateRunButton);
    CGF.on('action', a => { if (activeTab === 'cgflog' && (!actFilter || a.forceKey === actFilter || !a.forceKey)) $('actions').insertAdjacentHTML('afterbegin', actionHtml(a)); });
    CGF.on('caption', text => { $('caption').textContent = text; $('caption').style.display = text ? 'block' : 'none'; });
    CGF.on('demo', running => { $('btnDemo').textContent = running ? 'Stop demo' : 'Play demo'; $('btnDemo').classList.toggle('on', running); });
    CGF.on('demo-tab', name => { const t = document.querySelector(`.tab[data-tab="${name}"]`); if (t) t.click(); });
    CGF.on('params', () => SLIDERS.forEach(s => { $('sl-' + s.key).value = CGF.params[s.key]; $('sv-' + s.key).textContent = s.fmt(CGF.params[s.key]); }));
    $('btnDemo').addEventListener('click', () => CGF.demo.isRunning() ? CGF.demo.stop() : CGF.demo.start($('demoSel').value, { loop: $('demoLoop').checked }));
    CGF.on('outcome', (kind, text) => { const b = $('banner'); b.className = kind || ''; b.textContent = text; b.style.display = kind ? 'block' : 'none'; updateRunButton(); });
    CGF.on('mode', () => { refreshModeToggle(); updateRunButton(); });
    $('modeToggle').addEventListener('click', e => {
      const b = e.target.closest('[data-mode]');
      if (b) CGF.inject.setMode(b.dataset.mode);
    });
    // The map key remembers whether it was open (per browser; the page works without storage)
    const lg = $('legend');
    try { if (localStorage.getItem('cgf.legendOpen') === '0') lg.open = false; } catch (e) { /* storage blocked */ }
    lg.addEventListener('toggle', () => { try { localStorage.setItem('cgf.legendOpen', lg.open ? '1' : '0'); } catch (e) { /* storage blocked */ } });

    $('btnRun').addEventListener('click', CGF.actions.toggleRun);
    $('btnReset').addEventListener('click', () => CGF.loadScenario(CGF.scenario.id, currentHarnessIds()));
    // Loading discards the running exercise, so ask first once it has started (design R13)
    $('btnLoadScenario').addEventListener('click', () => {
      if (CGF.sim.t > 0 && !confirm('Load this scenario? The current exercise will be discarded.')) return;
      CGF.loadScenario($('scenarioSel').value);
    });
    $('harnessSel').addEventListener('change', showHarnessDesc);
    $('injTarget').addEventListener('change', refreshStateOptions);
    $('actFilter').addEventListener('change', e => { actFilter = e.target.value; renderActions(); });
    $('btnExportActs').addEventListener('click', () => download(`cgf-actions-${CGF.scenario.id}.csv`, CGF.actionsCsv(), 'text/csv'));
    $('btnExport').addEventListener('click', () => {
      const h = CGF.harnesses[$('harnessSel').value];
      if (h) download(`harness-${h.id}.json`, JSON.stringify(h, null, 2), 'application/json');
    });
    $('fileIn').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const h = JSON.parse(reader.result);
          CGF.validateHarness(h);
          if (CGF.harnesses[h.id]) h.id = h.id + '-custom';
          CGF.registerHarness(h);
          $('harnessSel').value = h.id; showHarnessDesc();
          addLog(`Harness loaded: ${h.name} (${h.id}). Assign it to a force on the Instructor tab.`, 'sys');
        } catch (err) { addLog('Could not load harness: ' + err.message, 'alert'); }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
    $('forceHarnesses').addEventListener('change', e => {
      const sel = e.target.closest('select[data-force]');
      if (sel && sel.value) CGF.inject.setForceHarness(sel.dataset.force, sel.value);
      const tw = e.target.closest('input[data-team]');
      if (tw) CGF.setTeamwork(tw.dataset.team, parseInt(tw.value, 10) / 100);
    });
    $('forceHarnesses').addEventListener('input', e => {
      const tw = e.target.closest('input[data-team]');
      if (tw && $('tw-' + tw.dataset.team)) $('tw-' + tw.dataset.team).textContent = tw.value + '%';
    });
    CGF.on('team-config', buildForceControls);

    // Simulation speed (header): sim seconds per real second; demos change it too
    const syncSpeed = () => {
      const v = String(CGF.params.timeScale), sel = $('speedSel');
      if (![...sel.options].some(o => o.value === v)) sel.insertAdjacentHTML('beforeend', `<option value="${v}">×${v}</option>`);
      sel.value = v;
    };
    $('speedSel').addEventListener('change', e => { CGF.params.timeScale = parseInt(e.target.value, 10); CGF.emit('params'); });
    CGF.on('params', syncSpeed);
    syncSpeed();

    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      activeTab = t.dataset.tab;
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
      document.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== activeTab));
      if (activeTab === 'cgflog') renderActions();
      if (CGF.sim) buildLegend();   // harness names show in the key only on the instructor tab (R27)
      refresh();
    }));

    document.addEventListener('click', e => {
      const b = e.target.closest('button'); if (b) b.blur();
      const inj = e.target.closest('[data-inj]');
      if (inj) {
        const u = injTarget();
        switch (inj.dataset.inj) {
          case 'escalate': CGF.inject.adjust(u, 25); break;
          case 'calm': CGF.inject.adjust(u, -25); break;
          case 'force': CGF.inject.force(u, $('injState').value); break;
          case 'radio': CGF.inject.radio(u, $('injRadio').value.trim()); $('injRadio').value = ''; break;
          case 'spawn': CGF.inject.spawn($('spawnForce').value); break;
          case 'fog': CGF.inject.fog(); break;
          case 'repair': CGF.inject.repairAll(); break;
        }
      }
      const mb = e.target.closest('[data-malf]'); if (mb) CGF.inject.malfunction(mb.dataset.malf);
      const c = e.target.closest('.contact');
      if (c) selectUnit(CGF.sim.units.find(u => u.name === c.dataset.name));
    });
    const send = () => { const v = $('cmd').value; $('cmd').value = ''; submitPrompt(v); };
    $('btnCmd').addEventListener('click', send);
    $('cmd').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('llmPreview').addEventListener('click', e => {
      if (!pendingPlan) return;
      if (e.target.id === 'btnPlanApply') { CGF.llm.apply(pendingPlan.r.plan, pendingPlan.text); showPreview(planHtml(pendingPlan.r, pendingPlan.text, 'Applied')); pendingPlan = null; }
      if (e.target.id === 'btnPlanDiscard') { addLog('LLM commands discarded by instructor.', 'sys'); showPreview(planHtml(pendingPlan.r, pendingPlan.text, 'Discarded')); pendingPlan = null; }
    });

    // Local LLM settings (kept in this browser only)
    const llmSet = (key, val) => { CGF.llm.settings[key] = val; CGF.llm.saveSettings(); refreshLlmControls(); };
    $('promptMode').addEventListener('change', e => llmSet('enabled', e.target.value === 'llm'));
    $('llmPreviewChk').addEventListener('change', e => llmSet('preview', e.target.checked));
    $('llmProvider').addEventListener('change', e => {
      llmSet('provider', e.target.value);
      if (e.target.value === 'ollama' && /:8080|:1234|:8000/.test(CGF.llm.settings.url)) llmSet('url', 'http://localhost:11434');
      if (e.target.value === 'openai' && /:11434/.test(CGF.llm.settings.url)) llmSet('url', 'http://localhost:8080');
    });
    $('llmUrl').addEventListener('change', e => llmSet('url', e.target.value.trim()));
    $('llmModel').addEventListener('change', e => llmSet('model', e.target.value.trim()));
    $('llmFallback').addEventListener('change', e => llmSet('fallback', e.target.checked));
    $('btnLlmTest').addEventListener('click', async () => {
      $('llmTestResult').textContent = 'Testing…';
      try {
        const models = await CGF.llm.test();
        const has = models.some(m => m === CGF.llm.settings.model || m.split(':')[0] === CGF.llm.settings.model.split(':')[0]);
        $('llmTestResult').textContent = `Connected. Models: ${models.join(', ') || 'none'}${has ? '' : ` · "${CGF.llm.settings.model}" not found`}`;
        modelReachable = true;
      } catch (err) { $('llmTestResult').textContent = 'Not reachable: ' + err.message; modelReachable = false; }
      refreshParserBadge();
    });
    refreshLlmControls();

    document.addEventListener('keydown', e => {
      const tag = e.target.tagName, type = e.target.type;
      if (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && type !== 'range' && type !== 'checkbox')) return;
      const A = CGF.actions; let handled = true;
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': A.orderHeading(-5); break;
        case 'ArrowRight': case 'd': case 'D': A.orderHeading(5); break;
        case 'ArrowUp': case 'w': case 'W': A.orderSpeed(2); break;
        case 'ArrowDown': case 's': case 'S': A.orderSpeed(-2); break;
        case 'h': case 'H': A.acknowledge(); break;
        case 'r': case 'R': A.toggleFc(); break;
        case ' ': A.toggleRun(); break;
        case 'Escape': CGF.demo.stop(); break;
        case 'c': case 'C': CGF.render.focus(CGF.sim.own); break;   // centre on and follow the ownship
        case 'o': case 'O': CGF.render.overview(); break;            // back to the whole map
        case '+': case '=': CGF.params.timeScale = Math.min(960, CGF.params.timeScale * 2); CGF.emit('params'); break;   // faster
        case '-': case '_': CGF.params.timeScale = Math.max(15, Math.round(CGF.params.timeScale / 2)); CGF.emit('params'); break;   // slower
        default: handled = false;
      }
      if (handled) { e.preventDefault(); if (tag === 'INPUT') e.target.blur(); }
    });

    const canvas = $('map');
    // Drag to pan. A press that moves less than a few pixels is still a click (select a contact or steer).
    const DRAG_PX = 4;
    let press = null, dragged = false;
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      press = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY }; dragged = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!press) return;
      if (!dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_PX) return;
      dragged = true; canvas.style.cursor = 'grabbing';
      CGF.render.panBy(e.clientX - press.lastX, e.clientY - press.lastY);
      press.lastX = e.clientX; press.lastY = e.clientY;
    });
    const release = () => { press = null; canvas.style.cursor = ''; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    canvas.addEventListener('click', e => {
      if (dragged) { dragged = false; return; }   // the end of a drag is not a click
      const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      let best = null, bestD = 14;
      for (const u of CGF.sim.units) {
        if (!CGF.visibleToTrainee(u) && activeTab !== 'instructor') continue;
        const [ux, uy] = CGF.render.toScreen(u.x, u.y), d = Math.hypot(ux - sx, uy - sy);
        if (d < bestD) { best = u; bestD = d; }
      }
      if (best) { selectUnit(best); return; }
      CGF.actions.orderHeadingTo(U.bearing(CGF.displayedOwn(), CGF.render.toWorld(sx, sy)));
    });
    // Scroll to zoom in or out at the pointer
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      CGF.render.zoomAt(Math.pow(1.0015, e.deltaY), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }

  function selectUnit(u) {
    if (!u) return;
    CGF.sim.selected = u;
    if (u.role === 'cgf') { $('injTarget').value = u.name; refreshStateOptions(); }
  }
  function currentHarnessIds() {
    const out = {};
    for (const [k, H] of Object.entries(CGF.sim.forceHarness)) out[k] = H.id;
    return out;
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  CGF.ui = { init, refresh, runCommand, submitPrompt, showTyping, restartScenario, loadScenario, isInstructorView: () => activeTab === 'instructor' };
})();
