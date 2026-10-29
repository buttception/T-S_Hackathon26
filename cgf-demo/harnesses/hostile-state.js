// Harness: hostile state force. Low tolerance, escalates quickly, does not forget.
// Domain-neutral: the same file drives warships, armoured units or fighter aircraft. Ranges and speeds are
// scaled by each scenario, and {ownType} / {area} in the messages come from the scenario's terms.
// Reaching the failState ("Weapons ready") ends an Exercise run as a failure.
CGF.registerHarness({
  id: 'hostile-state',
  name: 'Hostile state',
  description: 'Low tolerance, escalates quickly. Final state is a weapons-ready posture (exercise failure).',
  teamwork: 0.5,              // 0..1: how well its units share a picture and act together (CGF teamwork)
  kind: 'state',
  affiliation: 'hostile',
  baseTension: 20, aggression: 1.3, decayPerMin: 3, ackRelief: 8,
  warnRepeatSec: 240, ignoreAfterSec: 180,
  failState: 'Weapons ready',
  // tension per minute when each factor is fully true (negative = calming)
  weights: { proximity: 8, bowOn: 5, cpa: 8, contiguous: 6, territorial: 16, fcRadar: 40, ignoredWarning: 10, highSpeed: 3, opening: -6 },
  ranges: { close: 12, cpa: 2, highSpeedKts: 24 },
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
