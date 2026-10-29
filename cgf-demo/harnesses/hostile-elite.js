// Harness: hostile state force, ELITE. The same rules and radio calls as hostile-state.js, but a professional,
// well-drilled force: units share one picture and act as a team (teamwork 0.95), react faster, and stay calm
// longer before escalating on their own (lower aggression). Compare with hostile-state.js (teamwork 0.5) to
// show the difference between a well-drilled and an ordinary opponent. The instructor can also set teamwork per
// force on the Instructor tab, and adaptation can raise or lower it ("weight.team") with the crew's capability.
CGF.registerHarness({
  id: 'hostile-elite',
  name: 'Hostile state (elite)',
  description: 'Well-drilled hostile force: shares one picture, escalates together, takes coordinated stations. Final state is weapons ready (exercise failure).',
  teamwork: 0.95,
  kind: 'state',
  affiliation: 'hostile',
  baseTension: 20, aggression: 1.1, decayPerMin: 3, ackRelief: 8, reactionMult: 0.6,
  warnRepeatSec: 180, ignoreAfterSec: 150,
  failState: 'Weapons ready',
  weights: { proximity: 8, bowOn: 5, cpa: 8, contiguous: 6, territorial: 16, fcRadar: 40, ignoredWarning: 12, highSpeed: 3, opening: -6 },
  ranges: { close: 14, cpa: 2, highSpeedKts: 24 },
  states: [
    { name: 'Patrol', min: 0, behaviour: 'patrol', standDown: 'Returned to patrol' },
    { name: 'Shadow', min: 25, behaviour: 'shadow', range: 6, action: 'Began shadowing ownship',
      msg: '{unit}: Unidentified {ownType}, you are being monitored by {force}.' },
    { name: 'Warn', min: 45, behaviour: 'shadow', range: 3.5, warn: true, action: 'Closed in and issued warning',
      msg: '{unit} to {ownType} on heading {hdg}: you are approaching {force} {area}. Turn away immediately.' },
    { name: 'Harass', min: 65, behaviour: 'harass', range: 1.2, warn: true, action: 'Manoeuvring to cut across ownship',
      msg: '{unit}: FINAL WARNING. Leave {force} {area} or you will be intercepted.' },
    { name: 'Weapons ready', min: 85, behaviour: 'posture', range: 4, fcRadar: true, action: 'Took weapons-ready posture',
      msg: '{unit}: Fire-control radar locked on you. Weapons ready.' }
  ]
});
