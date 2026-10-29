// Instructor reasoning panel (LANES D3, PLAN C3/C4/C6/C7): why the CGFs got harder or easier.
// For every adjustment it shows the direction, the setting change, the trainee actions behind it (evidence
// events) and a one-line reason. Reasons come from templates; every number in them is computed here. The local
// LLM may rephrase a reason, but a rephrasing that adds or changes any number is thrown away (invariant 5).
// Also hosts the steering box (D4) and the session-record export (D5).
//
// Uses only the existing classes in css/style.css (layout requests for Eevee: none needed yet).
(function () {
  'use strict';
  const CGF = window.CGF;

  const LABEL = {
    hail_discipline: 'hail discipline', collision_avoidance: 'collision avoidance', territorial_awareness: 'territorial awareness',
    weapons_discipline: 'weapons discipline', speed_management: 'speed management', threat_evaluation: 'threat evaluation',
    contact_detection: 'contact detection', picture_reporting: 'picture reporting', escalation_control: 'escalation control'
  };
  const SETTING_LABEL = {
    aggression: 'CGF aggression', sensitivity: 'CGF sensitivity', reaction_delay_s: 'CGF reaction delay (s)',
    calm_down_rate: 'CGF calm-down rate', detection: 'CGF detection range', 'weight.team': 'opposition teamwork'
  };
  const compLabel = c => LABEL[c] || c || 'no target';
  const settingLabel = s => SETTING_LABEL[s] || (s.startsWith('weight.') ? `weight on "${s.slice(7)}"` : s);
  const fmt = v => (Math.round(v * 100) / 100).toString();

  // ------------------------------------------------------------ explanation templates (pure)
  // adj: §7 adjustment. ctx: { trainee_id, eventsById, min_window, team: {capability, basis} for a "team" adjustment }
  // Remediation (INTERFACES §6): pressure stays on while the trainee misses the target, and eases once they meet it.
  function explain(adj, ctx) {
    const who = `${ctx.trainee_id} (${adj.seat})`, comp = compLabel(adj.target_competency);
    const ev = (adj.evidence_event_ids || []).map(id => ctx.eventsById[id]).filter(Boolean);
    const n = ev.length, s = ev.filter(e => e.outcome === 'success').length;
    // "went from": for some settings a lower value is the harder one (reaction delay), so say the direction separately
    const change = `${settingLabel(adj.setting)} went from ${fmt(adj.old)} to ${fmt(adj.new)}`;
    const up = adj.pressure_direction === 'up';
    let text;
    if (adj.source === 'instructor_steer') text = `Instructor steering: testing ${who} on ${comp}, so ${change} to raise the pressure.`;
    else if (adj.cause === 'team') {
      const t = ctx.team || {};
      text = `The crew's capability is ${t.capability != null ? fmt(t.capability) : 'estimated'}${t.basis === 'live' ? ' with this session\'s evidence' : ' from their profiles'}, so ${change}: the opposing units work ${up ? 'more' : 'less'} closely together.`;
    } else if (up && n < (ctx.min_window || 3))
      text = `No recent ${comp} evidence from ${who}, and it is the weakest of their focus competencies, so ${change} to create exposure.`;
    else
      text = up
        ? `${who} handled only ${s} of the last ${n} ${comp} events, so ${change} to keep pressing it.`
        : `${who} handled ${s} of the last ${n} ${comp} events, so ${change} to ease the pressure.`;
    if (adj.clamped) text += ` The request (${fmt(adj.requested)}) was capped at the instructor's envelope.`;
    return text;
  }

  // Every number in the rephrasing must already be in the template (CLAUDE.md invariant 5)
  const numbers = t => (String(t).match(/\d+(?:\.\d+)?/g) || []).map(Number);
  function rephraseIsValid(template, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 400) return false;
    const allowed = numbers(template);
    return numbers(text).every(x => allowed.includes(x));
  }

  async function rephrase(template) {
    const S = CGF.llm && CGF.llm.settings;
    if (!S || !S.enabled) return template;
    try {
      const r = await CGF.llm.chatJson(
        'Rephrase this explanation for a military training instructor in one clear sentence. Keep every number exactly as written and add no new numbers. Reply as JSON: {"text":"..."}',
        template, { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] });
      return rephraseIsValid(template, r && r.text) ? r.text.trim() : template;
    } catch (e) { return template; }
  }

  CGF.reasoning = { explain, rephraseIsValid, LABEL };

  // ------------------------------------------------------------ panel (browser only)
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id), esc = s => CGF.util.esc(s);
  let pendingDirective = null, useLlm = false;
  const teamActions = [];   // recent cooperation between CGF units (js/sim/team.js), newest last

  function ctxFor(adj) {
    const sess = CGF.adaptRuntime.session(), crew = sess ? sess.config.crew : [];
    const eventsById = {};
    for (const e of CGF.simEvents.log()) eventsById[e.event_id] = e;
    const live = sess && sess.adapt.liveState();
    return { trainee_id: (crew.find(m => m.seat === adj.seat) || {}).trainee_id || '?', eventsById,
      min_window: CGF.Adapt.MIN_WINDOW, team: live && live.teamNotes ? live.teamNotes[adj.adjustment_id] : null };
  }

  // fills adjustment.explanation (§7: the reasoning panel fills it; the policy leaves it null)
  function fillExplanations(adjustments) {
    for (const adj of adjustments) {
      const template = explain(adj, ctxFor(adj));
      adj.explanation = template;
      if (useLlm) rephrase(template).then(t => { adj.explanation = t; render(); });
    }
  }

  const arrow = d => d === 'up' ? '▲ raise' : d === 'down' ? '▼ ease' : '● hold';
  // Which of the three signals caused an entry (LANES D7), as a visible tag; classes for the design lane
  const CAUSE = { live: 'live: current behaviour', history: 'history: past training', team: 'team: CGF cooperation' };
  const causeTag = a => a.source === 'instructor_steer' ? '<span class="cause-tag cause-instructor">instructor</span>'
    : `<span class="cause-tag cause-${esc(a.cause || 'live')}" title="${esc(CAUSE[a.cause] || '')}">${esc(a.cause || 'live')}</span>`;

  function renderSeats(live) {
    if (!live) return '<div class="muted">No adaptive session. In a linked pane it starts when the host sends the allocation; here you can start a local one below.</div>';
    return live.seats.map(s => {
      // only the seat's own competencies (INTERFACES §1.1), plus the target if it falls outside them
      const shown = Object.entries(s.workingProfile).filter(([c]) => (s.focus || []).includes(c) || c === s.target);
      const bars = shown.map(([c, m]) =>
        `<div class="factor"><span>${c === s.target ? '<b>' : ''}${esc(compLabel(c))}${c === s.target ? '</b>' : ''}</span>` +
        `<div class="bar"><div style="width:${Math.round(m * 100)}%;background:var(--accent)"></div></div><span>${fmt(m)}</span></div>`).join('');
      const win = s.windowSuccessRate == null ? `no ${esc(compLabel(s.target))} events yet`
        : `${s.window.filter(w => w.ok).length} of ${s.windowCount} recent ${esc(compLabel(s.target))} events handled`;
      const prof = CGF.adaptRuntime.profileFor(s.trainee_id), who = prof && prof.name ? `${prof.name} (${s.trainee_id})` : s.trainee_id;
      return `<div class="contact"><span><b>${esc(s.seat)}</b> · ${esc(who)}</span><span>${esc(arrow(s.pressureDirection))}</span>` +
        `<span class="meta">target: <b>${esc(compLabel(s.target))}</b> · ${win}${s.steering ? ` · <b>steered</b> (${esc(s.steering.intensity)})` : ''}</span>` +
        `<div style="grid-column:1/3">${bars}</div></div>`;
    }).join('');
  }

  function renderAdjustments(list) {
    if (!list.length) return '<div class="muted">No adjustments yet.</div>';
    const byId = {}; for (const e of CGF.simEvents.log()) byId[e.event_id] = e;
    return list.slice().reverse().map(a => {
      const ev = (a.evidence_event_ids || []).map(id => byId[id]).filter(Boolean)
        .map(e => `${e.outcome === 'success' ? '✓' : '✗'} ${esc(e.type)} at ${CGF.util.fmtTime(e.t)}`).join(' · ');
      return `<div class="act"><span class="muted">${CGF.util.fmtTime(a.t)}</span> ${causeTag(a)} <b>${esc(arrow(a.pressure_direction))}</b> ` +
        `${esc(settingLabel(a.setting))}: ${fmt(a.old)} → ${fmt(a.new)}${a.clamped ? ' <span class="muted">(capped)</span>' : ''}` +
        `<div class="cause">${esc(a.seat)} · target ${esc(compLabel(a.target_competency))} · ${esc(a.source === 'instructor_steer' ? 'instructor steering' : (CAUSE[a.cause] || a.policy))}</div>` +
        (ev ? `<div class="cause">Evidence: ${ev}</div>` : '') +
        `<div class="cause">Why: ${esc(a.explanation || '')}</div></div>`;
    }).join('');
  }

  function renderTeam(live) {
    if (!CGF.scenario || !CGF.sim) return '';
    const S = CGF.scenario, forces = Object.keys(CGF.sim.forceHarness).filter(k => CGF.harnessOf({ force: k }) && CGF.sim.forceHarness[k].armed);
    const rows = forces.map(k => `<div class="factor"><span>${esc(S.forces[k].label)}</span>` +
      `<div class="bar"><div style="width:${Math.round(CGF.teamworkOf(k) * 100)}%;background:var(--accent)"></div></div><span>${Math.round(CGF.teamworkOf(k) * 100)}%</span></div>`).join('');
    const mult = CGF.settings ? CGF.settings.get('weight.team') : 1;
    const acts = teamActions.slice(-6).reverse().map(x => `<div class="act"><span class="muted">${CGF.util.fmtTime(x.t)}</span> <span class="cause-tag cause-team">team</span> ` +
      `${esc(x.to)} joined ${esc(x.from)}'s response (${esc(x.reason)}), readiness +${x.boost}</div>`).join('');
    return rows + `<div class="muted small">Adaptation multiplier on teamwork: ${fmt(mult)}${live ? ` · crew capability ${fmt(live.teamCapability)}` : ''}</div>` +
      (acts || '<div class="muted small">No cooperation yet.</div>');
  }

  function render() {
    if (!$('rsnSeats')) return;
    const sess = CGF.adaptRuntime.session(), live = sess ? sess.adapt.liveState() : null, rec = CGF.adaptRuntime.lastRecord();
    $('rsnStatus').textContent = sess
      ? `${sess.session_id} · ${sess.config.mode === 'fixed' ? 'Fixed assessment (no adjustments)' : 'Adaptive practice'} · ${sess.config.scenario} · next evaluation at ${CGF.util.fmtTime(sess.nextEval)}${sess.ended ? ' · ended' : ''}`
      : rec ? `Last session ${rec.session_id} ended: ${rec.outcome}` : 'No adaptive session';
    $('rsnLocal').hidden = !!(CGF.sim && CGF.sim.link);
    const partners = sess ? sess.config.crew.filter(m => m.role === 'partner') : [];
    $('rsnSeats').innerHTML = renderSeats(live) + partners.map(m =>
      `<div class="contact"><span><b>${esc(m.seat)}</b> · AI partner</span><span class="muted">not adapted to</span>` +
      `<span class="meta">played from the runs of ${esc((m.derived_from || {}).trainee_id || '?')}</span></div>`).join('');
    if ($('rsnTeam')) $('rsnTeam').innerHTML = renderTeam(live);
    $('rsnAdjustments').innerHTML = renderAdjustments(sess ? sess.adapt.adjustments : rec ? rec.adjustments : []);
    $('btnExportRecord').disabled = !rec;
    $('rsnRecordInfo').textContent = rec ? `${rec.session_id}: ${rec.outcome}, ${rec.events.length} events, ${rec.adjustments.length} adjustments` : 'Available when a run ends.';
  }

  function showDirective(r) {
    const d = r.directive;
    pendingDirective = r.errors.length ? null : d;
    $('steerPreview').hidden = false;
    $('steerPreview').innerHTML = `<div class="meta">${esc(r.via)} · "${esc(d.raw_text)}"</div>` +
      (r.errors.length
        ? r.errors.map(e => `<div class="cmdbad">✗ ${esc(e)}</div>`).join('') + '<div class="meta">Not applied. Rephrase the request.</div>'
        : `<div class="cmdok">✓ ${esc(d.trainee_id)} · ${esc(compLabel(d.competency))} · ${esc(d.intensity)} · ${d.duration_s} s</div>` +
          `<div class="row"><button id="btnSteerApply" class="primary">Apply</button><button id="btnSteerDiscard">Discard</button></div>`);
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function initPanel() {
    if (!$('rsnSeats')) return;
    const F = window.CGF_FIXTURES || {};
    $('rsnTrainee').innerHTML = (F.profiles || []).map(p => `<option value="${esc(p.trainee_id)}"${p.trainee_id === 'trainee_b' ? ' selected' : ''}>${esc(p.trainee_id)}</option>`).join('');
    $('rsnAgent').innerHTML = Object.entries(CGF.traineeAgents).map(([path, p]) => `<option value="${esc(path)}"${path.includes('weak') ? ' selected' : ''}>${esc(p.label || path)}</option>`).join('');
    $('btnRsnStart').onclick = () => CGF.adaptRuntime.startLocal({
      trainee: $('rsnTrainee').value, agent: $('rsnAgent').value, mode: $('rsnMode').value,
      duration_s: Math.max(120, parseInt($('rsnDuration').value, 10) || 2400)
    }).then(errs => { if (errs.length) $('rsnStatus').textContent = 'Not started: ' + errs.join('; '); render(); });
    $('rsnLlm').onchange = e => { useLlm = e.target.checked; };
    const parseSteer = async () => {
      const sess = CGF.adaptRuntime.session();
      if (!sess || sess.ended) { showDirective({ directive: { raw_text: $('steerText').value }, errors: ['no adaptive session is running'], via: 'not sent' }); return; }
      $('steerPreview').hidden = false; $('steerPreview').innerHTML = '<div class="meta">Parsing…</div>';
      showDirective(await CGF.adaptSteer.interpret($('steerText').value, sess.config.crew));
    };
    $('btnSteerParse').onclick = parseSteer;
    $('steerText').addEventListener('keydown', e => { if (e.key === 'Enter') parseSteer(); });
    $('steerPreview').addEventListener('click', e => {
      if (e.target.id === 'btnSteerApply' && pendingDirective) {
        try { CGF.adaptRuntime.steer(pendingDirective); $('steerPreview').innerHTML += '<div class="cmdok">Applied. It takes effect at the next evaluation.</div>'; }
        catch (err) { $('steerPreview').innerHTML += `<div class="cmdbad">${esc(err.message)}</div>`; }
        pendingDirective = null; $('steerText').value = '';
        const b = $('btnSteerApply'); if (b) b.remove();
      }
      if (e.target.id === 'btnSteerDiscard') { pendingDirective = null; $('steerPreview').hidden = true; }
    });
    $('btnExportRecord').onclick = () => { const r = CGF.adaptRuntime.lastRecord(); if (r) download(`session-record-${r.session_id}.json`, JSON.stringify(r, null, 2)); };

    CGF.on('adapt:cycle', ({ adjustments }) => { fillExplanations(adjustments); render(); });
    CGF.on('sim:team', x => { teamActions.push(x); if (teamActions.length > 50) teamActions.shift(); });
    CGF.on('reset', () => { teamActions.length = 0; });
    CGF.on('team-config', () => setTimeout(render, 0));
    for (const evt of ['adapt:start', 'adapt:steer', 'session-record', 'reset']) CGF.on(evt, () => setTimeout(render, 0));
    render();
  }

  // main.js boots asynchronously; the panel only needs the DOM and the modules above
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPanel); else initPanel();
})();
