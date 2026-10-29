// Trainee allocation page (allocate.html): choose the player platform (fighter, warship or tank), put a trainee
// in every seat of two crews (crew A in pane A, crew B in pane B) and set the shared run options. It outputs one
// Allocation (docs/INTERFACES.md §3.1), which the run page expands into one scenario config per pane.
// Starting the run is linked later; this page only produces a valid allocation.
//
// A seat is a trainee station. The seats come from the platform type, so the page adapts to the player role:
// fighter 2 (pilot, weapon), warship 3 (weapons, sensors, navigation), tank 2 (commander, driver).
//
// The pure functions (CGF.allocate.*) carry no DOM access so tests/allocate.html can check them.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util, C = CGF.contracts;

  const STORE_KEY = 'cgf.allocation';         // localStorage: one config per crew
  const SLOTS = ['A', 'B'];                    // the crews, one per pane
  const DEFAULTS = { scenario: 'strait-transit', seed: 1234, mode: 'adaptive', duration_s: 1200, eval_interval_s: 30 };
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
    const parts = [weak.length ? `Weak: ${weak.map(fmt).join(', ')}.` : enough.length ? 'No clear weakness.' : 'Nothing measured yet.'];
    if (strong.length) parts.push(`Strong: ${strong.map(fmt).join(', ')}.`);
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

  // Compare crew A with crew B seat by seat. Per seat it reports the biggest gap between the two trainees on the
  // competencies that seat exercises, and it warns when the comparison would be unfair or show nothing.
  function compareCrews(sel, summaries, sessionsOf, seatFocus) {
    const seats = [], warnings = [];
    for (const seat of seatsOf(sel.platform.type)) {
      const a = sel.crews.A[seat], b = sel.crews.B[seat];
      if (!a || !b) continue;
      const gaps = ((seatFocus && seatFocus[seat]) || []).filter(k => summaries[a][k].enough && summaries[b][k].enough)
        .map(k => ({ k, a: summaries[a][k].mean, b: summaries[b][k].mean, gap: summaries[a][k].mean - summaries[b][k].mean }))
        .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap));
      seats.push({ seat, a, b, top: gaps[0] || null });
    }
    const ids = c => Object.values(sel.crews[c]).filter(Boolean);
    const avg = c => ids(c).length ? ids(c).reduce((t, id) => t + sessionsOf(id), 0) / ids(c).length : null;
    const ea = avg('A'), eb = avg('B');
    if (ea !== null && eb !== null && Math.abs(ea - eb) >= 3)
      warnings.push(`Crew A averages ${ea.toFixed(1)} sessions and crew B ${eb.toFixed(1)}, so the comparison favours the more experienced crew.`);
    if (seats.length && seats.every(s => !s.top)) warnings.push('No seat has a measured competency for both trainees yet, so there is nothing to compare.');
    else if (seats.length && !seats.some(s => s.top && Math.abs(s.top.gap) >= 0.2))
      warnings.push('No seat differs by 0.20 or more on its measured competencies, so the side-by-side may not show a divergence.');
    return { seats, warnings, experience: { A: ea, B: eb } };
  }

  // Fill both crews. One seat gets the sharpest contrast: the strongest and weakest trainee on `prefer` (or, when that
  // competency is in no seat of this platform, on any seat competency), at most 2 sessions apart, strong one in crew A.
  // Every other seat gets the two remaining trainees closest in level and experience. Deterministic. Null if no pair.
  function suggestCrews(profiles, summaries, type, seatFocus, prefer) {
    const seats = seatsOf(type), ids = profiles.map(p => p.trainee_id), sess = {};
    profiles.forEach(p => { sess[p.trainee_id] = p.sessions_completed; });
    const wanted = prefer && seats.some(s => (seatFocus[s] || []).includes(prefer)) ? prefer : null;
    let best = null;
    for (const seat of seats) for (const k of (seatFocus[seat] || [])) {
      if (wanted && k !== wanted) continue;
      for (const hi of ids) for (const lo of ids) {
        if (hi === lo || Math.abs(sess[hi] - sess[lo]) > 2) continue;
        const h = summaries[hi][k], l = summaries[lo][k];
        if (!h.enough || !l.enough) continue;
        const gap = h.mean - l.mean;
        if (gap > 0 && (!best || gap > best.gap + 1e-12)) best = { seat, k, hi, lo, gap };
      }
    }
    if (!best) return null;
    const crews = { A: {}, B: {} }, used = new Set([best.hi, best.lo]);
    crews.A[best.seat] = best.hi; crews.B[best.seat] = best.lo;
    const level = (id, seat) => {
      const m = ((seatFocus[seat]) || []).map(k => summaries[id][k]).filter(s => s.enough).map(s => s.mean);
      return m.length ? m.reduce((x, y) => x + y, 0) / m.length : 0.5;
    };
    const hasEvidence = (id, seat) => ((seatFocus[seat]) || []).some(k => summaries[id][k].enough);
    for (const seat of seats) {
      if (seat === best.seat) continue;
      const pool = ids.filter(id => !used.has(id));
      let pick = null;
      for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
        // Prefer trainees with enough evidence on the seat's competencies, then a similar level, then similar experience
        const cost = Math.abs(level(pool[i], seat) - level(pool[j], seat)) + 0.02 * Math.abs(sess[pool[i]] - sess[pool[j]]) +
          (hasEvidence(pool[i], seat) ? 0 : 1) + (hasEvidence(pool[j], seat) ? 0 : 1);
        if (!pick || cost < pick.cost - 1e-12) pick = { a: pool[i], b: pool[j], cost };
      }
      if (!pick) return null;
      crews.A[seat] = pick.a; crews.B[seat] = pick.b; used.add(pick.a); used.add(pick.b);
    }
    return { crews, contrast: best };
  }

  // Next seed from the current one (31-bit LCG): repeatable, no Math.random
  const nextSeed = s => (Math.imul(s >>> 0, 1103515245) + 12345) & 0x7fffffff;

  // A scenario's domain as the engine reads it: scenarios without a domain are sea scenarios
  const domainOfIn = scenarios => id => (scenarios && scenarios[id] && scenarios[id].domain) || 'sea';

  function defaultScenarioFor(type, scenarioIds, domainOf) {
    const want = C.DOMAIN_BY_TYPE[type];
    return scenarioIds.find(id => domainOf(id) === want) || null;
  }

  function emptyCrews(type) {
    const crews = {}, agents = {};
    for (const s of SLOTS) { crews[s] = {}; agents[s] = {}; seatsOf(type).forEach(seat => { crews[s][seat] = null; agents[s][seat] = ''; }); }
    return { crews, agents };
  }

  // Change the platform. Within a type (another model) the crews stay. Across types the seats differ, so only
  // seat ids that exist in both are carried over; the scenario follows the type's domain.
  function withPlatform(sel, platform, scenarioIds, domainOf) {
    const next = clone(sel), fresh = emptyCrews(platform.type);
    for (const s of SLOTS) for (const seat of seatsOf(platform.type)) {
      if (sel.crews[s] && seat in sel.crews[s]) { fresh.crews[s][seat] = sel.crews[s][seat]; fresh.agents[s][seat] = sel.agents[s][seat] || ''; }
    }
    next.platform = { type: platform.type, model: platform.model };
    next.crews = fresh.crews; next.agents = fresh.agents;
    if (domainOf(next.opts.scenario) !== C.DOMAIN_BY_TYPE[platform.type]) {
      const d = defaultScenarioFor(platform.type, scenarioIds, domainOf);
      if (d) next.opts.scenario = d;
    }
    return next;
  }

  // Put a trainee in a seat. A trainee already seated elsewhere is moved, never duplicated.
  function seatTrainee(sel, crew, seat, id, defaultAgent) {
    const next = clone(sel);
    for (const s of SLOTS) for (const st of Object.keys(next.crews[s])) if (next.crews[s][st] === id) { next.crews[s][st] = null; next.agents[s][st] = ''; }
    next.crews[crew][seat] = id;
    if (!next.agents[crew][seat]) next.agents[crew][seat] = defaultAgent || '';
    return next;
  }

  // Next empty seat after the given one (crew A first, then crew B), or the same seat when all are full
  function nextEmptySeat(sel, from) {
    const order = SLOTS.flatMap(c => seatsOf(sel.platform.type).map(s => ({ crew: c, seat: s })));
    const i = order.findIndex(o => o.crew === from.crew && o.seat === from.seat);
    for (let k = 1; k <= order.length; k++) {
      const o = order[(i + k) % order.length];
      if (!sel.crews[o.crew][o.seat]) return o;
    }
    return from;
  }

  // Field-level problems with a selection, as { field: message }. Empty object = ready.
  // Seat fields are `seat_<crew>_<seat>` and `agent_<crew>_<seat>`.
  function checkSelection(sel, ctx) {
    const e = {}, o = sel.opts, seats = seatsOf(sel.platform.type), seen = {};
    for (const s of SLOTS) for (const seat of seats) {
      const id = sel.crews[s][seat];
      if (!id) e[`seat_${s}_${seat}`] = `Pick a trainee for crew ${s}, ${seat}.`;
      else {
        if (seen[id]) e[`seat_${s}_${seat}`] = `${id} is already in crew ${seen[id]}.`;
        seen[id] = s;
        if (!sel.agents[s][seat]) e[`agent_${s}_${seat}`] = 'Pick a scripted agent.';
      }
    }
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

  // The §3.1 Allocation: the settings both panes share once, and one crew per pane (A, B). The run page derives the
  // §3 scenario config of each pane with CGF.contracts.expandAllocation.
  function buildAllocation(sel, envelope) {
    const o = sel.opts;
    return {
      allocation_id: `alloc_${o.seed}_${sel.platform.type}`,
      created_at_session: null,   // no completed session id exists yet; the Lead sets this when sessions are recorded
      shared: {
        scenario: o.scenario, seed: o.seed, mode: o.mode, duration_s: o.duration_s, eval_interval_s: o.eval_interval_s,
        envelope: clone(envelope), platform: { type: sel.platform.type, model: sel.platform.model }
      },
      slots: SLOTS.map(pane => ({
        pane,
        crew: seatsOf(sel.platform.type).map(seat => ({ seat, trainee_id: sel.crews[pane][seat], agent_profile: sel.agents[pane][seat] }))
      }))
    };
  }

  // Inverse of buildAllocation, for restoring a saved allocation. Returns null for anything that doesn't fit,
  // including allocations saved in the older one-trainee-per-pane format.
  function selectionFrom(allocation, opts) {
    try {
      if (C.validateAllocation(allocation, opts).length) return null;
      const sh = allocation.shared, sel = { platform: clone(sh.platform), crews: {}, agents: {},
        opts: { scenario: sh.scenario, seed: sh.seed, mode: sh.mode, duration_s: sh.duration_s, eval_interval_s: sh.eval_interval_s } };
      allocation.slots.forEach(slot => {
        sel.crews[slot.pane] = {}; sel.agents[slot.pane] = {};
        slot.crew.forEach(m => { sel.crews[slot.pane][m.seat] = m.trainee_id; sel.agents[slot.pane][m.seat] = m.agent_profile; });
      });
      return sel;
    } catch (e) { return null; }
  }

  const handoffUrl = allocation => 'host.html?alloc=' + encodeURIComponent(JSON.stringify(allocation));

  CGF.allocate = { STORE_KEY, SLOTS, DEFAULTS, DEFAULT_PLATFORM, LONG, mean, seatsOf, summarise, nameOf, describe,
    previewTarget, describePrediction, compareCrews, suggestCrews, nextSeed, domainOfIn,
    defaultScenarioFor, emptyCrews, withPlatform, seatTrainee, nextEmptySeat, checkSelection, buildAllocation,
    selectionFrom, handoffUrl };

  // ------------------------------------------------------------ page
  if (!document.getElementById('allocApp')) return;   // loaded by the test page: functions only

  const F = window.CGF_FIXTURES || {};
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const st = {
    profiles: [], summaries: {}, envelope: null, scenarioIds: [], domainOf: () => 'sea', models: F.platformModels || [],
    platform: clone(DEFAULT_PLATFORM), crews: {}, agents: {}, active: { crew: 'A', seat: 'weapons' },
    opts: Object.assign({}, DEFAULTS), sortKey: 'trainee_id', sortDir: 1, weakAt: '', status: '', inspect: null
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

  function barColor(m) { return m < 0.4 ? '#ff7b54' : m < 0.6 ? '#ffd166' : '#4dd17a'; }
  const activeFocus = () => (typeInfo().seatFocus || {})[st.active.seat] || [];
  const seatLabel = seat => { const m = modelInfo(); return (m && m.seats[seat] && m.seats[seat].label) || seat; };
  const seatOf = id => { for (const c of SLOTS) for (const s of seatsOf(st.platform.type)) if (st.crews[c][s] === id) return { crew: c, seat: s }; return null; };

  function compCell(s, focus) {
    const title = s.prior ? 'No data: prior alpha 1, beta 1'
      : `mean ${s.mean.toFixed(2)} · alpha ${s.alpha}, beta ${s.beta} · evidence ${s.n}${s.enough ? '' : ' (not enough, needs ' + C.EVIDENCE_MIN + ')'}`;
    const cls = s.prior ? 'bar prior' : s.enough ? 'bar' : 'bar thin';
    return `<td class="${focus ? 'focus' : 'dim'}" title="${esc(title)}"><div class="${cls}"><i style="width:${(s.mean * 100).toFixed(0)}%;background:${barColor(s.mean)}"></i></div>` +
      `<span class="val">${s.prior ? '—' : s.mean.toFixed(2)}</span></td>`;
  }

  function sortedRows() {
    let rows = st.profiles.slice();
    if (st.weakAt) rows = rows.filter(p => { const s = st.summaries[p.trainee_id][st.weakAt]; return s.enough && s.mean < 0.5; });
    const key = p => st.sortKey === 'trainee_id' ? nameOf(p).toLowerCase()
      : st.sortKey === 'sessions' ? p.sessions_completed : st.summaries[p.trainee_id][st.sortKey].mean;
    return rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * st.sortDir; });
  }

  function renderRoster() {
    const focus = activeFocus();
    const head = [['trainee_id', 'Trainee'], ['sessions', 'Sessions'], ...C.COMPETENCIES.map(k => [k, LABELS[k]])]
      .map(([k, l]) => `<th data-sort="${k}" class="${st.sortKey === k ? 'sorted' : ''} ${focus.includes(k) ? 'focus' : ''}">${l}${st.sortKey === k ? (st.sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const rows = sortedRows();
    const body = rows.map(p => {
      const sum = st.summaries[p.trainee_id], at = seatOf(p.trainee_id);
      return `<tr data-id="${esc(p.trainee_id)}" class="${at ? 'taken' : ''}">` +
        `<td class="id" title="${esc(p.trainee_id)}">${at ? `<span class="slotTag" title="Crew ${at.crew}, ${esc(seatLabel(at.seat))}">${at.crew}·${esc(at.seat)}</span>` : ''}` +
        `${esc(nameOf(p))}${notes.get(p.trainee_id) ? ' <span class="muted" title="You have a note on this trainee">✎</span>' : ''}</td>` +
        `<td class="num">${p.sessions_completed}</td>` + C.COMPETENCIES.map(k => compCell(sum[k], focus.includes(k))).join('') + '</tr>';
    }).join('');
    $('roster').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body ||
      `<tr><td colspan="${2 + C.COMPETENCIES.length}" class="muted">No trainee matches this filter.</td></tr>`}</tbody>`;
    $('rosterCount').textContent = `${rows.length} of ${st.profiles.length} trainees · highlighted columns matter for the ${esc(seatLabel(st.active.seat))} seat`;
  }

  // The selected trainee in full: every competency, a plain-language summary, and a private note.
  function renderDetail() {
    const el = $('detail'), p = st.inspect && profileOf(st.inspect);
    if (!p) {
      el.innerHTML = '<span class="muted small">Point at a trainee in the roster to see their competencies, strengths, weaknesses and your notes. Click to seat them.</span>';
      return;
    }
    const sum = st.summaries[p.trainee_id], d = describe(p), focus = activeFocus(), at = seatOf(p.trainee_id);
    const bars = C.COMPETENCIES.map(k => {
      const s = sum[k], cls = s.prior ? 'bar prior' : s.enough ? 'bar' : 'bar thin';
      return `<div class="small ${focus.includes(k) ? '' : 'dim'}"><span style="display:inline-block;width:130px">${esc(LONG[k])}</span>` +
        `<span class="${cls}"><i style="width:${(s.mean * 100).toFixed(0)}%;background:${barColor(s.mean)}"></i></span>` +
        `<span class="val">${s.prior ? '—' : s.mean.toFixed(2)}</span>` +
        `<span class="muted">${s.prior ? 'no evidence' : 'evidence ' + Math.round(s.n) + (s.enough ? '' : ' (thin)')}</span></div>`;
    }).join('');
    el.innerHTML = `<div class="row"><b>${esc(nameOf(p))}</b><span class="muted small">${esc(p.trainee_id)} · ${p.sessions_completed} session${p.sessions_completed === 1 ? '' : 's'}` +
      `${at ? ` · seated in crew ${esc(at.crew)}, ${esc(seatLabel(at.seat))}` : ''}</span></div>` +
      `<div class="small">${esc(d.text)}</div>${bars}` +
      `<label class="field"><span>Your notes</span><textarea id="noteBox" rows="2" data-id="${esc(p.trainee_id)}" placeholder="Private notes on this trainee">${esc(notes.get(p.trainee_id))}</textarea></label>`;
  }

  // A one-line comparison of the two crews, seat by seat, and any warning that the comparison would be unfair.
  function renderCompare() {
    const el = $('compare'), seats = seatsOf(st.platform.type);
    if (!seats.every(s => st.crews.A[s] && st.crews.B[s])) {
      el.innerHTML = '<span class="muted small">Fill every seat in both crews to compare them.</span>';
      return;
    }
    const cmp = compareCrews(selection(), st.summaries, id => profileOf(id).sessions_completed, typeInfo().seatFocus);
    const lines = cmp.seats.map(s => {
      const t = s.top;
      return `<div class="small"><b>${esc(seatLabel(s.seat))}</b>: ${esc(nameById(s.a))} vs ${esc(nameById(s.b))} · ` + (t
        ? `biggest gap ${esc(LONG[t.k])} ${t.a.toFixed(2)} vs ${t.b.toFixed(2)}` : '<span class="muted">no measured competency in common</span>') + '</div>';
    }).join('');
    el.innerHTML = '<b class="small">Crew A vs crew B</b>' + lines +
      cmp.warnings.map(w => `<div class="small muted">⚠ ${esc(w)}</div>`).join('');
  }

  function renderCrews(errs) {
    const agents = F.agentProfiles || [], model = modelInfo(), info = typeInfo(), V = CGF.vehicles;
    $('slots').innerHTML = SLOTS.map(c => {
      const people = {};
      const cards = seatsOf(st.platform.type).map((seat, i) => {
        const id = st.crews[c][seat], sum = id && st.summaries[id], isActive = st.active.crew === c && st.active.seat === seat;
        const focus = (info.seatFocus || {})[seat] || [], seatDef = model && model.seats[seat];
        people[seat] = { name: id ? nameById(id) : '', active: isActive };
        const mini = sum ? focus.map(k => `<span title="${LONG[k]}: ${sum[k].prior ? 'no data' : sum[k].mean.toFixed(2)}">` +
          `<b style="background:${sum[k].prior ? 'var(--line)' : barColor(sum[k].mean)}"></b>${LABELS[k]} ${sum[k].prior ? '—' : sum[k].mean.toFixed(2)}</span>`).join('') : '';
        const e = errs[`agent_${c}_${seat}`] || (id && errs[`seat_${c}_${seat}`]);
        const pred = id ? describePrediction(predictFor(id, seat)) : '';
        return `<div class="seat ${isActive ? 'active' : ''}" data-crew="${c}" data-seat="${seat}">` +
          `<div class="seatHead"><b>${i + 1} · ${esc(seatDef ? seatDef.label : seat)}</b><span class="grow"></span>` +
          (id ? `<button data-clear="${c}:${seat}" title="Clear this seat">Clear</button>` : '') + '</div>' +
          (seatDef ? `<div class="seatText">${esc(seatDef.text)}</div>` : '') +
          `<div class="seatWho">${id ? `<b data-inspect="${esc(id)}">${esc(nameById(id))}</b> <span class="muted small">${esc(id)}</span>` : `<span class="muted">${isActive ? 'Click a trainee in the roster' : 'Click here, then a trainee'}</span>`}</div>` +
          (sum ? `<div class="mini">${mini}</div><div class="small muted">${esc(describe(profileOf(id), focus).text)}</div>` : '') +
          (pred ? `<div class="small">${esc(pred)}</div>` : '') +
          `<label class="field"><span>Scripted agent</span><select data-agent="${c}:${seat}"><option value="">Choose…</option>` +
          agents.map(a => `<option value="${esc(a.path)}" ${st.agents[c][seat] === a.path ? 'selected' : ''}>${esc(a.label)}</option>`).join('') +
          '</select></label>' + (e ? `<div class="err">${esc(e)}</div>` : '') + '</div>';
      }).join('');
      const sims = (V.TYPES[st.platform.type] || { simulated: [] }).simulated.map(s => s[2]);
      return `<div class="crew" data-crew="${c}"><div class="crewHead">Crew ${c} <span class="muted small">pane ${c} · ${esc((modelInfo() || {}).name || '')}</span></div>` +
        `${V.svg(st.platform.type, people, c)}` +
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
    $('platformInfo').innerHTML = m ? `<div><b>${esc(m.name)}</b> · ${esc(m.operator)}</div>` +
      `<div class="muted small">Real crew: ${esc(m.realCrew)}. This exercise seats ${t.seats.length} trainees per crew, in the ${esc(C.DOMAIN_BY_TYPE[st.platform.type])} domain.</div>` +
      (m.note ? `<div class="muted small">${esc(m.note)}</div>` : '') +
      `<div class="small"><a href="${esc(m.source)}" target="_blank" rel="noopener">Source</a></div>` : '';
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

  function render() {
    const errs = checkSelection(st, ctx()), ready = !Object.keys(errs).length;
    renderPlatform(errs); renderScenarios(errs); renderRoster(); renderCrews(errs); renderCompare();
    if (document.activeElement !== $('noteBox')) renderDetail();   // never rebuild the note box while it is being typed in
    const envErrs = C.validateEnvelope(st.envelope);
    $('err_envelope').innerHTML = envErrs.map(esc).join('<br>');
    const empty = Object.keys(errs).filter(k => k.startsWith('seat_') && /^Pick/.test(errs[k])).length;
    let alloc = null, cErrs = [];
    if (ready) {
      alloc = buildAllocation(st, st.envelope);
      cErrs = C.validateAllocation(alloc, { scenarios: st.scenarioIds, domainOf: st.domainOf });
    }
    const ok = ready && !cErrs.length;
    $('btnStart').disabled = $('btnSave').disabled = $('btnExport').disabled = !ok;
    $('output').textContent = ok ? JSON.stringify(alloc, null, 2) : '';
    $('outputNote').innerHTML = ok ? `A valid allocation (INTERFACES §3.1): two panes, ${typeInfo().seats.length} seats each.`
      : cErrs.length ? cErrs.map(esc).join('<br>')
      : empty ? `<span class="muted">${empty} seat${empty > 1 ? 's' : ''} still to fill.</span>`
      : '<span class="muted">Fix the marked fields to build the allocation.</span>';
    $('handoffUrl').value = ok ? handoffUrl(alloc) : '';
    $('status').textContent = st.status;
    return ok ? alloc : null;
  }

  function apply(next) { Object.assign(st, { platform: next.platform, crews: next.crews, agents: next.agents, opts: next.opts }); }
  const defaultAgentFor = id => (F.defaultAgent || {})[id] || ((F.agentProfiles || [])[0] || {}).path || '';

  // "Suggest demo pair": the sharpest contrast on one competency in one seat, the other seats matched (suggestCrews).
  function suggest() {
    const prefer = st.weakAt || F.demoCompetency || null;
    const r = suggestCrews(st.profiles, st.summaries, st.platform.type, typeInfo().seatFocus || {}, prefer);
    if (!r) { st.status = 'No suitable pair: no two trainees within 2 sessions of each other differ on a measured competency of this platform.'; return render(); }
    const next = emptyCrews(st.platform.type);
    for (const c of SLOTS) for (const [seat, id] of Object.entries(r.crews[c])) { next.crews[c][seat] = id; next.agents[c][seat] = defaultAgentFor(id); }
    Object.assign(st, { crews: next.crews, agents: next.agents });
    st.inspect = r.contrast.lo;
    st.active = { crew: 'A', seat: seatsOf(st.platform.type)[0] };
    st.status = `Suggested: ${nameById(r.contrast.hi)} (crew A) and ${nameById(r.contrast.lo)} (crew B) in the ${seatLabel(r.contrast.seat)} seat, ` +
      `${LONG[r.contrast.k]} ${r.contrast.gap.toFixed(2)} apart. The other seats are matched on level and experience.`;
    render();
  }
  const selection = () => ({ platform: st.platform, crews: st.crews, agents: st.agents, opts: st.opts });

  function assign(id) {
    const { crew, seat } = st.active;
    if (!(seat in st.crews[crew])) return;
    const next = seatTrainee(selection(), crew, seat, id, defaultAgentFor(id));
    apply(next);
    st.inspect = id;
    st.active = nextEmptySeat(selection(), st.active);
    st.status = '';
    render();
  }

  function changePlatform(type, model) {
    const m = model || (st.models.find(x => x.type === type) || {}).id;
    apply(withPlatform(selection(), { type, model: m }, st.scenarioIds, st.domainOf));
    if (!(st.active.seat in st.crews[st.active.crew])) st.active = { crew: 'A', seat: seatsOf(type)[0] };
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
        const [c, s] = clr.dataset.clear.split(':');
        st.crews[c][s] = null; st.agents[c][s] = ''; st.active = { crew: c, seat: s };
        return render();
      }
      const dot = e.target.closest('.seatDot');   // a seat marker on the vehicle picks that seat
      if (dot) { st.active = { crew: dot.closest('.crew').dataset.crew, seat: dot.dataset.seat }; return render(); }
      const who = e.target.closest('[data-inspect]');
      if (who) st.inspect = who.dataset.inspect;
      const seat = e.target.closest('.seat');
      if (seat && !e.target.closest('select')) { st.active = { crew: seat.dataset.crew, seat: seat.dataset.seat }; render(); }
    });
    $('slots').addEventListener('change', e => {
      const key = e.target.dataset.agent;
      if (key) { const [c, s] = key.split(':'); st.agents[c][s] = e.target.value; render(); }
    });
    $('optType').addEventListener('change', e => changePlatform(e.target.value));
    $('optModel').addEventListener('change', e => changePlatform(st.platform.type, e.target.value));
    $('btnSwap').onclick = () => {   // swap whole crews, seat agents included
      [st.crews.A, st.crews.B] = [st.crews.B, st.crews.A];
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
      Object.assign(st, emptyCrews(st.platform.type));
      st.active = { crew: 'A', seat: seatsOf(st.platform.type)[0] };
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
    st.profiles = (F.profiles || []).filter(p => { const e = C.validateProfile(p); if (e.length) bad.push(...e); return !e.length; });
    if (bad.length) console.error('roster fixture:', bad);
    st.profiles.forEach(p => { st.summaries[p.trainee_id] = summarise(p); });
    const envErrs = C.validateEnvelope(F.envelopeDefault);
    if (envErrs.length) throw new Error('default envelope fixture: ' + envErrs.join('; '));
    st.envelope = clone(F.envelopeDefault);   // editable on this page; the default is kept for "Reset envelope"

    $('optType').innerHTML = Object.entries(F.platformTypes || {}).map(([k, t]) => `<option value="${esc(k)}">${esc(t.label)}</option>`).join('');
    $('weakAt').innerHTML = '<option value="">All trainees</option>' +
      C.COMPETENCIES.map(k => `<option value="${k}">Weak at ${LABELS[k].toLowerCase()} (mean below 0.50)</option>`).join('');

    Object.assign(st, emptyCrews(st.platform.type));
    st.active = { crew: 'A', seat: seatsOf(st.platform.type)[0] };

    // Restore the last saved allocation, if it still fits this roster, catalog and scenarios
    const saved = selectionFrom(store.read(), { scenarios: st.scenarioIds, domainOf: st.domainOf });
    const fits = saved && st.models.some(m => m.id === saved.platform.model && m.type === saved.platform.type)
      && SLOTS.every(s => Object.values(saved.crews[s]).every(id => st.summaries[id]));
    if (fits) {
      apply(saved); st.active = { crew: 'A', seat: seatsOf(st.platform.type)[0] }; st.status = 'Restored the last saved allocation.';
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
