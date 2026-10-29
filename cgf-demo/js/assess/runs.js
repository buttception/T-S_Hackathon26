// Saved runs and the baseline comparison: the demo's proof that adaptation did something (PLAN §8).
//
//   Runs.save(record)               keep a session record (INTERFACES §9.1) in localStorage under cgf.runs, newest last
//   Runs.list(), Runs.find(id)      the saved records
//   Runs.baselineFor(record)        the most recent FIXED-mode run on the same scenario, seed, platform and crew, or null
//   Runs.compare(baseline, run)     -> facts and plain-language notes: per competency success rates, what the AI adjusted
//
// Every figure is computed here from the two records; the sentences are templates over those figures (no LLM, so
// invariant 5 holds). A fixed-mode run makes no adjustments (invariant 2), so it shows what the same crew does when
// nothing adapts. One pair of runs is an illustration, not proof: the notes say so.
// Owner: JL (assess lane). Needs contracts/contracts.js for the competency order.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};
  const KEY = 'cgf.runs', MAX_RUNS = 10;   // a record is tens of kilobytes, so only the latest ten are kept
  const MIN_EVENTS = 3;                    // events a competency needs in BOTH runs before a rate is compared

  const memory = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return k in memory ? memory[k] : null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { memory[k] = v; return false; } }
  };
  const round2 = x => Math.round(x * 100) / 100;
  const pct = r => Math.round(r * 100) + '%';

  function list() {
    try { const v = JSON.parse(store.get(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  const find = id => list().find(r => r.session_id === id) || null;

  function save(record) {
    if (!record || typeof record.session_id !== 'string' || !Array.isArray(record.events) || !Array.isArray(record.adjustments) || !Array.isArray(record.crew))
      throw new Error('Runs.save: a session record is required');
    const runs = list().filter(r => r.session_id !== record.session_id);   // saving the same session again replaces it
    runs.push(record);
    while (runs.length > MAX_RUNS) runs.shift();
    return store.set(KEY, JSON.stringify(runs));
  }

  // Two runs are comparable when only the mode differs: same scenario, seed, platform type and crew (seat and trainee)
  const crewKey = r => JSON.stringify((r.crew || []).map(m => [m.seat, m.trainee_id]));
  const sameConditions = (a, b) => a.scenario === b.scenario && a.seed === b.seed && a.platform === b.platform && crewKey(a) === crewKey(b);

  function baselineFor(record, runs) {
    if (!record || record.mode !== 'adaptive') return null;
    const pool = (runs || list()).filter(r => r.session_id !== record.session_id && r.mode === 'fixed' && sameConditions(r, record));
    return pool.length ? pool[pool.length - 1] : null;
  }

  function tally(record) {
    const by = {};
    for (const e of record.events) {
      if (!e.competency || (e.outcome !== 'success' && e.outcome !== 'fail')) continue;
      const c = by[e.competency] || (by[e.competency] = { success: 0, fail: 0 });
      c[e.outcome] += 1;
    }
    return by;
  }
  const cell = c => ({ success: c ? c.success : 0, fail: c ? c.fail : 0, rate: c && c.success + c.fail ? round2(c.success / (c.success + c.fail)) : null });
  const sizeOf = c => c.success + c.fail;
  const LABELS = k => (CGF.cohortView && CGF.cohortView.label ? CGF.cohortView.label(k) : String(k).replace(/_/g, ' '));

  function side(r) {
    return { session_id: r.session_id, mode: r.mode, outcome: r.outcome, duration_s: r.duration_s, seed: r.seed, scenario: r.scenario,
      platform: r.platform, crew: r.crew.map(m => ({ seat: m.seat, trainee_id: m.trainee_id })), events: r.events.length, adjustments: r.adjustments.length };
  }

  function compare(baseline, run) {
    if (!baseline || !run || !Array.isArray(baseline.events) || !Array.isArray(run.events)) throw new Error('Runs.compare: two session records are required');
    const tb = tally(baseline), tr = tally(run);
    const order = ((CGF.contracts && CGF.contracts.COMPETENCIES) || []).concat(Object.keys(tb), Object.keys(tr));
    const keys = order.filter((k, i) => order.indexOf(k) === i && (tb[k] || tr[k]));

    const targeted = {}, settings = {};
    for (const a of run.adjustments) {
      targeted[a.target_competency] = (targeted[a.target_competency] || 0) + 1;
      const s = settings[a.setting] || (settings[a.setting] = { setting: a.setting, changes: 0, first_old: a.old, last_new: a.new });
      s.changes += 1; s.last_new = a.new;
    }
    const by_competency = keys.map(k => {
      const b = cell(tb[k]), r = cell(tr[k]), enough = sizeOf(b) >= MIN_EVENTS && sizeOf(r) >= MIN_EVENTS;
      return { competency: k, baseline: b, run: r, enough, delta: enough && b.rate !== null && r.rate !== null ? round2(r.rate - b.rate) : null, adjustments_aimed: targeted[k] || 0 };
    });
    const moved = Object.values(settings).sort((a, b) => b.changes - a.changes || (a.setting < b.setting ? -1 : 1));

    const notes = [];
    for (const c of by_competency) {
      const name = LABELS(c.competency);
      if (!c.enough) { notes.push(`${name}: too few events to compare (baseline ${sizeOf(c.baseline)}, this run ${sizeOf(c.run)}; at least ${MIN_EVENTS} in each are needed).`); continue; }
      const pts = Math.round(c.delta * 100);
      notes.push(`${name}: ${pct(c.baseline.rate)} success in the fixed baseline, ${pct(c.run.rate)} in this run (${pts >= 0 ? '+' : ''}${pts} points)` +
        (c.adjustments_aimed ? `, with ${c.adjustments_aimed} adjustment${c.adjustments_aimed === 1 ? '' : 's'} aimed at it.` : '.'));
    }
    notes.push(`The AI made ${run.adjustments.length} adjustment${run.adjustments.length === 1 ? '' : 's'} in this run; the fixed baseline made ${baseline.adjustments.length}.`);
    if (moved.length) notes.push('Settings moved most: ' + moved.slice(0, 3).map(s => `${s.setting} from ${s.first_old} to ${s.last_new} (${s.changes} change${s.changes === 1 ? '' : 's'})`).join('; ') + '.');
    notes.push('Both runs use the same seed and crew, so a difference comes from the AI\'s adjustments and from how the scripted crew responded to them. One pair of runs is an illustration, not proof.');

    return { baseline: side(baseline), run: side(run), by_competency, adjustments: { count: run.adjustments.length, targeted, settings: moved }, notes };
  }

  CGF.Runs = { KEY, MAX_RUNS, MIN_EVENTS, list, find, save, sameConditions, baselineFor, compare };
})();
