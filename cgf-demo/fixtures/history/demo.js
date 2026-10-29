// Seeded history for the demo (INTERFACES §9.1). All synthetic.
// Each entry is a session record as the runtime will emit it (Devin, D5), plus the profile each crew member
// had at the start (for competency_means_start) and the means after JL's update (competency_means_end,
// null while the update has not run). History entries are built from these with Report.buildWith, so the
// seeded facts come from the same code as live ones. The newest two sessions are the G1 pair: same seed,
// trainee_a in pane A and trainee_b in pane B, each with a navigation crewmate.
(function () {
  'use strict';
  const F = window.CGF_FIXTURES = window.CGF_FIXTURES || {};
  const KEYS = ['hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'piracy_response'];
  const TYPES = {
    hail_discipline: ['hail_acknowledged', 'hail_ignored'], collision_avoidance: ['safe_passage', 'close_quarters'],
    territorial_awareness: ['left_territorial', 'territorial_incursion'], weapons_discipline: ['fc_restraint', 'fc_radar_lock'],
    piracy_response: ['pirate_speed_response', 'pirate_slow_response']
  };

  // Profile rows as [alpha, beta] per competency, in KEYS order
  const prof = (id, rows) => {
    const competencies = {};
    rows.forEach((ab, i) => { competencies[KEYS[i]] = { alpha: ab[0], beta: ab[1] }; });
    return { trainee_id: id, sessions_completed: 0, competencies, updated_at_session: null };
  };
  const means = rows => {
    const m = {};
    rows.forEach((ab, i) => { m[KEYS[i]] = Math.round(ab[0] / (ab[0] + ab[1]) * 100) / 100; });
    return m;
  };

  // A session: crew is [[seat, trainee_id], ...]; plays is [trainee_id, competency, pattern, firstT, stepT],
  // where pattern is a string of S (success) and F (fail). adjustments is [t, setting, old, new, direction, target].
  function session(id, o) {
    const events = [];
    for (const [who, comp, pattern, t0, dt] of o.plays) {
      const seat = o.crew.find(c => c[1] === who)[0];
      [...pattern].forEach((ch, i) => events.push({ t: t0 + i * dt, session_id: id, trainee_id: who, seat,
        type: TYPES[comp][ch === 'S' ? 0 : 1], competency: comp, outcome: ch === 'S' ? 'success' : 'fail', unit_id: 'ship_' + (1 + i % 3), detail: {} }));
    }
    for (const [t, who, unit] of o.peaks || [])
      events.push({ t, session_id: id, trainee_id: who, seat: o.crew.find(c => c[1] === who)[0], type: 'tension_peak', competency: null, outcome: null, unit_id: unit, detail: {} });
    events.sort((a, b) => a.t - b.t).forEach((e, i) => { e.event_id = 'e_' + String(i + 1).padStart(6, '0'); });
    const adjustments = (o.adjust || []).map(([t, setting, oldV, newV, dir, target], i) => ({
      adjustment_id: 'a_' + String(i + 1).padStart(4, '0'), t, session_id: id, force: 'hostile-state', setting,
      old: oldV, new: newV, requested: newV, clamped: false, target_competency: target, pressure_direction: dir,
      source: 'engine', policy: 'rules_v1',
      evidence_event_ids: events.filter(e => e.competency === target && e.t <= t).slice(-2).map(e => e.event_id), explanation: null
    }));
    return { session_id: id, pane: o.pane, scenario: o.scenario || 'strait-transit', seed: o.seed, mode: o.mode,
      platform: 'warship', crew: o.crew.map(([seat, trainee_id]) => ({ seat, trainee_id })), outcome: o.outcome,
      duration_s: o.duration, events, adjustments };
  }

  // Profile snapshots for trainee_a and trainee_b at the start of each seeded session (the last one is
  // the current roster profile in fixtures/profiles/roster.js)
  const A = [
    [[12, 4], [11, 5], [10, 4], [13, 3], [9, 5]],
    [[13, 5], [12, 5], [12, 4], [15, 3], [10, 5]],
    [[15, 4], [14, 5], [13, 4], [16, 3], [11, 5]],
    [[16, 4], [15, 5], [14, 4], [17, 3], [12, 5]]
  ];
  const B = [
    [[3, 10], [14, 5], [8, 7], [10, 4], [6, 5]],
    [[3, 12], [15, 6], [9, 8], [11, 5], [7, 5]],
    [[4, 13], [17, 6], [10, 9], [12, 5], [8, 6]],
    [[5, 14], [18, 6], [11, 9], [13, 5], [9, 6]]
  ];
  const C08 = [[11, 6], [10, 7], [9, 8], [12, 5], [10, 6]];
  const C11 = [[13, 6], [12, 7], [5, 13], [6, 12], [11, 6]];

  const past = [
    ['s_20261021_01', 's_20261021_02', 'fixed', 11, 'success', 'fail'],
    ['s_20261024_01', 's_20261024_02', 'adaptive', 17, 'success', 'success'],
    ['s_20261027_01', 's_20261027_02', 'adaptive', 23, 'success', 'success']
  ];
  const plays = {
    a: [['SSFS', 'SSS', 'SS', 'S'], ['SSSF', 'SSS', 'SFS', 'SS'], ['SSSS', 'SSF', 'SS', 'SS']],
    b: [['FFSF', 'SSS', 'SF', 'S'], ['FSFF', 'SS', 'SS', 'SS'], ['FSFS', 'SSS', 'S', 'SF']]
  };

  const sessions = [];
  past.forEach(([idA, idB, mode, seed, outA, outB], i) => {
    const adjust = mode === 'fixed' ? [] : [[300, 'weight.ignoredWarning', 1.0, 1.25, 'up', 'hail_discipline'], [600, 'aggression', 0.4, 0.5, 'up', 'hail_discipline']];
    const [ha, ca, ta, wa] = plays.a[i], [hb, cb, tb, wb] = plays.b[i];
    sessions.push({
      record: session(idA, { pane: 'A', seed, mode, outcome: outA, duration: 900, crew: [['weapons', 'trainee_a']], adjust,
        plays: [['trainee_a', 'hail_discipline', ha, 120, 150], ['trainee_a', 'collision_avoidance', ca, 200, 200],
          ['trainee_a', 'territorial_awareness', ta, 350, 200], ['trainee_a', 'weapons_discipline', wa, 500, 150]] }),
      profile_start: { trainee_a: prof('trainee_a', A[i]) }, means_end: { trainee_a: means(A[i + 1]) }
    });
    sessions.push({
      record: session(idB, { pane: 'B', seed, mode, outcome: outB, duration: outB === 'fail' ? 640 : 900, crew: [['weapons', 'trainee_b']], adjust,
        plays: [['trainee_b', 'hail_discipline', hb, 120, 140], ['trainee_b', 'collision_avoidance', cb, 200, 200],
          ['trainee_b', 'territorial_awareness', tb, 350, 200], ['trainee_b', 'weapons_discipline', wb, 500, 120]],
        peaks: outB === 'fail' ? [[600, 'trainee_b', 'ship_2']] : [] }),
      profile_start: { trainee_b: prof('trainee_b', B[i]) }, means_end: { trainee_b: means(B[i + 1]) }
    });
  });

  // The latest G1 pair: adaptive, seed 42. B's CGFs press hails early; B starts acknowledging mid-run and
  // the pressure eases. JL's competency update has not run yet, so means_end is null.
  sessions.push({
    record: session('s_20261030_01', { pane: 'A', seed: 42, mode: 'adaptive', outcome: 'success', duration: 920,
      crew: [['weapons', 'trainee_a'], ['navigation', 'trainee_c08']],
      plays: [['trainee_a', 'hail_discipline', 'SSSS', 90, 160], ['trainee_a', 'weapons_discipline', 'SSS', 300, 180],
        ['trainee_c08', 'collision_avoidance', 'SFSSF', 150, 150], ['trainee_c08', 'territorial_awareness', 'SS', 420, 200]],
      adjust: [[240, 'aggression', 0.4, 0.5, 'up', 'collision_avoidance'], [480, 'weight.cpa', 1.0, 1.25, 'up', 'collision_avoidance'],
        [720, 'weight.cpa', 1.25, 1.1, 'down', 'collision_avoidance']] }),
    profile_start: { trainee_a: prof('trainee_a', A[3]), trainee_c08: prof('trainee_c08', C08) }, means_end: {}
  });
  sessions.push({
    record: session('s_20261030_02', { pane: 'B', seed: 42, mode: 'adaptive', outcome: 'success', duration: 920,
      crew: [['weapons', 'trainee_b'], ['navigation', 'trainee_c11']],
      plays: [['trainee_b', 'hail_discipline', 'FFFSFFSFSSF', 60, 75], ['trainee_b', 'weapons_discipline', 'SS', 500, 150],
        ['trainee_c11', 'collision_avoidance', 'SSS', 200, 200], ['trainee_c11', 'territorial_awareness', 'FSF', 300, 180]],
      peaks: [[250, 'trainee_b', 'ship_1'], [430, 'trainee_b', 'ship_2']],
      adjust: [[120, 'weight.ignoredWarning', 1.0, 1.25, 'up', 'hail_discipline'], [200, 'aggression', 0.4, 0.5, 'up', 'hail_discipline'],
        [280, 'weight.ignoredWarning', 1.25, 1.1, 'down', 'hail_discipline'], [360, 'aggression', 0.5, 0.45, 'down', 'hail_discipline'],
        [440, 'weight.ignoredWarning', 1.1, 1.0, 'down', 'hail_discipline'], [600, 'aggression', 0.45, 0.5, 'up', 'hail_discipline'],
        [680, 'weight.ignoredWarning', 1.0, 1.25, 'up', 'hail_discipline'], [740, 'reaction_delay_s', 8, 6, 'up', 'hail_discipline'],
        [760, 'weight.territorial', 1.0, 1.2, 'up', 'territorial_awareness']] }),
    profile_start: { trainee_b: prof('trainee_b', B[3]), trainee_c11: prof('trainee_c11', C11) }, means_end: {}
  });

  F.history = { sessions };
})();
