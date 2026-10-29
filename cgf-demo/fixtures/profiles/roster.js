// Seeded trainee profiles (docs/INTERFACES.md §5): two demo trainees and a cohort of 20. All synthetic.
// Competency order in the rows below: hail, collision, territorial, weapons, speed, as [alpha, beta].
// The four newer competencies (threat evaluation, contact detection, picture reporting, escalation control) are not
// seeded: no event measures them yet, so they fall back to the prior (alpha = 1, beta = 1), shown as "no evidence".
// null leaves a competency out of the profile for the same reason.
(function () {
  'use strict';
  const F = window.CGF_FIXTURES = window.CGF_FIXTURES || {};
  const KEYS = ['hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'speed_management'];

  function p(id, sessions, rows) {
    const competencies = {};
    rows.forEach((ab, i) => { if (ab) competencies[KEYS[i]] = { alpha: ab[0], beta: ab[1] }; });
    return { trainee_id: id, sessions_completed: sessions, competencies, updated_at_session: sessions ? 's_seed' : null };
  }

  F.profiles = [
    // Demo pair for G1: same experience level, B is weak at hail discipline
    p('trainee_a', 6, [[16, 4], [15, 5], [14, 4], [17, 3], [12, 5]]),
    p('trainee_b', 6, [[5, 14], [18, 6], [11, 9], [13, 5], [9, 6]]),
    // Cohort
    p('trainee_c01', 5, [[12, 6], [6, 12], [10, 7], [14, 4], [8, 6]]),
    p('trainee_c02', 4, [[9, 7], [11, 5], [4, 11], [10, 4], [7, 5]]),
    p('trainee_c03', 7, [[15, 5], [13, 6], [12, 6], [5, 13], [10, 6]]),
    p('trainee_c04', 3, [[6, 6], [8, 4], [7, 5], [9, 3], [3, 8]]),
    p('trainee_c05', 8, [[18, 5], [17, 6], [16, 5], [19, 4], [14, 6]]),
    p('trainee_c06', 2, [[3, 3], [4, 2], [2, 3], [4, 1], null]),
    p('trainee_c07', 6, [[6, 12], [7, 11], [12, 6], [13, 5], [9, 7]]),
    p('trainee_c08', 5, [[11, 6], [10, 7], [9, 8], [12, 5], [10, 6]]),
    p('trainee_c09', 4, [[10, 5], [5, 10], [6, 9], [11, 4], [8, 5]]),
    p('trainee_c10', 1, [[2, 1], [1, 2], [2, 2], null, null]),
    p('trainee_c11', 6, [[13, 6], [12, 7], [5, 13], [6, 12], [11, 6]]),
    p('trainee_c12', 7, [[7, 13], [14, 6], [13, 7], [15, 4], [12, 7]]),
    p('trainee_c13', 3, [[7, 4], [6, 5], [8, 4], [7, 4], [4, 7]]),
    p('trainee_c14', 5, [[12, 5], [13, 5], [11, 6], [4, 12], [9, 6]]),
    p('trainee_c15', 9, [[20, 5], [19, 6], [18, 6], [21, 4], [6, 14]]),
    p('trainee_c16', 4, [[8, 7], [9, 6], [8, 6], [10, 5], [7, 6]]),
    p('trainee_c17', 6, [[11, 8], [4, 14], [12, 6], [13, 5], [10, 6]]),
    p('trainee_c18', 2, [[4, 3], [3, 4], [3, 3], [5, 2], [2, 3]]),
    p('trainee_c19', 7, [[14, 5], [15, 5], [6, 13], [16, 4], [13, 5]]),
    p('trainee_c20', 5, [[10, 7], [11, 6], [10, 6], [11, 5], [5, 11]])
  ];

  // Scripted trainee agents a slot can use (Sim task S3 builds these files; the paths are the contract).
  F.agentProfiles = [
    { path: 'trainees/strong.js', label: 'Strong (scripted)' },
    { path: 'trainees/weak_hail_discipline.js', label: 'Weak hail discipline (scripted)' }
  ];
  F.defaultAgent = { trainee_b: 'trainees/weak_hail_discipline.js' };
})();
