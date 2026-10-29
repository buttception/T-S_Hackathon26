// Hands-off demo scripts. Each drives the trainee and the instructor automatically with captions.
// Play from the "Demo" control at the top of the panel, or open index.html?demo=tour (add &loop=1 to repeat).
// Injects are used at key moments so every run tells the same story regardless of timing.

CGF.registerDemo({
  id: 'tour',
  name: 'Full capability tour (~2 min)',
  scenario: 'strait-transit',
  params: { timeScale: 60 },
  steps: [
    { caption: 'BLUE-1, a Singapore Navy ship, transits a strait. Red force holds the west coast, Black force claims the reef to the east, and merchant ships use the sea lanes.',
      do: a => { a.tab('trainee'); a.speed(16); a.heading(0); }, hold: 9 },
    { caption: 'Every other ship is a computer-generated force (CGF) with its own behaviour harness. A steady, predictable transit keeps them calm.',
      hold: 8 },
    { caption: 'Now the trainee turns toward Red waters at 24 knots, closing Red\'s patrol boats…',
      do: a => { a.steerTo(-1, -19); a.speed(24); a.select(a.unit('R-21')); },
      until: a => a.maxLevel('red') >= 1, hold: 5, timeout: 40 },
    { caption: 'Red reacts: it shadows BLUE-1, and will warn next. The panel shows exactly why: proximity, bearing, zone, speed.',
      do: a => a.select(a.top('red')), until: a => a.maxLevel('red') >= 2, timeout: 35 },
    { caption: 'Red issues a radio warning. The trainee acknowledges it and turns back to the sea lane, and Red calms down.',
      do: a => { a.actions.acknowledge(); a.steerTo(10, 32); a.speed(14); }, hold: 10 },
    { caption: 'Instructor tab: the instructor injects an incident. Black force\'s coast guard and militia close in to block BLUE-1 in the sea lane.',
      do: a => { a.tab('instructor'); a.speed(10); for (const u of a.units('black')) a.inject.force(u, 'Close block'); a.select(a.unit('B-31')); },
      hold: 9 },
    { caption: 'Neutral merchants sense the confrontation: they speed up, leave the lane, then divert away at best speed.',
      do: a => { a.tab('trainee'); a.select(a.top('white')); },
      until: a => a.maxLevel('white') >= 2, hold: 8, timeout: 45 },
    { caption: 'Live harness swap: with one dropdown the instructor turns Black from grey-zone militia into a non-hostile coast guard. Same ships, new attitude.',
      do: a => { a.tab('instructor'); a.inject.setForceHarness('black', 'non-hostile-navy'); a.speed(16); }, hold: 10 },
    { caption: 'Malfunction inject: GPS drift. The trainee\'s display drifts off; the instructor sees the true position (faded).',
      do: a => a.inject.malfunction('gps', true), hold: 10 },
    { caption: 'Repair. Every inject and malfunction is recorded for the debrief.',
      do: a => a.inject.repairAll(), hold: 5 },
    { caption: 'The CGF log: every decision the computer-generated forces made, and why. It can be exported to CSV for the after-action review.',
      do: a => a.tab('cgflog'), hold: 11 },
    { caption: 'Same engine, any premise: swap harnesses per force, run Freeplay for open-ended instructor-led training, or load a new project. Runs fully offline.',
      do: a => a.tab('trainee'), hold: 9 }
  ]
});

CGF.registerDemo({
  id: 'shipping',
  name: 'Neutral shipping reacts (~1 min)',
  scenario: 'strait-transit',
  params: { timeScale: 120 },
  steps: [
    { caption: 'Merchant ships (green) follow the sea lanes and react to what they see.',
      do: a => { a.tab('trainee'); a.speed(16); a.heading(0); a.select(a.unit('MT Halcyon')); }, hold: 7 },
    { caption: 'The trainee switches on fire-control radar, targeting a distant Red frigate…',
      do: a => { a.select(a.unit('R-11')); a.actions.toggleFc(); a.select(a.unit('MV Orion Star')); },
      until: a => a.maxLevel('white') >= 1, hold: 6, timeout: 30 },
    { caption: 'Merchants near BLUE-1 speed up, then divert, then flee. Each decision is logged with its reason.',
      until: a => a.maxLevel('white') >= 3, hold: 8, timeout: 40 },
    { caption: 'Radar off: as things calm down, the merchants return to the sea lane.',
      do: a => { if (CGF.sim.fcTarget) a.actions.toggleFc(); a.tab('cgflog'); }, hold: 10 }
  ]
});

CGF.registerDemo({
  id: 'piracy',
  name: 'Piracy: speed deters (~1.5 min)',
  scenario: 'piracy-drill',
  params: { timeScale: 120 },
  steps: [
    { caption: 'Same engine, different project: an anti-piracy drill against a non-state pirate group in a high-risk area.',
      do: a => { a.tab('trainee'); a.speed(10); a.heading(0); }, hold: 8 },
    { caption: 'BLUE-1 is slow and predictable: an easy-looking target. The skiffs notice…',
      until: a => a.maxLevel('pirate') >= 1, timeout: 60 },
    { caption: 'A skiff closes to probe. BLUE-1 goes to 28 knots and turns bow-on: for pirates, speed and manoeuvre deter — the same actions that would anger a navy.',
      do: a => { a.params({ timeScale: 60 }); a.select(a.top('pirate')); a.speed(28); a.steerToUnit(a.top('pirate')); },
      until: a => a.maxLevel('pirate') <= 0, hold: 10, timeout: 50 },
    { caption: 'The skiffs break off. Back on course; the CGF log shows why each decision was made.',
      do: a => { a.steerTo(6, 32); a.speed(24); a.tab('cgflog'); }, hold: 10 }
  ]
});
