// Hands-off demo scripts. Each drives the trainee and the instructor automatically with captions.
// Play from the "Demo" control at the top of the panel, or open runtime.html?demo=<id> (add &loop=1 to repeat).
// Steps with a "prompt" type an instructor prompt visibly into the command box, then run it.
// Injects are used at key moments so every run tells the same story regardless of timing.

// ------------------------------------------------------------------ shared: the sea + air finale
const SEA_AIR_STEPS = [
  { caption: 'Sea and air together. BLUE-1 frigate with BLUE-2 patrol aircraft overhead. Red ships and Red fighters share ONE harness; merchant ships and airliners share another.',
    do: a => { a.tab('trainee'); a.speed(16); a.heading(0); }, hold: 10 },
  { caption: 'Instructor prompt: scramble another Red fighter, and send R-F1 to harass BLUE-1.',
    prompt: 'spawn red; force R-F1 harass', hold: 6 },
  { caption: 'BLUE-1 heads toward Red waters. Red\'s ships and aircraft react as one force: the fighters come out to shadow and warn.',
    do: a => { a.tab('trainee'); a.steerTo(0, -24); a.speed(24); a.select(a.unit('R-F1')); }, focus: 'R-F1', zoom: 18,
    until: a => a.maxLevel('red') >= 2, hold: 6, timeout: 40 },
  { caption: 'Below, merchant ships divert; above, airliners leave the airway. Two forces, one Civil traffic harness.',
    do: a => { const u = a.top('civair') || a.top('white'); a.select(u); a.focus(u, 22); },
    until: a => a.maxLevel('white') >= 2 || a.maxLevel('civair') >= 2, hold: 8, timeout: 40 },
  { caption: 'One prompt changes Red\'s ships and fighters at once, and calms the patrol boat.',
    prompt: 'set red to non-hostile; calm R-21', hold: 9 },
  { caption: 'Every CGF decision, at sea and in the air, is in the log with its reasons.',
    do: a => { a.tab('cgflog'); a.overview(); }, hold: 10 },
  { caption: 'Same engine and same harness files for sea, land, air or all together, driven by plain-language instructor prompts. Fully offline.',
    do: a => a.tab('trainee'), hold: 10 }
];

// ------------------------------------------------------------------ the long harness + prompting demo
CGF.registerDemo({
  id: 'harness',
  name: 'Harness reuse and prompting: sea, land, air (~4 min)',
  scenario: 'strait-transit',
  places: { 'strait-transit': [4, -46, 300], 'border-patrol': [12, -40, 0], 'airspace-patrol': [80, -240, 0], 'sea-air': [4, -44, 330] },
  view: { zoom: 26 },
  mode: 'freeplay', // nothing ends the run, so failures are shown and the story continues
  params: { timeScale: 60 },
  steps: [
    // Part 1: sea, same inputs under two different harnesses
    { caption: 'PART 1 OF 4 · SEA. One engine, five harness files. Red force is running the "Hostile state" harness.',
      do: a => { a.tab('setup'); a.speed(16); a.heading(0); }, hold: 9 },
    { caption: 'The instructor drives the scenario by prompt. Watch the command box: one line escalates a Red patrol boat.',
      do: a => a.select(a.unit('R-21')), focus: 'R-21', zoom: 18, prompt: 'escalate R-21', hold: 6 },
    { caption: 'BLUE-1 closes on R-21 at speed. Under the Hostile harness Red goes Warn, then Harass, then Weapons ready.',
      do: a => { a.tab('trainee'); a.speed(26); a.steerToUnit(a.unit('R-21')); },
      until: a => a.maxLevel('red') >= 4, hold: 6, timeout: 45 },
    { caption: 'Now restart, and change ONLY the harness. Same scenario, same prompt, same manoeuvre.',
      prompt: 'restart; set red to non-hostile', hold: 6 },
    { caption: 'The same prompt as before…',
      do: a => a.select(a.unit('R-21')), prompt: 'escalate R-21', hold: 4 },
    { caption: '…and the same manoeuvre. Under the "Non-hostile state" harness Red queries, then escorts. No threats.',
      do: a => { a.tab('trainee'); a.speed(26); a.steerToUnit(a.unit('R-21')); },
      until: a => a.maxLevel('red') >= 2, hold: 8, timeout: 45 },
    { caption: 'One prompt can hold several injects: bring in a Black unit, push two militia boats to block, and roll in fog.',
      prompt: 'spawn black; force B-31 block; force B-41 block; fog', hold: 9 },

    // Part 2: land, the same harness files on ground units
    { caption: 'PART 2 OF 4 · LAND. A new scenario file, but the SAME harness files: Red armour (Hostile state), Black militia (Grey-zone), bandits (Raiders), civilian traffic (Civil traffic).',
      prompt: 'load land', hold: 10 },
    { caption: 'The Grey-zone harness that blocked ships at sea now sets up a roadblock on the border road.',
      do: a => { a.speed(30); a.select(a.unit('B-31')); }, focus: 'B-31', zoom: 16, prompt: 'force B-31 close block; force B-41 close block; force B-42 close block', hold: 9 },
    { caption: 'Civilian vehicles use the same harness as merchant ships: they pull off the road and get away from the confrontation.',
      do: a => { a.tab('trainee'); a.select(a.top('white')); },
      until: a => a.maxLevel('white') >= 2, hold: 7, timeout: 40 },
    { caption: 'Swap the harness on land too: the militia become non-hostile. They stop blocking and escort the patrol instead.',
      prompt: 'set black to non-hostile', hold: 8 },

    // Part 3: air, the same harness files on aircraft
    { caption: 'PART 3 OF 4 · AIR. Fighters, drones and airliners, still the same five harness files. The scenario scales their ranges and speeds to air.',
      prompt: 'load air', hold: 10 },
    { caption: 'BLUE-1 turns toward Red\'s air defence zone. Red fighters (Hostile state) intercept, shadow, then warn.',
      do: a => { a.tab('trainee'); a.steerTo(-80, -120); a.speed(520); a.select(a.unit('R-F1')); }, focus: 'R-F1', zoom: 140,
      until: a => a.maxLevel('red') >= 2, hold: 6, timeout: 45 },
    { caption: 'Airliners (Civil traffic) leave the airway to stay clear of the intercept.',
      do: a => a.select(a.top('white')),
      until: a => a.maxLevel('white') >= 2, hold: 7, timeout: 35 },
    { caption: 'Prompt the swap mid-intercept: Red becomes non-hostile. Same fighters, now escorting instead of threatening.',
      prompt: 'set red to non-hostile', hold: 9 },

    // Part 4: sea and air together
    { caption: 'PART 4 OF 4 · SEA AND AIR TOGETHER.',
      prompt: 'load sea and air', hold: 5 },
    ...SEA_AIR_STEPS
  ]
});

