// Competency update (INTERFACES §5, §9.1, §10). Owner: JL (assess lane).
//
//   Assess.profile(trainee_id)             stored profile, else the seeded one, else an empty profile
//   Assess.profiles()                      every known profile: seeded, overridden by stored
//   Assess.update(record, reports?)        -> { trainee_id: Profile } after applying a session record
//   Assess.cohort()                        -> { trainee_id: { competency: mean } } for every known profile
//   Assess.means(profile)                  -> { competency: mean } for the competencies the profile holds
//   Assess.cohortSummary()                 -> per competency: how many are rated, the mean, how many are below 0.5 (J6)
//   Assess.partnerParams({trainee_id, session_ids?}) -> { rates, reaction_delay_s, basis } for an AI partner (J7)
//
// The evidence is the session record's events. Each event that names a competency and an outcome of success or
// fail adds 1 to alpha (success) or beta (fail) of that competency, for the trainee named on the event. The report is
// accepted so the order (report, then update, then History.attachAssessment) is fixed, but the numbers come from the
// events, so the update never depends on narrative text. A session is applied once per trainee: the pairs already
// applied are kept in localStorage under cgf.assessed, so calling update twice with one record changes nothing.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};
  const PROFILE_KEY = 'cgf.profile.', APPLIED_KEY = 'cgf.assessed';
  const PRIOR = { alpha: 1, beta: 1 };

  // localStorage, or an in-memory stand-in where storage is unavailable
  const memory = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return k in memory ? memory[k] : null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { memory[k] = v; } },
    keys() { try { return Object.keys(localStorage); } catch (e) { return Object.keys(memory); } }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const competencies = () => (CGF.contracts && CGF.contracts.COMPETENCIES) || [];
  const seeded = () => (window.CGF_FIXTURES || {}).profiles || [];

  function readJson(key) {
    const raw = store.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function profile(trainee_id) {
    const stored = readJson(PROFILE_KEY + trainee_id);
    if (stored && stored.trainee_id === trainee_id) return stored;
    const seed = seeded().find(p => p.trainee_id === trainee_id);
    if (seed) return clone(seed);
    return { trainee_id, sessions_completed: 0, competencies: {}, updated_at_session: null };
  }

  function profiles() {
    const ids = new Set(seeded().map(p => p.trainee_id));
    store.keys().filter(k => k.startsWith(PROFILE_KEY)).forEach(k => ids.add(k.slice(PROFILE_KEY.length)));
    return [...ids].sort().map(profile);
  }

  const mean = ab => Math.round(ab.alpha / (ab.alpha + ab.beta) * 100) / 100;
  function means(p) {
    const m = {};
    for (const [k, ab] of Object.entries(p.competencies || {})) m[k] = mean(ab);
    return m;
  }

  function applied() { const a = readJson(APPLIED_KEY); return Array.isArray(a) ? a : []; }

  function update(record, reports) {
    if (!record || !Array.isArray(record.crew) || !Array.isArray(record.events)) throw new Error('Assess.update: a session record is required');
    const known = competencies(), done = applied(), out = {};
    for (const member of record.crew) {
      const id = member.trainee_id, tag = record.session_id + '|' + id;
      if (done.includes(tag)) { out[id] = profile(id); continue; }
      const p = profile(id);
      for (const e of record.events) {
        if (e.trainee_id !== id || !e.competency || !known.includes(e.competency)) continue;
        if (e.outcome !== 'success' && e.outcome !== 'fail') continue;
        const ab = p.competencies[e.competency] || (p.competencies[e.competency] = clone(PRIOR));
        if (e.outcome === 'success') ab.alpha += 1; else ab.beta += 1;
      }
      p.sessions_completed += 1;
      p.updated_at_session = record.session_id;
      store.set(PROFILE_KEY + id, JSON.stringify(p));
      done.push(tag);
      out[id] = p;
      if (CGF.History && typeof CGF.History.attachAssessment === 'function') {
        try { CGF.History.attachAssessment(id, record.session_id, means(p)); }
        catch (e) { /* no history entry for this session (history store off): the profile is still updated */ }
      }
    }
    store.set(APPLIED_KEY, JSON.stringify(done));
    return out;
  }

  function cohort() {
    const m = {};
    profiles().forEach(p => { m[p.trainee_id] = means(p); });
    return m;
  }

  // ---- Cohort summary (J6): where the intake as a whole is developing, for improving the curriculum, never to rank
  // people. Per competency over every known profile, counting only profiles with enough evidence (alpha + beta >= 8):
  //   { trainees, competencies: { k: { rated, mean, below_half, share_below_half } } }   mean is null when nobody is rated
  const EVIDENCE_MIN = 8;
  const round2 = x => Math.round(x * 100) / 100;

  function cohortSummary() {
    const ps = profiles(), out = { trainees: ps.length, competencies: {} };
    for (const k of competencies()) {
      const rated = ps.map(p => (p.competencies || {})[k]).filter(ab => ab && ab.alpha + ab.beta >= EVIDENCE_MIN).map(ab => ab.alpha / (ab.alpha + ab.beta));
      const below = rated.filter(m => m < 0.5).length;
      out.competencies[k] = {
        rated: rated.length,
        mean: rated.length ? round2(rated.reduce((a, b) => a + b, 0) / rated.length) : null,
        below_half: below,
        share_below_half: rated.length ? round2(below / rated.length) : null
      };
    }
    return out;
  }

  // ---- AI partners (INTERFACES §3.2): the parameters of a crewmate who behaves as a trainee did in older runs.
  //   Assess.partnerParams({ trainee_id, session_ids? }) -> { rates, reaction_delay_s, basis }
  // `rates` maps the SUCCESS event type of each measured competency to the chance the partner takes it (hail_discipline
  // -> hail_acknowledged); the failure type is the rest. Per competency, in order of preference:
  //   history  at least MIN_HISTORY_EVENTS counted events in the chosen sessions (History.list): (success + 1) / (events + 2)
  //   profile  the profile mean, when the profile has enough evidence
  //   default  0.5
  // Computed by code from stored numbers only, no randomness and no LLM, so the same inputs give the same parameters.
  const MIN_HISTORY_EVENTS = 3, DEFAULT_RATE = 0.5, DEFAULT_REACTION_DELAY_S = 20;

  function successTypes() {   // competency -> its success event type, from the §4 event table
    const out = {}, table = (CGF.contracts && CGF.contracts.EVENT_TYPES) || {};
    for (const [type, [k, outcome]] of Object.entries(table)) if (k && outcome === 'success') out[k] = type;
    return out;
  }

  function partnerParams(derived_from) {
    if (!derived_from || typeof derived_from.trainee_id !== 'string' || !derived_from.trainee_id) throw new Error('Assess.partnerParams: derived_from.trainee_id is required');
    const id = derived_from.trainee_id, want = Array.isArray(derived_from.session_ids) ? derived_from.session_ids : null;
    const entries = (CGF.History && typeof CGF.History.list === 'function' ? CGF.History.list(id) : []).filter(e => !want || want.includes(e.session_id));
    const p = profile(id), rates = {}, by = {}, used = new Set();
    for (const [k, type] of Object.entries(successTypes())) {
      let s = 0, f = 0; const from = [];
      for (const e of entries) {
        const c = ((e.report && e.report.facts && e.report.facts.events_by_competency) || {})[k];
        if (c && (c.success || c.fail)) { s += c.success || 0; f += c.fail || 0; from.push(e.session_id); }
      }
      const ab = (p.competencies || {})[k];
      if (s + f >= MIN_HISTORY_EVENTS) { rates[type] = round2((s + 1) / (s + f + 2)); by[k] = 'history'; from.forEach(x => used.add(x)); }
      else if (ab && ab.alpha + ab.beta >= EVIDENCE_MIN) { rates[type] = mean(ab); by[k] = 'profile'; }
      else { rates[type] = DEFAULT_RATE; by[k] = 'default'; }
    }
    const kinds = Object.values(by);
    return {
      rates, reaction_delay_s: DEFAULT_REACTION_DELAY_S,   // not derived from history yet: no event records the delay
      basis: { source: kinds.includes('history') ? 'history' : kinds.includes('profile') ? 'profile' : 'default', sessions: used.size, by_competency: by }
    };
  }

  CGF.Assess = { PRIOR, EVIDENCE_MIN, MIN_HISTORY_EVENTS, DEFAULT_RATE, DEFAULT_REACTION_DELAY_S, profile, profiles, update, cohort, cohortSummary, means,
    partnerParams };
})();
