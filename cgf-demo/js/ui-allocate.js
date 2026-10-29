// Trainee allocation page (allocate.html): choose the player platform (fighter, warship or tank), put a trainee
// in every seat of one crew and set the run options. It outputs one
// Allocation (docs/INTERFACES.md §3.1), which the run page expands into the scenario config.
// Starting the run is linked later; this page only produces a valid allocation.
//
// A seat is a trainee station. The seats come from the platform type, so the page adapts to the player role:
// fighter 2 (pilot, weapon), warship 3 (weapons, sensors, navigation), tank 2 (commander, driver).
//
// The pure functions (CGF.allocate.*) carry no DOM access so tests/allocate.html can check them.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, C = CGF.contracts;

  // The runtime plays AI partner seats (LANES D8, Devin, commit 178812d). Set this to false to hold Start back for an
  // allocation with a partner, if the runtime ever stops playing them.
  const PARTNERS_RUN = true;

  const STORE_KEY = 'cgf.allocation';         // localStorage: the saved allocation
  const DEFAULTS = { scenario: 'strait-transit', seed: 1234, mode: 'adaptive', duration_s: 2400, eval_interval_s: 30 };   // 2400 s: the ownship meets its first hails about 15 min in (Devin, decision B)
  const DEFAULT_PLATFORM = { type: 'warship', model: 'formidable' };
  const LABELS = {
    hail_discipline: 'Hail', collision_avoidance: 'Collision', territorial_awareness: 'Territorial',
    weapons_discipline: 'Weapons', speed_management: 'Speed', threat_evaluation: 'Threat eval',
    contact_detection: 'Detection', picture_reporting: 'Reporting', escalation_control: 'Escalation'
  };

  const LONG = {
    hail_discipline: 'hail discipline', collision_avoidance: 'collision avoidance', territorial_awareness: 'territorial awareness',
    weapons_discipline: 'weapons discipline', speed_management: 'speed management', threat_evaluation: 'threat evaluation',
    contact_detection: 'contact detection', picture_reporting: 'picture reporting', escalation_control: 'escalation control'
  };
  const WEAK_BELOW = 0.5, STRONG_FROM = 0.7;   // a measured competency is weak below 0.50 and strong from 0.70

  // ------------------------------------------------------------ pure functions
  const clone = o => JSON.parse(JSON.stringify(o));
  const mean = c => c.alpha / (c.alpha + c.beta);
  const seatsOf = type => C.SEATS_BY_TYPE[type] || [];

  // Per competency: alpha, beta, mean, evidence n, whether n is enough, and whether it is the bare prior
  function summarise(profile) {
    const out = {};
    for (const k of C.COMPETENCIES) {
      const c = profile.competencies[k], ab = c || C.PRIOR, n = ab.alpha + ab.beta;
      out[k] = { alpha: ab.alpha, beta: ab.beta, mean: mean(ab), n, enough: n >= C.EVIDENCE_MIN, prior: !c };
    }
    return out;
  }

  const nameOf = p => (p && (p.name || p.trainee_id)) || '';

  // Plain-language summary of a profile, computed by code (never by the LLM). `only` limits it to some competencies,
  // for example the ones a seat exercises. Weak and strong need enough evidence; the rest are listed as thin or none.
  function describe(profile, only) {
    const s = summarise(profile), keys = only && only.length ? only : C.COMPETENCIES;
    const rows = keys.map(k => Object.assign({ k }, s[k]));
    const enough = rows.filter(r => r.enough);
    const weak = enough.filter(r => r.mean < WEAK_BELOW).sort((a, b) => a.mean - b.mean);
    const strong = enough.filter(r => r.mean >= STRONG_FROM).sort((a, b) => b.mean - a.mean);
    const thin = rows.filter(r => !r.prior && !r.enough);
    const none = rows.filter(r => r.prior);
    const fmt = r => `${LONG[r.k]} (${r.mean.toFixed(2)}, evidence ${Math.round(r.n)})`;
    // "Focus area" and "strength", not "weak" and "strong": the page describes where practice helps, not how good a person is
    const parts = [weak.length ? `Focus areas: ${weak.map(fmt).join(', ')}.` : enough.length ? 'No clear focus area.' : 'Nothing measured yet.'];
    if (strong.length) parts.push(`Strengths: ${strong.map(fmt).join(', ')}.`);
    if (thin.length) parts.push(`Thin evidence: ${thin.map(r => LONG[r.k]).join(', ')}.`);
    if (none.length) parts.push(`No evidence yet: ${none.map(r => LONG[r.k]).join(', ')}.`);
    return { weak, strong, thin, none, text: parts.join(' ') };
  }

  // A preview of the engine's first target for one seat, by the rule in INTERFACES §5.1. The real answer comes from
  // Adapt.predictTarget (Devin, docs/project/request-devin-predict-target.md); the page prefers it and only uses
  // this when it is absent, and labels the result a preview.
  function previewTarget(profile, competencies, mode) {
    if (mode === 'fixed') return { competency: null, reason: 'fixed_mode' };
    const s = summarise(profile);
    const weakest = list => list.filter(k => s[k].enough).sort((a, b) => s[a].mean - s[b].mean)[0] || null;
    let k = weakest(competencies || []), reason = 'weakest_in_seat';
    if (!k) { k = weakest(C.COMPETENCIES); reason = 'weakest_overall'; }
    if (!k) return { competency: null, reason: 'no_evidence' };
    return { competency: k, mean: s[k].mean, evidence: s[k].n, reason };
  }

  function describePrediction(r) {
    if (!r) return '';
    const tag = r.source === 'adapt' ? '' : ' (preview)';
    if (r.reason === 'fixed_mode') return 'Fixed mode: no adjustments.';
    if (!r.competency) return 'No target yet: no competency has enough evidence.' + tag;
    const why = r.reason === 'weakest_overall' ? ' None of this seat’s competencies has enough evidence, so this is the weakest overall.' : '';
    const sets = Array.isArray(r.settings) && r.settings.length ? ` Nudges: ${r.settings.join(', ')}.` : '';
    const mean = typeof r.mean === 'number' ? ` (${r.mean.toFixed(2)})` : '';
    return `Likely first target: ${LONG[r.competency] || r.competency}${mean}.${why}${sets}${tag}`;
  }

  // Fill the crew for a demo. Each seat, in seat order, gets the unused trainee with the weakest measured competency in
  // that seat's focus (the most to gain), or the weakest on `prefer` when that competency is a focus of the seat.
  // A seat with no measured competency gets the first unused trainee. Ties go to the lower trainee id, so the result is
  // deterministic. Null only if there are fewer trainees than seats.
  function suggestCrew(profiles, summaries, type, seatFocus, prefer) {
    const ids = profiles.map(p => p.trainee_id).sort(), used = new Set(), crew = {}, picks = [];
    for (const seat of seatsOf(type)) {
      const focus = (seatFocus && seatFocus[seat]) || [], keys = prefer && focus.includes(prefer) ? [prefer] : focus;
      let best = null;
      for (const id of ids) {
        if (used.has(id)) continue;
        for (const k of keys) {
          const sm = summaries[id] && summaries[id][k];
          if (sm && sm.enough && (!best || sm.mean < best.mean - 1e-12)) best = { seat, id, k, mean: sm.mean };
        }
      }
      if (!best) {   // nothing measured for this seat (sensors, for now): the first unused trainee, so the crew is still complete
        const id = ids.find(x => !used.has(x));
        if (!id) return null;
        best = { seat, id, k: null, mean: null };
      }
      crew[seat] = best.id; used.add(best.id); picks.push(best);
    }
    return { crew, picks };
  }

  // Next seed from the current one (31-bit LCG): repeatable, no Math.random
  const nextSeed = s => (Math.imul(s >>> 0, 1103515245) + 12345) & 0x7fffffff;

  // A scenario's domain as the engine reads it: scenarios without a domain are sea scenarios
  const domainOfIn = scenarios => id => (scenarios && scenarios[id] && scenarios[id].domain) || 'sea';

  function defaultScenarioFor(type, scenarioIds, domainOf) {
    const want = C.DOMAIN_BY_TYPE[type];
    return scenarioIds.find(id => domainOf(id) === want) || null;
  }

  // `partners[seat]` is set only for a seat played by an AI partner (INTERFACES §3.2): the id of the trainee whose
  // older runs it copies, or '' while that is still to be chosen. A partner seat has no trainee and no scripted agent.
  function emptyCrew(type) {
    const crew = {}, agents = {}, partners = {};
    seatsOf(type).forEach(seat => { crew[seat] = null; agents[seat] = ''; });
    return { crew, agents, partners };
  }
  const roleOf = (sel, seat) => (sel.partners && typeof sel.partners[seat] === 'string' ? 'partner' : 'trainee');
  const derivedOf = (sel, seat) => (roleOf(sel, seat) === 'partner' ? sel.partners[seat] : null);
  // A seat is filled by a trainee, or by a partner that already knows whose runs it copies
  const seatFilled = (sel, seat) => (roleOf(sel, seat) === 'partner' ? !!derivedOf(sel, seat) : !!sel.crew[seat]);

  // Make a seat an AI partner copying `derivedId` ('' = not chosen yet). The seat loses its trainee and scripted agent.
  function setPartner(sel, seat, derivedId) {
    const next = clone(sel);
    next.partners = next.partners || {};
    next.crew[seat] = null; next.agents[seat] = '';
    next.partners[seat] = derivedId || '';
    return next;
  }
  function clearPartner(sel, seat) {
    const next = clone(sel);
    if (next.partners) delete next.partners[seat];
    return next;
  }

  const PARTNER_RATE_LABELS = {
    hail_acknowledged: 'answers a hail', safe_passage: 'keeps a safe passing distance', left_territorial: 'leaves territorial waters',
    fc_restraint: 'holds fire control back', pirate_speed_response: 'speeds up when raiders approach'
  };
  // What a partner will do, in words, from its agent_params (computed by Assess.partnerParams, never by the LLM)
  function describePartner(params, name) {
    if (!params) return '';
    const b = params.basis || {}, base = b.source === 'history' ? `${b.sessions} saved session${b.sessions === 1 ? '' : 's'}`
      : b.source === 'profile' ? 'the profile averages' : 'defaults (no data on them yet)';
    const rates = Object.entries(params.rates || {}).map(([t, r]) => `${PARTNER_RATE_LABELS[t] || t} ${Math.round(r * 100)}% of the time`).join('; ');
    return `Plays like ${name || 'them'}, from ${base}. ${rates}.`;
  }

  // Change the platform. Within a type (another model) the crew stays. Across types the seats differ, so only
  // seat ids that exist in both are carried over; the scenario follows the type's domain.
  function withPlatform(sel, platform, scenarioIds, domainOf) {
    const next = clone(sel), fresh = emptyCrew(platform.type);
    for (const seat of seatsOf(platform.type)) {
      if (sel.crew && seat in sel.crew) { fresh.crew[seat] = sel.crew[seat]; fresh.agents[seat] = sel.agents[seat] || ''; }
      if (roleOf(sel, seat) === 'partner') fresh.partners[seat] = sel.partners[seat];
    }
    next.platform = { type: platform.type, model: platform.model };
    next.crew = fresh.crew; next.agents = fresh.agents; next.partners = fresh.partners;
    if (domainOf(next.opts.scenario) !== C.DOMAIN_BY_TYPE[platform.type]) {
      const d = defaultScenarioFor(platform.type, scenarioIds, domainOf);
      if (d) next.opts.scenario = d;
    }
    return next;
  }

  // Put a trainee in a seat. A trainee already seated elsewhere is moved, never duplicated.
  function seatTrainee(sel, seat, id, defaultAgent) {
    const next = clone(sel);
    for (const st of Object.keys(next.crew)) if (next.crew[st] === id) { next.crew[st] = null; next.agents[st] = ''; }
    next.crew[seat] = id;
    if (next.partners) delete next.partners[seat];   // seating a trainee makes the seat a trainee seat
    if (!next.agents[seat]) next.agents[seat] = defaultAgent || '';
    return next;
  }

  // Next empty seat after the given one, or the same seat when all are full
  function nextEmptySeat(sel, from) {
    const order = seatsOf(sel.platform.type).map(s => ({ seat: s }));
    const i = order.findIndex(o => o.seat === from.seat);
    for (let k = 1; k <= order.length; k++) {
      const o = order[(i + k) % order.length];
      if (!seatFilled(sel, o.seat)) return o;
    }
    return from;
  }

  // Field-level problems with a selection, as { field: message }. Empty object = ready.
  // Seat fields are `seat_<seat>` and `agent_<seat>`.
  function checkSelection(sel, ctx) {
    const e = {}, o = sel.opts, seats = seatsOf(sel.platform.type), seen = {};
    let trainees = 0;
    for (const seat of seats) {
      if (roleOf(sel, seat) === 'partner') {   // an AI partner only needs to know whose runs it copies
        if (!derivedOf(sel, seat)) e[`seat_${seat}`] = `Pick whose runs the AI partner in ${seat} copies.`;
        continue;
      }
      trainees++;
      const id = sel.crew[seat];
      if (!id) e[`seat_${seat}`] = `Pick a trainee for ${seat}.`;
      else {
        if (seen[id]) e[`seat_${seat}`] = `${id} is already in ${seen[id]}.`;
        seen[id] = seat;
        if (!sel.agents[seat]) e[`agent_${seat}`] = 'Pick a scripted agent.';
      }
    }
    if (!trainees) e.crew = 'At least one seat must be a trainee.';
    if (!C.SEATS_BY_TYPE[sel.platform.type]) e.platform = 'Pick a platform type.';
    else if (ctx.models && !ctx.models.some(m => m.id === sel.platform.model && m.type === sel.platform.type)) e.platform = 'Pick a platform model.';
    if (ctx.scenarioIds && !ctx.scenarioIds.includes(o.scenario)) e.scenario = 'Scenario is not loaded.';
    else if (ctx.domainOf && C.DOMAIN_BY_TYPE[sel.platform.type] && ctx.domainOf(o.scenario) !== C.DOMAIN_BY_TYPE[sel.platform.type])
      e.scenario = `This is a ${ctx.domainOf(o.scenario)} scenario; a ${sel.platform.type} needs a ${C.DOMAIN_BY_TYPE[sel.platform.type]} one.`;
    if (!Number.isInteger(o.seed) || o.seed < 0) e.seed = 'Seed must be a whole number, 0 or more.';
    if (!(o.duration_s > 0)) e.duration_s = 'Duration must be more than 0.';
    if (!(o.eval_interval_s > 0)) e.eval_interval_s = 'Interval must be more than 0.';
    else if (o.eval_interval_s >= o.duration_s) e.eval_interval_s = 'Interval must be shorter than the duration.';
    return e;
  }

  // The §3.1 Allocation: the run settings once, and the crew. The run page derives the §3 scenario config
  // with CGF.contracts.expandAllocation.
  // An AI partner seat becomes { seat, trainee_id: 'partner_<seat>', role, derived_from, agent_params }, with agent_params
  // from `paramsFor({trainee_id})` (default Assess.partnerParams), so the page and the run see the same numbers.
  function buildAllocation(sel, envelope, paramsFor) {
    const o = sel.opts, params = paramsFor || (CGF.Assess && CGF.Assess.partnerParams);
    const entry = seat => {
      if (roleOf(sel, seat) !== 'partner') return { seat, trainee_id: sel.crew[seat], agent_profile: sel.agents[seat] };
      if (typeof params !== 'function') throw new Error('buildAllocation: an AI partner needs Assess.partnerParams');
      const from = { trainee_id: derivedOf(sel, seat) };
      return { seat, trainee_id: 'partner_' + seat, role: 'partner', derived_from: from, agent_params: params(clone(from)) };
    };
    return {
      allocation_id: `alloc_${o.seed}_${sel.platform.type}`,
      created_at_session: null,   // no completed session id exists yet; the Lead sets this when sessions are recorded
      shared: {
        scenario: o.scenario, seed: o.seed, mode: o.mode, duration_s: o.duration_s, eval_interval_s: o.eval_interval_s,
        envelope: clone(envelope), platform: { type: sel.platform.type, model: sel.platform.model }
      },
      crew: seatsOf(sel.platform.type).map(entry)
    };
  }

  // Inverse of buildAllocation, for restoring a saved allocation. Returns null for anything that doesn't fit,
  // including allocations saved in the older one-trainee-per-seat format.
  function selectionFrom(allocation, opts) {
    try {
      // Allocations saved in a browser before 2026-10-29 hold the crew as slots[0].crew; read-only shim, never written back.
      if (allocation && !('crew' in allocation) && Array.isArray(allocation.slots) && allocation.slots[0]) {
        allocation = Object.assign({}, allocation, { crew: allocation.slots[0].crew }); delete allocation.slots;
      }
      if (C.validateAllocation(allocation, opts).length) return null;
      const sh = allocation.shared, sel = { platform: clone(sh.platform), crew: {}, agents: {}, partners: {},
        opts: { scenario: sh.scenario, seed: sh.seed, mode: sh.mode, duration_s: sh.duration_s, eval_interval_s: sh.eval_interval_s } };
      allocation.crew.forEach(m => {
        if (m.role === 'partner') { sel.crew[m.seat] = null; sel.agents[m.seat] = ''; sel.partners[m.seat] = m.derived_from.trainee_id; }
        else { sel.crew[m.seat] = m.trainee_id; sel.agents[m.seat] = m.agent_profile; }
      });
      return sel;
    } catch (e) { return null; }
  }

  const handoffUrl = allocation => 'host.html?alloc=' + encodeURIComponent(JSON.stringify(allocation));

  CGF.allocate = { STORE_KEY, DEFAULTS, DEFAULT_PLATFORM, LONG, mean, seatsOf, summarise, nameOf, describe,
    previewTarget, describePrediction, suggestCrew, nextSeed, domainOfIn,
    defaultScenarioFor, emptyCrew, withPlatform, seatTrainee, nextEmptySeat, checkSelection, buildAllocation,
    selectionFrom, handoffUrl, roleOf, derivedOf, seatFilled, setPartner, clearPartner, describePartner, PARTNERS_RUN };

  // ------------------------------------------------------------ page
  if (!document.getElementById('allocApp')) return;   // loaded by the test page: functions only

  const F = window.CGF_FIXTURES || {};
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const st = {
    profiles: [], summaries: {}, envelope: null, scenarioIds: [], domainOf: () => 'sea', models: F.platformModels || [],
    platform: clone(DEFAULT_PLATFORM), crew: {}, agents: {}, active: { seat: 'weapons' },
    opts: Object.assign({}, DEFAULTS), sortKey: 'trainee_id', sortDir: 1, weakAt: '', status: '', inspect: null, showAll: false
  };
  const typeInfo = () => (F.platformTypes || {})[st.platform.type] || { seats: [], seatFocus: {} };
  const modelInfo = () => st.models.find(m => m.id === st.platform.model) || null;
  const ctx = () => ({ scenarioIds: st.scenarioIds, domainOf: st.domainOf, models: st.models });

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } },
    write(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  // Instructor notes, one text per trainee, kept in this browser (cgf.notes.<trainee_id>). Never sent anywhere.
  const notes = {
    get(id) { try { return localStorage.getItem('cgf.notes.' + id) || ''; } catch (e) { return ''; } },
    set(id, text) { try { if (text) localStorage.setItem('cgf.notes.' + id, text); else localStorage.removeItem('cgf.notes.' + id); } catch (e) { /* storage blocked */ } }
  };
  const profileOf = id => st.profiles.find(p => p.trainee_id === id) || null;
  const nameById = id => (profileOf(id) ? nameOf(profileOf(id)) : id || '');

  // The engine's first target for a seat. Adapt.predictTarget (Devin) when it is loaded, else the labelled preview.
  function predictFor(id, seat) {
    const profile = profileOf(id);
    if (!profile) return null;
    const input = { profile: clone(profile), seat, competencies: (typeInfo().seatFocus || {})[seat] || [], mode: st.opts.mode };
    try {
      if (window.Adapt && typeof window.Adapt.predictTarget === 'function') {
        const r = window.Adapt.predictTarget(input);
        if (r && typeof r === 'object') return Object.assign({ source: 'adapt' }, r);
      }
    } catch (e) { console.error('Adapt.predictTarget failed, using the preview:', e); }
    return Object.assign({ source: 'preview' }, previewTarget(input.profile, input.competencies, input.mode));
  }

  // Bars carry a class, not a colour: Eevee styles them (design/requests.md R1), one neutral hue scaled by value,
  // with a marker on the focus area, so red and green stay reserved for force identity and status.
  const barClass = m => m < 0.4 ? 'bar--low' : m < 0.6 ? 'bar--mid' : 'bar--high';
  // The competency a profile points to as its focus area: the lowest mean among those with enough evidence
  function focusKeyOf(sum) {
    let best = null;
    for (const k of C.COMPETENCIES) if (sum[k].enough && (best === null || sum[k].mean < sum[best].mean)) best = k;
    return best;
  }
  const activeFocus = () => (typeInfo().seatFocus || {})[st.active.seat] || [];
  const shownKeys = () => st.showAll || !activeFocus().length ? C.COMPETENCIES : activeFocus();   // R6: the seat's three by default
  const seatLabel = seat => { const m = modelInfo(); return (m && m.seats[seat] && m.seats[seat].label) || seat; };
  const seatOf = id => { for (const s of seatsOf(st.platform.type)) if (st.crew[s] === id) return { seat: s }; return null; };

  // ◎, not ◆: a diamond is the hostile or suspect frame in MIL-STD-2525 (design/requests.md R15)
  const FOCUS_MARK = '<span class="focusMark" title="Focus area: the lowest competency with enough evidence">◎</span>';
  function barHtml(s, isFocusArea) {
    const cls = `bar${s.prior ? ' prior' : s.enough ? '' : ' thin'}${isFocusArea ? ' bar--focus' : ''}`;
    return `<span class="${cls}"><i class="${s.prior ? '' : barClass(s.mean)}" style="width:${(s.mean * 100).toFixed(0)}%"></i></span>`;
  }
  function compCell(s, focus, isFocusArea) {
    const title = s.prior ? 'No data: prior alpha 1, beta 1'
      : `mean ${s.mean.toFixed(2)} · alpha ${s.alpha}, beta ${s.beta} · evidence ${s.n}${s.enough ? '' : ' (not enough, needs ' + C.EVIDENCE_MIN + ')'}`;
    return `<td class="${focus ? 'focus' : 'dim'}" title="${esc(title)}">${barHtml(s, isFocusArea)}` +
      `<span class="val">${s.prior ? '—' : s.mean.toFixed(2)}</span>${isFocusArea ? FOCUS_MARK : ''}</td>`;
  }

  function sortedRows() {
    let rows = st.profiles.slice();
    if (st.weakAt) rows = rows.filter(p => { const s = st.summaries[p.trainee_id][st.weakAt]; return s.enough && s.mean < 0.5; });
    const key = p => st.sortKey === 'trainee_id' ? nameOf(p).toLowerCase()
      : st.sortKey === 'sessions' ? p.sessions_completed : st.summaries[p.trainee_id][st.sortKey].mean;
    return rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * st.sortDir; });
  }

  // The trainee pool: by default only the competencies the selected seat exercises (R6); "Show all" adds the rest.
  function renderRoster() {
    const focus = activeFocus(), keys = shownKeys();
    if (st.sortKey !== 'trainee_id' && st.sortKey !== 'sessions' && !keys.includes(st.sortKey)) st.sortKey = 'trainee_id';
    const head = [['trainee_id', 'Trainee'], ['sessions', 'Sess.'], ...keys.map(k => [k, LABELS[k]])]
      .map(([k, l]) => `<th data-sort="${k}" class="${st.sortKey === k ? 'sorted' : ''} ${focus.includes(k) ? 'focus' : ''}">${l}${st.sortKey === k ? (st.sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const rows = sortedRows();
    const body = rows.map(p => {
      const sum = st.summaries[p.trainee_id], at = seatOf(p.trainee_id), fk = focusKeyOf(sum);
      return `<tr data-id="${esc(p.trainee_id)}" class="${at ? 'taken' : ''}">` +
        `<td class="id" title="${esc(p.trainee_id)}">${at ? `<span class="slotTag" title="${esc(seatLabel(at.seat))}">${seatsOf(st.platform.type).indexOf(at.seat) + 1}</span>` : ''}` +
        `${esc(nameOf(p))}${notes.get(p.trainee_id) ? ' <span class="muted" title="You have a note on this trainee">✎</span>' : ''}</td>` +
        `<td class="num">${p.sessions_completed}</td>` + keys.map(k => compCell(sum[k], focus.includes(k), k === fk)).join('') + '</tr>';
    }).join('');
    $('roster').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body ||
      `<tr><td colspan="${2 + keys.length}" class="muted">No trainee matches this filter.</td></tr>`}</tbody>`;
    $('rosterCount').textContent = `${rows.length} of ${st.profiles.length} trainees` +
      (st.showAll ? '' : ` · showing the ${esc(seatLabel(st.active.seat))} seat's competencies`);
  }

  // The selected trainee in full: every competency, a plain-language summary, and a private note.
  function renderDetail() {
    const el = $('detail'), p = st.inspect && profileOf(st.inspect);
    if (!p) {
      el.innerHTML = '<span class="muted small">Point at a trainee in the pool to see their competencies, strengths, focus areas and your notes. Click to seat them.</span>';
      return;
    }
    const sum = st.summaries[p.trainee_id], d = describe(p), focus = activeFocus(), at = seatOf(p.trainee_id), fk = focusKeyOf(sum);
    const bars = C.COMPETENCIES.map(k => {
      const s = sum[k];
      return `<div class="small compRow ${focus.includes(k) ? '' : 'dim'}"><span class="compName">${esc(LONG[k])}</span>` +
        `${barHtml(s, k === fk)}<span class="val">${s.prior ? '—' : s.mean.toFixed(2)}</span>` +
        `<span class="muted">${s.prior ? 'no evidence' : 'evidence ' + Math.round(s.n) + (s.enough ? '' : ' (thin)')}</span>${k === fk ? FOCUS_MARK + ' <span class="muted">focus area</span>' : ''}</div>`;
    }).join('');
    el.innerHTML = `<div class="row"><b>${esc(nameOf(p))}</b><span class="muted small">${esc(p.trainee_id)} · ${p.sessions_completed} session${p.sessions_completed === 1 ? '' : 's'}` +
      `${at ? ` · seated in ${esc(seatLabel(at.seat))}` : ''}</span></div>` +
      `<div class="small">${esc(d.text)}</div>${bars}` +
      `<label class="field"><span>Your notes</span><textarea id="noteBox" rows="2" data-id="${esc(p.trainee_id)}" placeholder="Private notes on this trainee">${esc(notes.get(p.trainee_id))}</textarea></label>`;
  }

  // The crew: the vehicle picture and one card per seat.
  function renderCrews(errs) {
    const agents = F.agentProfiles || [], model = modelInfo(), info = typeInfo(), V = CGF.vehicles;
    $('slots').innerHTML = [0].map(() => {
      const people = {};
      const cards = seatsOf(st.platform.type).map((seat, i) => {
        const sel = selection(), partner = roleOf(sel, seat) === 'partner', derived = partner ? derivedOf(sel, seat) : null;
        const id = partner ? null : st.crew[seat], sum = id && st.summaries[id], isActive = st.active.seat === seat;
        const focus = (info.seatFocus || {})[seat] || [], seatDef = model && model.seats[seat];
        people[seat] = { name: partner ? 'AI partner' : id ? nameById(id) : '', active: isActive };
        const mini = sum ? focus.map(k => `<span title="${LONG[k]}: ${sum[k].prior ? 'no data' : sum[k].mean.toFixed(2)}">` +
          `<b class="${sum[k].prior ? 'bar--none' : barClass(sum[k].mean)}"></b>${LABELS[k]} ${sum[k].prior ? '—' : sum[k].mean.toFixed(2)}</span>`).join('') : '';
        const e = errs[`agent_${seat}`] || ((id || partner) && errs[`seat_${seat}`]);
        const pred = id ? describePrediction(predictFor(id, seat)) : '';
        let params = null;   // the partner's parameters, from the same function the allocation uses
        if (partner && derived && CGF.Assess) { try { params = CGF.Assess.partnerParams({ trainee_id: derived }); } catch (err) { params = null; } }
        const who = partner
          ? (derived ? `<b>AI partner</b> copying <b data-inspect="${esc(derived)}">${esc(nameById(derived))}</b>` : `<span class="muted">AI partner: ${isActive ? 'choose from the pool whose runs it copies' : 'click here, then choose whose runs it copies'}</span>`)
          : id ? `<b data-inspect="${esc(id)}">${esc(nameById(id))}</b> <span class="muted small">${esc(id)}</span>`
          : `<span class="muted">${isActive ? 'Choose a trainee from the pool' : 'Click here, then choose a trainee'}</span>`;
        return `<div class="seat ${isActive ? 'active' : ''}" data-seat="${seat}">` +
          `<div class="seatHead"><b>${i + 1} · ${esc(seatDef ? seatDef.label : seat)}</b><span class="grow"></span>` +
          (id || partner ? `<button data-clear="${seat}" title="Clear this seat">Clear</button>` : '') + '</div>' +
          `<div class="seatWho">${who}</div>` +
          (sum ? `<div class="mini">${mini}</div><div class="small muted">${esc(describe(profileOf(id), focus).text)}</div>` : '') +
          (pred ? `<div class="small">${esc(pred)}</div>` : '') +
          (params ? `<div class="small">${esc(describePartner(params, nameById(derived)))}</div>` : '') +
          (partner ? '<div class="small muted">Partners are not adapted to and are not assessed.</div>' : '') +
          (seatDef ? `<details class="seatMore"><summary class="small muted">About this seat</summary><div class="seatText">${esc(seatDef.text)}</div></details>` : '') +
          `<label class="field"><span>Seat played by</span><select data-role="${seat}"><option value="trainee" ${partner ? '' : 'selected'}>A trainee</option>` +
          `<option value="partner" ${partner ? 'selected' : ''}>An AI partner</option></select></label>` +
          (partner ? '' : `<label class="field"><span>Scripted agent</span><select data-agent="${seat}"><option value="">Choose…</option>` +
            agents.map(a => `<option value="${esc(a.path)}" ${st.agents[seat] === a.path ? 'selected' : ''}>${esc(a.label)}</option>`).join('') + '</select></label>') +
          (e ? `<div class="err">${esc(e)}</div>` : '') + '</div>';
      }).join('');
      const sims = (V.TYPES[st.platform.type] || { simulated: [] }).simulated.map(s => s[2]);
      return `<div class="crew"><div class="crewHead">Crew <span class="muted small">${esc((modelInfo() || {}).name || '')}</span></div>` +
        `${V.svg(st.platform.type, people)}` +
        (sims.length ? `<div class="small muted">Dashed markers are simulated: ${esc(sims.join(', '))}.</div>` : '') + `${cards}</div>`;
    }).join('');
  }

  function renderEnvelope() {
    const range = k => C.SETTING_RANGES[k] || C.WEIGHT_RANGE;
    $('envelope').innerHTML = Object.entries(st.envelope).map(([k, e]) =>
      `<tr><td title="allowed ${range(k)[0]} to ${range(k)[1]}">${esc(k)}</td>` +
      ['min', 'base', 'max'].map(f => `<td><input type="number" step="any" style="width:64px" data-env="${esc(k)}:${f}" value="${e[f]}"></td>`).join('') + '</tr>').join('');
  }

  function renderPlatform(errs) {
    $('optType').value = st.platform.type;
    const models = st.models.filter(m => m.type === st.platform.type);
    $('optModel').innerHTML = models.map(m => `<option value="${esc(m.id)}" ${m.id === st.platform.model ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
    const m = modelInfo(), t = typeInfo();
    // A summary and a Source link; the long sourcing notes sit one click away (R5)
    $('platformInfo').innerHTML = m ? `<div><b>${esc(m.name)}</b> · ${esc(m.operator)} · ${t.seats.length} trainee seats per crew · ${esc(C.DOMAIN_BY_TYPE[st.platform.type])} domain · ` +
      `<a href="${esc(m.source)}" target="_blank" rel="noopener">Source</a></div>` +
      `<details><summary class="small muted">About these seats</summary><div class="muted small">Real crew: ${esc(m.realCrew)}.` +
      `${m.note ? ' ' + esc(m.note) : ''}</div></details>` : '';
    $('err_platform').textContent = errs.platform || '';
  }

  function renderScenarios(errs) {
    $('optScenario').innerHTML = st.scenarioIds.map(id => {
      const s = CGF.scenarios[id], ok = st.domainOf(id) === C.DOMAIN_BY_TYPE[st.platform.type];
      return `<option value="${esc(id)}" ${ok ? '' : 'disabled'}>${esc(s.name || id)}${ok ? '' : ' (doesn’t match this platform)'}</option>`;
    }).join('');
    $('optScenario').value = st.opts.scenario;
    for (const f of ['scenario', 'seed', 'duration_s', 'eval_interval_s']) $('err_' + f).textContent = errs[f] || '';
  }

  // The mode badge, the "choosing for" line, and the one-line summaries of the collapsible sections. A section that
  // holds an error opens by itself, so a problem is never hidden behind a closed panel.
  const MODE_NAMES = { adaptive: 'Adaptive practice', fixed: 'Fixed assessment' };
  function renderChrome(errs, envErrs) {
    const fixed = st.opts.mode === 'fixed';
    $('modeBadge').className = 'modeBadge ' + (fixed ? 'mode-fixed' : 'mode-adaptive');
    $('modeBadge').textContent = (fixed ? '■ ' : '↻ ') + (MODE_NAMES[st.opts.mode] || st.opts.mode) + (fixed ? ' · no adjustments' : '');
    const seat = st.active, seats = seatsOf(st.platform.type), allFull = seats.every(s => seatFilled(selection(), s));
    const forPartner = seat && roleOf(selection(), seat.seat) === 'partner';
    $('poolFor').innerHTML = seat && seat.seat in (st.crew || {})
      ? (forPartner ? `Choosing whose runs the <b>AI partner in ${esc(seatLabel(seat.seat))}</b> copies` : `Choosing for <b>${esc(seatLabel(seat.seat))}</b>`) +
        `${allFull ? ' <span class="muted">(all seats filled; click a seat to change it)</span>' : ''}` : '';
    const o = st.opts, sc = CGF.scenarios[o.scenario];
    $('runSummary').textContent = `${sc ? (sc.name || o.scenario) : o.scenario} · seed ${o.seed} · ${MODE_NAMES[o.mode] || o.mode} · ` +
      `${Number.isFinite(o.duration_s) ? Math.round(o.duration_s / 60) : '?'} min · evaluate every ${o.eval_interval_s} s`;
    $('envSummary').textContent = `${Object.keys(st.envelope).length} settings` + (envErrs.length ? ` · ${envErrs.length} problem${envErrs.length > 1 ? 's' : ''}` : '');
    if (['scenario', 'seed', 'duration_s', 'eval_interval_s'].some(f => errs[f])) $('runBox').open = true;
    if (envErrs.length) $('envBox').open = true;
  }

  function render() {
    const errs = checkSelection(st, ctx()), ready = !Object.keys(errs).length;
    renderPlatform(errs); renderScenarios(errs); renderRoster(); renderCrews(errs);
    if (document.activeElement !== $('noteBox')) renderDetail();   // never rebuild the note box while it is being typed in
    const envErrs = C.validateEnvelope(st.envelope);
    $('err_envelope').innerHTML = envErrs.map(esc).join('<br>');
    renderChrome(errs, envErrs);
    const empty = Object.keys(errs).filter(k => k.startsWith('seat_') && /^Pick/.test(errs[k])).length;
    let alloc = null, cErrs = [];
    if (ready) {
      alloc = buildAllocation(st, st.envelope);
      cErrs = C.validateAllocation(alloc, { scenarios: st.scenarioIds, domainOf: st.domainOf });
    }
    const ok = ready && !cErrs.length;
    const hasPartner = seatsOf(st.platform.type).some(s => roleOf(selection(), s) === 'partner');
    const blocked = ok && hasPartner && !PARTNERS_RUN;   // valid, but the runtime cannot play it yet
    $('btnStart').disabled = !ok || blocked; $('btnSave').disabled = $('btnExport').disabled = !ok;
    $('output').textContent = ok ? JSON.stringify(alloc, null, 2) : '';
    $('outputNote').innerHTML = blocked ? 'A valid allocation, but the runtime does not play AI partners yet (D8), so it cannot be started. You can save or export it, or switch the partner seat back to a trainee.'
      : ok ? `A valid allocation (INTERFACES §3.1): one crew, ${typeInfo().seats.length} seats.`
      : cErrs.length ? cErrs.map(esc).join('<br>')
      : empty ? `<span class="muted">${empty} seat${empty > 1 ? 's' : ''} still to fill.</span>`
      : '<span class="muted">Fix the marked fields to build the allocation.</span>';
    $('handoffUrl').value = ok ? handoffUrl(alloc) : '';
    $('status').textContent = st.status;
    return ok ? alloc : null;
  }

  function apply(next) { Object.assign(st, { platform: next.platform, crew: next.crew, agents: next.agents, partners: next.partners || emptyCrew(next.platform.type).partners, opts: next.opts }); }
  const defaultAgentFor = id => (F.defaultAgent || {})[id] || ((F.agentProfiles || [])[0] || {}).path || '';

  // "Suggest demo crew": the weakest trainee per seat on the seat's focus competencies (suggestCrew).
  function suggest() {
    const prefer = st.weakAt || F.demoCompetency || null;
    const r = suggestCrew(st.profiles, st.summaries, st.platform.type, typeInfo().seatFocus || {}, prefer);
    if (!r) { st.status = 'No suitable crew: fewer trainees than seats.'; return render(); }
    const next = emptyCrew(st.platform.type);
    for (const [seat, id] of Object.entries(r.crew)) { next.crew[seat] = id; next.agents[seat] = defaultAgentFor(id); }
    Object.assign(st, { crew: next.crew, agents: next.agents, partners: next.partners });   // a suggested crew is all trainees
    st.inspect = r.picks[r.picks.length - 1].id;
    st.active = { seat: seatsOf(st.platform.type)[0] };
    st.status = 'Suggested: ' + r.picks.map(p => `${nameById(p.id)} in ${seatLabel(p.seat)}` + (p.k ? ` (${LONG[p.k]} ${p.mean.toFixed(2)})` : '')).join(', ') + '.';
    render();
  }
  const selection = () => ({ platform: st.platform, crew: st.crew, agents: st.agents, partners: st.partners, opts: st.opts });

  function assign(id) {
    const { seat } = st.active;
    if (!(seat in st.crew)) return;
    // A partner seat takes the clicked trainee as the person it copies; a trainee seat seats them
    const next = roleOf(selection(), seat) === 'partner' ? setPartner(selection(), seat, id) : seatTrainee(selection(), seat, id, defaultAgentFor(id));
    apply(next);
    st.inspect = id;
    st.active = nextEmptySeat(selection(), st.active);
    st.status = '';
    render();
  }

  function changePlatform(type, model) {
    const m = model || (st.models.find(x => x.type === type) || {}).id;
    apply(withPlatform(selection(), { type, model: m }, st.scenarioIds, st.domainOf));
    if (!(st.active.seat in st.crew)) st.active = { seat: seatsOf(type)[0] };
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
    $('roster').addEventListener('mouseover', e => {   // point at a trainee to read their detail without seating them
      const tr = e.target.closest('tr[data-id]');
      if (tr && tr.dataset.id !== st.inspect && document.activeElement !== $('noteBox')) { st.inspect = tr.dataset.id; renderDetail(); }
    });
    $('detail').addEventListener('input', e => { if (e.target.id === 'noteBox') notes.set(e.target.dataset.id, e.target.value); });
    $('detail').addEventListener('change', e => { if (e.target.id === 'noteBox') renderRoster(); });   // refresh the note marker
    $('envelope').addEventListener('input', e => {
      const key = e.target.dataset.env;
      if (!key) return;
      const [k, f] = key.split(':');
      st.envelope[k][f] = e.target.value === '' ? NaN : Number(e.target.value);
      st.status = ''; render();
    });
    $('btnEnvReset').onclick = () => { st.envelope = clone(F.envelopeDefault); renderEnvelope(); render(); };
    $('btnSuggest').onclick = suggest;
    $('slots').addEventListener('click', e => {
      const clr = e.target.closest('[data-clear]');
      if (clr) {
        const s = clr.dataset.clear;
        st.crew[s] = null; st.agents[s] = ''; if (st.partners) delete st.partners[s];   // an emptied seat is a trainee seat again
        st.active = { seat: s };
        return render();
      }
      const dot = e.target.closest('.seatDot');   // a seat marker on the vehicle picks that seat
      if (dot) { st.active = { seat: dot.dataset.seat }; return render(); }
      const who = e.target.closest('[data-inspect]');
      if (who) st.inspect = who.dataset.inspect;
      const seat = e.target.closest('.seat');
      if (seat && !e.target.closest('select')) { st.active = { seat: seat.dataset.seat }; render(); }
    });
    $('slots').addEventListener('change', e => {
      const key = e.target.dataset.agent;
      if (key) { st.agents[key] = e.target.value; render(); }
      const role = e.target.dataset.role;   // who plays the seat: a trainee, or an AI partner copying one
      if (role) {
        apply(e.target.value === 'partner' ? setPartner(selection(), role, '') : clearPartner(selection(), role));
        st.active = { seat: role }; st.status = '';
        render();
      }
    });
    $('optType').addEventListener('change', e => changePlatform(e.target.value));
    $('optModel').addEventListener('change', e => changePlatform(st.platform.type, e.target.value));
    $('weakAt').onchange = e => { st.weakAt = e.target.value; render(); };
    $('showAll').onchange = e => { st.showAll = e.target.checked; render(); };
    for (const id of ['optScenario', 'optSeed', 'optMode', 'optDuration', 'optInterval'])
      $(id).addEventListener('input', () => { readOpts(); st.status = ''; render(); });
    $('btnReroll').onclick = () => {
      st.opts.seed = nextSeed(Number.isInteger(st.opts.seed) ? st.opts.seed : DEFAULTS.seed);
      writeOpts(); render();
    };
    $('btnSave').onclick = () => {
      const alloc = render(); if (!alloc) return;
      st.status = store.write(alloc) ? `Saved to this browser (${STORE_KEY}).` : 'Browser storage is blocked here. Use the link or Export JSON instead.';
      render();
    };
    $('btnStart').onclick = () => {   // the link always carries the allocation, so a blocked browser store cannot stop the run
      const alloc = render(); if (!alloc) return;
      store.write(alloc);
      location.href = handoffUrl(alloc);
    };
    $('btnExport').onclick = () => {
      const alloc = render(); if (!alloc) return;
      download(`${alloc.allocation_id}.json`, JSON.stringify(alloc, null, 2));
    };
    $('btnCopy').onclick = () => {
      const el = $('handoffUrl'); if (!el.value) return;
      el.select();
      const done = () => { st.status = 'Link copied.'; render(); };
      if (navigator.clipboard) navigator.clipboard.writeText(el.value).then(done, () => { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    $('btnReset').onclick = () => {
      st.platform = clone(DEFAULT_PLATFORM);
      Object.assign(st, emptyCrew(st.platform.type));
      st.active = { seat: seatsOf(st.platform.type)[0] };
      st.opts = Object.assign({}, DEFAULTS); st.status = ''; st.inspect = null;
      st.envelope = clone(F.envelopeDefault); renderEnvelope(); writeOpts(); render();
    };
  }

  async function boot() {
    const qs = new URLSearchParams(location.search);
    await U.loadScript(qs.get('config') || 'config.js');
    for (const src of (window.CGF_CONFIG && window.CGF_CONFIG.scenarios) || []) {
      try { await U.loadScript(src); } catch (err) { console.error(err); }
    }
    st.scenarioIds = Object.keys(CGF.scenarios);
    st.domainOf = domainOfIn(CGF.scenarios);

    const bad = [];
    st.profiles = (CGF.Assess ? CGF.Assess.profiles() : (F.profiles || [])).filter(p => { const e = C.validateProfile(p); if (e.length) bad.push(...e); return !e.length; });
    if (bad.length) console.error('roster fixture:', bad);
    st.profiles.forEach(p => { st.summaries[p.trainee_id] = summarise(p); });
    const envErrs = C.validateEnvelope(F.envelopeDefault);
    if (envErrs.length) throw new Error('default envelope fixture: ' + envErrs.join('; '));
    st.envelope = clone(F.envelopeDefault);   // editable on this page; the default is kept for "Reset envelope"

    $('optType').innerHTML = Object.entries(F.platformTypes || {}).map(([k, t]) => `<option value="${esc(k)}">${esc(t.label)}</option>`).join('');
    $('weakAt').innerHTML = '<option value="">All trainees</option>' +
      C.COMPETENCIES.map(k => `<option value="${k}">Focus area: ${LONG[k]} (mean below 0.50)</option>`).join('');

    Object.assign(st, emptyCrew(st.platform.type));
    st.active = { seat: seatsOf(st.platform.type)[0] };

    // Restore the last saved allocation, if it still fits this roster, catalog and scenarios
    const saved = selectionFrom(store.read(), { scenarios: st.scenarioIds, domainOf: st.domainOf });
    const fits = saved && st.models.some(m => m.id === saved.platform.model && m.type === saved.platform.type)
      && Object.values(saved.crew).every(id => st.summaries[id]);
    if (fits) {
      apply(saved); st.active = { seat: seatsOf(st.platform.type)[0] }; st.status = 'Restored the last saved allocation.';
      const savedEnv = (store.read() || {}).shared && store.read().shared.envelope;
      if (savedEnv && !C.validateEnvelope(savedEnv).length) st.envelope = clone(savedEnv);
    }
    renderEnvelope(); writeOpts(); wire(); render();
  }

  boot().catch(err => {
    console.error(err);
    $('status').textContent = 'Failed to start: ' + err.message;
  });
})();