// ------------------------------------------------------------------ plain-English prompting through the local LLM
// Each prompt is natural language for the model; "fallback" is the keyword version used if no model is available.
CGF.registerDemo({
  id: 'llm',
  name: 'Local LLM prompting, plain English (~3 min)',
  scenario: 'sea-air',
  places: { 'sea-air': [4, -44, 330] },
  view: { zoom: 26 },
  mode: 'freeplay',
  params: { timeScale: 60 },
  steps: [
    { caption: 'Instructor prompting with a LOCAL language model. The instructor types plain English; a model on this machine turns it into simulator commands. Nothing leaves the laptop.',
      do: a => { a.tab('instructor'); a.speed(16); a.heading(0); }, hold: 10 },
    { caption: 'A loose, natural request. The model maps "the red jets" and "the black drone" to the right units and states.',
      prompt: 'Make the Red jets a bit more aggressive, and have the Black drone get in BLUE-1\'s way.',
      fallback: 'escalate R-F1; escalate R-F2; force B-U1 block', hold: 9 },
    { caption: 'The model\'s commands were checked against the live scenario before running, and the preview card shows exactly what was applied.',
      do: a => { a.tab('trainee'); a.steerTo(0, -24); a.speed(22); a.select(a.unit('R-F1')); },
      until: a => a.maxLevel('red') >= 2, hold: 6, timeout: 30 },
    { caption: 'A request that spans several systems at once…',
      prompt: 'Give the trainee a navigation problem, and have R-11 radio a warning telling them to leave Red waters.',
      fallback: 'gps drift; R-11 hail "Leave Red waters immediately"', hold: 9 },
    { caption: '…and a de-escalation, phrased the way an instructor would say it.',
      prompt: 'Things are getting out of hand. Fix the ship, make Red non-hostile and calm the Black drone down.',
      fallback: 'repair; set red to non-hostile; calm B-U1', hold: 10 },
    { caption: 'It works across scenarios too: one sentence switches to the land exercise.',
      prompt: 'Switch to the land border patrol scenario.',
      fallback: 'load land', hold: 6 },
    { caption: 'Every LLM command shows up in the event log and the CGF log, just like a button press, so the debrief is complete.',
      prompt: 'Have all the Black militia vehicles block the road in front of BLUE-1.',
      fallback: 'force B-31 block; force B-41 block; force B-42 block; force B-43 block', hold: 10 },
    { caption: 'If the model server is down, the keyword parser takes over automatically. The model runs on-prem (Ollama, llama.cpp or similar), so it fits an air-gapped network.',
      do: a => a.tab('cgflog'), hold: 10 }
  ]
});

