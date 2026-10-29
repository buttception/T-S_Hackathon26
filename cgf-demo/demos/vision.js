// The 5-minute vision demo (PLAN §8 demo script). One adaptive session, hands off:
//   experience picks WHAT to exercise, current behaviour sets HOW HARD, the CGFs cooperate as a team, every
//   adjustment carries its reason and cause, the instructor steers in plain language, fixed mode is quiet, and the
//   run ends with a session record for the report.
// Captions are kept short and plain for a non-specialist audience; the panels carry the detail.
// The simulation runs fast through quiet stretches and slows down at each moment that matters (step "speed").
// Play: Demo dropdown -> "Vision: adaptive CGF trainer", or runtime.html?demo=vision (&loop=1 for an unattended stand).

(function () {
  const reasoning = a => { a.tab('reasoning'); };
  const navAdjustments = (a, cause) => a.adjustments().filter(x => x.seat === 'navigation' && x.target_competency === 'hail_discipline' && (!cause || x.cause === cause));
  // Latched: at speed, a steer can run its course (600 sim s) before the step's hold ends
  let steered = false;
  const steering = () => { const L = CGF.Adapt.current && CGF.Adapt.current.liveState(); return (steered = steered || !!(L && L.seats.some(s => s.steering))); };

  // Steering through the Reasoning tab's own box, so the audience sees the text, the parsed directive and Apply
  const typeSteer = text => {
    const el = document.getElementById('steerText');
    if (el) { el.value = text; document.getElementById('btnSteerParse').click(); }
  };
  // Apply appears once the parse has finished (the local LLM is tried first), so the step keeps trying
  const applySteer = () => { const b = document.getElementById('btnSteerApply'); if (b) b.click(); };
  const trainee = { trainee: 'trainee_b', agent: 'trainees/weak_hail_discipline.js', duration_s: 9000 };

  CGF.registerDemo({
    id: 'vision',
    name: 'Vision: adaptive CGF trainer (~5 min)',
    scenario: 'strait-transit',
    params: { timeScale: 60 },
    view: { zoom: 26 },
    steps: [
      // 1. The problem
      { caption: 'Today every trainee faces the same scripted enemy. Our trainer adjusts the enemy to each trainee.',
        do: a => { a.tab('trainee'); a.overview(); }, speed: 30, hold: 21 },

      // 2. Experience picks WHAT to exercise
      { caption: 'Meet Ben, the trainee steering this Singapore warship. His past sessions show he is weak at answering radio warnings.',
        do: a => { reasoning(a); a.startAdaptive(trainee); }, focus: 'own', zoom: 22, speed: 10, hold: 22 },
      { caption: 'So the enemy starts by testing exactly that. Each change is shown with its reason (tag: history).',
        until: a => navAdjustments(a, 'history').length >= 2, hold: 16, timeout: 40 },

      // 3. A miss, and the CGFs work together
      { caption: 'An enemy patrol boat radios a warning. Ben does not answer.',
        focus: 'R-21', zoom: 14, speed: 30,
        until: a => a.events('hail_ignored').length >= 1, hold: 18, timeout: 45 },
      { caption: 'The enemy works as a team: the other boats hear about it and join in.',
        do: a => a.focus('own', 22), speed: 15,
        until: a => a.teamActions() >= 2, hold: 21, timeout: 40 },

      // 4. Current behaviour sets HOW HARD
      { caption: 'Fast-forward: Ben starts answering the warnings…', speed: 480,
        until: a => navAdjustments(a).some(x => x.pressure_direction === 'down'), hold: 6, timeout: 60 },
      { caption: 'Ben is doing well now, so the enemy eases off (tag: live).',
        do: a => { reasoning(a); a.focus('own', 22); }, speed: 30, hold: 21 },

      // 5. Teamwork from the harness and from the crew's skill
      { caption: 'The instructor can switch the enemy to an elite force, which works together more closely.',
        do: a => { a.tab('instructor'); a.inject.setForceHarness('red', 'hostile-elite'); }, hold: 21 },
      { caption: 'The trainer also matches the enemy\'s teamwork to how skilled the crew is (tag: team).',
        do: reasoning, hold: 21 },

      // 6. Plain-language steering
      { caption: 'Instructors can also give instructions in plain English.',
        do: () => { steered = false; typeSteer("test trainee B's collision avoidance hard for 10 minutes"); }, speed: 15, hold: 22 },
      { caption: 'Applied: Ben\'s training now focuses on avoiding collisions for the next 10 minutes.',
        until: () => { applySteer(); return steering(); }, hold: 21, timeout: 40 },

      // 7. End of training: the session record feeds the report and the trainee's history
      { caption: 'At the end, the session is saved: what happened, what changed and why. This feeds Ben\'s report and his next session.',
        do: a => { CGF.sim.mode = 'exercise'; CGF.endRun('success', 'Demo: training session ended.'); reasoning(a); }, allowOutcome: true, hold: 22 },

      // 8. Fixed assessment
      { caption: 'For exams, fixed mode keeps the enemy the same for everyone.',
        do: a => { a.startAdaptive(Object.assign({ mode: 'fixed' }, trainee)); reasoning(a); },
        focus: 'own', zoom: 24, speed: 240, hold: 21 },

      // 9. Close
      { caption: 'The same engine works at sea, on land and in the air, and can connect to other simulators to drive their forces. Thank you.',
        do: a => { a.overview(); a.tab('trainee'); }, speed: 60, hold: 22 }
    ]
  });
})();
