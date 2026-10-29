// Harness: hostile state navy. Low tolerance, escalates quickly, does not forget.
// Reaching the failState ("Weapons ready") ends the scenario as a failure.
CGF.registerHarness({
  id: 'hostile-navy',
  name: 'Hostile navy',
  description: 'Low tolerance, escalates quickly. Final state is a weapons-ready posture (scenario failure).',
  kind: 'state',           // state actor (navy, coast guard)
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
      msg: '{unit}: Unidentified warship, you are being monitored by {force} naval units.' },
    { name: 'Warn', min: 45, behaviour: 'shadow', range: 3.5, warn: true, action: 'Closed in and issued warning',
      msg: '{unit} to warship on course {hdg}: you are approaching {force} waters. Alter course away immediately.' },
    { name: 'Harass', min: 65, behaviour: 'harass', range: 1.2, warn: true, action: 'Manoeuvring to cross ownship bow',
      msg: '{unit}: FINAL WARNING. Leave {force} waters or you will be intercepted.' },
    { name: 'Weapons ready', min: 85, behaviour: 'posture', range: 4, fcRadar: true, action: 'Took weapons-ready posture',
      msg: '{unit}: Fire-control radar locked on your vessel. Weapons ready.' }
  ]
});