// ------------------------------------------------------------------ the sea + air finale on its own
CGF.registerDemo({
  id: 'sea-air',
  name: 'Sea and air together (~1.5 min)',
  scenario: 'sea-air',
  places: { 'sea-air': [4, -44, 330] },
  view: { zoom: 26 },
  mode: 'freeplay',
  params: { timeScale: 60 },
  steps: SEA_AIR_STEPS
});

// ------------------------------------------------------------------ the original tour
CGF.registerDemo({
  id: 'tour',
  name: 'Full capability tour, sea (~2 min)',
  scenario: 'strait-transit',
  places: { 'strait-transit': [6, -48, 320] },
  view: { zoom: 24 },
  params: { timeScale: 60 },
  steps: [
    { caption: 'BLUE-1, a Singapore Navy ship, transits a strait. Red force holds the west coast, Black force claims the reef to the east, and merchant ships use the sea lanes.',
      do: a => { a.tab('trainee'); a.speed(16); a.heading(0); }, hold: 9 },
    { caption: 'Every other ship is a computer-generated force (CGF) with its own behaviour harness. A steady, predictable transit keeps them calm.',
      hold: 8 },
    { caption: 'Now the trainee turns toward Red waters at 24 knots, closing Red\'s patrol boats…',
      do: a => { a.steerTo(-2, -38); a.speed(24); a.select(a.unit('R-21')); },
      until: a => a.maxLevel('red') >= 1, hold: 5, timeout: 40 },
    { caption: 'Red reacts: it shadows BLUE-1, and will warn next. The panel shows exactly why: proximity, bearing, zone, speed.',
      do: a => { a.select(a.top('red')); a.focus(a.top('red'), 16); }, until: a => a.maxLevel('red') >= 2, timeout: 35 },
    { caption: 'Red issues a radio warning. The trainee acknowledges it and turns back to the sea lane, and Red calms down.',
      do: a => { a.actions.acknowledge(); a.steerTo(20, 64); a.speed(14); }, hold: 10 },
    { caption: 'Instructor tab: the instructor injects an incident. Black force\'s coast guard and militia close in to block BLUE-1 in the sea lane.',
      do: a => { a.tab('instructor'); a.speed(10); for (const u of a.units('black')) a.inject.force(u, 'Close block'); a.select(a.unit('B-31')); }, focus: 'B-31', zoom: 20,
      hold: 9 },
    { caption: 'Neutral merchants sense the confrontation: they speed up, leave the lane, then divert away at best speed.',
      do: a => { a.tab('trainee'); a.select(a.top('white')); a.focus(a.top('white'), 18); },
      until: a => a.maxLevel('white') >= 2, hold: 8, timeout: 45 },
    { caption: 'Live harness swap: with one dropdown the instructor turns Black from grey-zone into a non-hostile state. Same ships, new attitude.',
      do: a => { a.tab('instructor'); a.inject.setForceHarness('black', 'non-hostile-state'); a.speed(16); }, hold: 10 },
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
  places: { 'strait-transit': [14, -34, 0] },
  view: { zoom: 20 },
  params: { timeScale: 120 },
  steps: [
    { caption: 'Merchant ships (green) follow the sea lanes and react to what they see.',
      do: a => { a.tab('trainee'); a.speed(16); a.heading(0); a.select(a.unit('MT Halcyon')); }, hold: 7 },
    { caption: 'The trainee switches on fire-control radar, targeting a distant Red frigate…',
      do: a => { a.select(a.unit('R-11')); a.actions.toggleFc(); a.select(a.unit('MV Orion Star')); a.focus('own', 16); },
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
  places: { 'piracy-drill': [16, -36, 0] },
  view: { zoom: 26 },
  params: { timeScale: 120 },
  steps: [
    { caption: 'Same engine, different project: an anti-piracy drill against a non-state pirate group in a high-risk area.',
      do: a => { a.tab('trainee'); a.speed(10); a.heading(0); }, hold: 8 },
    { caption: 'BLUE-1 is slow and predictable: an easy-looking target. The skiffs notice…',
      until: a => a.maxLevel('pirate') >= 1, timeout: 60 },
    { caption: 'A skiff closes to probe. BLUE-1 goes to 28 knots and turns bow-on: for pirates, speed and manoeuvre deter, the same actions that would anger a navy.',
      do: a => { a.params({ timeScale: 60 }); a.select(a.top('pirate')); a.focus(a.top('pirate'), 14); a.speed(28); a.steerToUnit(a.top('pirate')); },
      until: a => a.maxLevel('pirate') <= 0, hold: 10, timeout: 50 },
    { caption: 'The skiffs break off. Back on course; the CGF log shows why each decision was made.',
      do: a => { a.steerTo(12, 64); a.speed(24); a.tab('cgflog'); }, hold: 10 }
  ]
});
