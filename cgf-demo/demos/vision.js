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
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.value = text; document.getElementById('btnSteerParse').click(); }
  };
  // Apply appears once the parse has finished (the local LLM is tried first), so the step keeps trying
  const applySteer = () => { const b = document.getElementById('btnSteerApply'); if (b) b.click(); };
  const trainee = { trainee: 'trainee_b', agent: 'trainees/weak_hail_discipline.js', duration_s: 12000 };

  CGF.registerDemo({
    id: 'vision',
    name: 'Vision: adaptive CGF trainer (~4.5 min)',
    pace: 1.9,    // the whole run, debrief pages included, fits in about 4.5 minutes
    scenario: 'strait-transit',
    params: { timeScale: 60 },
    view: { zoom: 26 },
    places: { 'border-patrol': [12, -40, 0], 'airspace-patrol': [80, -240, 0] },   // nearer the action (the maps are large)
    // then the pages that use the session: Ben's debrief (his session record in the link), and the intake's trainee data
    after: [
      { url: 'report.html', record: true, seconds: 40, caption: 'The debrief: what Ben did, what the trainer changed and why, and what his next session will press.' },
      { url: 'cohort.html', seconds: 25, caption: 'The trainee data: every trainee\'s competencies across the intake, updated from each session.' }
    ],
    steps: [
      // 1. The problem
      { caption: 'Today every trainee faces the same scripted enemy. Our trainer adjusts the enemy to each trainee.',
        do: a => { a.tab('trainee'); a.overview(); }, speed: 30, hold: 21 },

      // 2. Experience picks WHAT to exercise
      { caption: 'Meet Ben, the trainee steering this Singapore warship. His past sessions show he is weak at answering radio warnings.',
        do: a => { reasoning(a); a.startAdaptive(trainee); }, focus: 'own', zoom: 22, speed: 10, spot: '#rsnSeats', hold: 22 },
      { caption: 'So the enemy starts by testing exactly that. Each change is shown with its reason (tag: history).',
        until: a => navAdjustments(a, 'history').length >= 2, spot: '#rsnAdjustments', hold: 16, timeout: 40 },

      // 3. A miss, and the CGFs work together
      { caption: 'An enemy patrol boat radios a warning. Ben does not answer.',
        focus: 'R-21', zoom: 14, speed: 30,
        until: a => a.events('hail_ignored').length >= 1, hold: 18, timeout: 45 },
      { caption: 'The enemy works as a team: the other boats hear about it…', speed: 15,
        until: a => a.teamActions() >= 2, hold: 6, timeout: 40 },
      { caption: '…and join in, coming from different directions.',
        do: a => a.frame(['own', 'R-21', ...a.teammates()], 1.8), spot: '#rsnTeam', hold: 13 },
      { caption: 'Now Ben is facing the whole patrol, not one boat.',
        do: a => a.focus('own', 22), hold: 8 },

      // 4. Current behaviour sets HOW HARD
      // Challenge rule (JL, 9223c6d): the scripted Ben starts answering, so the live signal pushes harder
      { caption: 'Fast-forward: Ben starts answering the warnings…', speed: 480,
        until: a => navAdjustments(a, 'live').some(x => x.pressure_direction === 'up'), hold: 6, timeout: 60 },
      { caption: 'Ben is handling it now, so the enemy pushes harder (tag: live). If he were struggling, it would ease off.',
        do: a => a.focus('own', 22), spot: '#rsnAdjustments', speed: 30, hold: 21 },

      // 5. Teamwork from the harness and from the crew's skill
      { caption: 'The instructor can switch the enemy to an elite force, which works together more closely.',
        do: a => a.inject.setForceHarness('red', 'hostile-elite'), spot: '#forceHarnesses', hold: 21 },
      { caption: 'The trainer also matches the enemy\'s teamwork to how skilled the crew is (tag: team).',
        spot: '#rsnTeam', hold: 21 },

      // 6. Plain-language steering
      { caption: 'Instructors can also give instructions in plain English.',
        do: () => { steered = false; typeSteer("test trainee B's collision avoidance hard for 10 minutes"); }, spot: '#steerText', speed: 15, hold: 22 },
      { caption: 'Applied: Ben\'s training now focuses on avoiding collisions for the next 10 minutes.',
        until: () => { applySteer(); return steering(); }, spot: '#rsnSeats', hold: 21, timeout: 40 },

      // 7. End of training: the session record feeds the report and the trainee's history
      { caption: 'At the end, the session is saved: what happened, what changed and why. This feeds Ben\'s report and his next session.',
        do: a => { CGF.sim.mode = 'exercise'; CGF.endRun('success', 'Demo: training session ended.'); }, spot: '#rsnRecordInfo', allowOutcome: true, hold: 22 },

      // 8. Fixed assessment
      { caption: 'For exams, fixed mode keeps the enemy the same for everyone.',
        do: a => a.startAdaptive(Object.assign({ mode: 'fixed' }, trainee)),
        focus: 'own', zoom: 24, speed: 240, spot: '#modeBadge', hold: 21 },

      // 9. Neutral forces react to the trainee too
      { caption: 'Neutral ships react to the trainee as well. Here the trainee locks weapons radar onto a distant enemy ship…',
        do: a => { a.load('strait-transit', { mode: 'freeplay' }); a.place(14, -34, 0); a.speed(16); a.tab('trainee');
          a.select(a.unit('R-11')); a.actions.toggleFc(); a.select(a.unit('MV Orion Star')); },
        focus: 'own', zoom: 16, speed: 60, until: a => a.maxLevel('white') >= 1, hold: 12, timeout: 30 },
      { caption: '…and the merchant ships nearby speed up, leave the sea lane and get away.',
        do: a => a.focus(a.top('white'), 16), spot: '#contacts', until: a => a.maxLevel('white') >= 3, hold: 16, timeout: 40 },
      { caption: 'Radar off: things calm down and the merchants return to the sea lane.',
        do: a => { if (CGF.sim.fcTarget) a.actions.toggleFc(); }, spot: '#actions', hold: 14 },

      // 10. Swappable harnesses: the same behaviour files on land and in the air
      { caption: 'Each force\'s behaviour is a swappable file. On land, the same files drive tanks, militia and civilian cars. The instructor asks for a roadblock in plain English.',
        do: a => a.load('border-patrol', { mode: 'freeplay' }), speed: 30,
        prompt: 'Have all four Black militia vehicles (B-31, B-41, B-42, B-43) close in and block BLUE-1 on the road.',
        fallback: 'force B-31 block; force B-41 block; force B-42 block; force B-43 block', hold: 10 },
      { caption: 'The militia block the road, and civilian cars pull off to get away from the confrontation.',
        do: a => a.focus(a.top('white') || 'own', 18), spot: '#actions', until: a => a.maxLevel('white') >= 2, hold: 14, timeout: 25 },
      { caption: 'Swap one file live, just by asking: the militia become non-hostile. They stop blocking and escort the patrol instead.',
        prompt: 'Switch the Black militia to the non-hostile harness.', fallback: 'set black to non-hostile', hold: 14 },
      { caption: 'In the air, the same files drive fighters and airliners: enemy fighters intercept, airliners leave the airway.',
        do: a => { a.load('airspace-patrol', { mode: 'freeplay' }); a.tab('trainee'); a.steerTo(-80, -120); a.speed(520); },
        focus: 'R-F1', zoom: 140, speed: 60, spot: '#contacts', until: a => a.maxLevel('red') >= 2, hold: 18, timeout: 45 },

      // 11. Close
      { caption: 'The same engine works at sea, on land and in the air, and can connect to other simulators to drive their forces. Thank you.',
        do: a => { a.overview(); a.tab('trainee'); }, speed: 60, hold: 22 }
    ]
  });
})();
