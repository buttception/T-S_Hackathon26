// Trainee history (INTERFACES §9.1): one entry per trainee per session, newest last, kept in
// localStorage under cgf.history.<trainee_id>. Seeded history for the demo trainees ships in
// fixtures/history/*.js as session records; their entries are built with Report.buildWith, so the
// seeded facts are computed by the same code as live ones.
//
//   History.append(entry)                              append; an existing session_id is never overwritten; a partner_ id is refused
//   History.attachAssessment(trainee_id, session_id, means)   JL's competency update fills competency_means_end
//   History.context(trainee_id, n) -> {weak[], strong[], sessions}   summary of the last n sessions
//   History.list(trainee_id), History.find(trainee_id, session_id), History.trainees(), History.record(session_id)
//
// Owner: Glenda (report lane). Needs js/report/report.js.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};
  const PREFIX = 'cgf.history.';
  const MIN_EVENTS = 2;               // events a competency needs before context calls it weak or strong
  const WEAK_BELOW = 0.5, STRONG_FROM = 0.7;

  // localStorage, or an in-memory stand-in where storage is unavailable
  const memory = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return k in memory ? memory[k] : null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { memory[k] = v; } },
    keys() { try { return Object.keys(localStorage); } catch (e) { return Object.keys(memory); } }
  };

  const seedData = () => ((window.CGF_FIXTURES || {}).history || { sessions: [] }).sessions || [];
  let seedCache = null;
  function seeded() {
    if (seedCache) return seedCache;
    seedCache = {};
    for (const s of seedData()) for (const c of CGF.Report.traineesOf(s.record)) {
      const report = CGF.Report.buildWith(s.record, c.trainee_id, (s.profile_start || {})[c.trainee_id] || null);
      const entry = CGF.Report.entryFor(s.record, report);
      entry.competency_means_end = (s.means_end || {})[c.trainee_id] || null;
      (seedCache[c.trainee_id] = seedCache[c.trainee_id] || []).push(entry);
    }
    return seedCache;
  }

  function stored(id) {
    try { const v = JSON.parse(store.get(PREFIX + id) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }

  function list(id) {
    const out = [], seen = new Set();
    for (const e of [...(seeded()[id] || []), ...stored(id)]) if (!seen.has(e.session_id)) { seen.add(e.session_id); out.push(e); }
    return out;
  }
  const find = (id, sid) => list(id).find(e => e.session_id === sid) || null;

  function append(entry) {
    const need = ['session_id', 'trainee_id', 'scenario', 'mode', 'outcome', 'report'];
    const missing = need.filter(k => entry == null || entry[k] == null);
    if (missing.length) throw new Error('history entry: missing ' + missing.join(', '));
    if (/^partner_/.test(String(entry.trainee_id))) throw new Error('history entry: ' + entry.trainee_id + ' is an AI partner; partners get no history');
    if (find(entry.trainee_id, entry.session_id)) return;             // append-only: never overwrite
    const arr = stored(entry.trainee_id);
    arr.push(entry);
    store.set(PREFIX + entry.trainee_id, JSON.stringify(arr));
  }

  function attachAssessment(id, sid, means) {
    const arr = stored(id), e = arr.find(x => x.session_id === sid);
    if (!e) throw new Error(`no stored history entry ${sid} for ${id}`);
    e.competency_means_end = means;
    store.set(PREFIX + id, JSON.stringify(arr));
  }

  // Weak and strong competencies over the last n sessions, from the counted events
  function context(id, n) {
    const recent = list(id).slice(-(n || 5)), tot = {};
    for (const e of recent) for (const [k, c] of Object.entries(e.report.facts.events_by_competency || {})) {
      const t = tot[k] = tot[k] || { success: 0, fail: 0 };
      t.success += c.success; t.fail += c.fail;
    }
    const rated = Object.entries(tot).filter(([, c]) => c.success + c.fail >= MIN_EVENTS)
      .map(([k, c]) => [k, c.success / (c.success + c.fail)]);
    return {
      weak: rated.filter(([, r]) => r < WEAK_BELOW).sort((a, b) => a[1] - b[1]).map(([k]) => k),
      strong: rated.filter(([, r]) => r >= STRONG_FROM).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      sessions: recent.length
    };
  }

  function trainees() {
    const ids = new Set(Object.keys(seeded()));
    for (const k of store.keys()) if (k.startsWith(PREFIX)) ids.add(k.slice(PREFIX.length));
    return [...ids].sort();
  }

  // Seeded session records, for the key-moments view of a seeded session
  const record = sid => (seedData().find(s => s.record.session_id === sid) || {}).record || null;

  CGF.History = { PREFIX, append, attachAssessment, context, list, find, trainees, record,
    _resetSeedCache: () => { seedCache = null; } };
})();
