// Harness: non-hostile state force. Tolerant, quick to calm down. Queries, escorts and protests, never force.
// Domain-neutral: the same file drives a coast guard, a border police unit or an air policing flight. No failure state.
CGF.registerHarness({
  id: 'non-hostile-state',
  name: 'Non-hostile state',
  description: 'Protective but friendly. Queries, escorts and protests; never uses force.',
  teamwork: 0.5,              // 0..1: how well its units share a picture and act together (CGF teamwork)
  kind: 'state',
  affiliation: 'neutral',
  baseTension: 5, aggression: 0.8, decayPerMin: 3, ackRelief: 15,
  warnRepeatSec: 300, ignoreAfterSec: 240,
  failState: null,
  weights: { proximity: 3, bowOn: 2, cpa: 5, contiguous: 2, territorial: 10, fcRadar: 30, ignoredWarning: 6, highSpeed: 1, opening: -4 },
  ranges: { close: 8, cpa: 1.5, highSpeedKts: 26 },
  states: [
    { name: 'Routine', min: 0, behaviour: 'patrol', standDown: 'Resumed routine patrol' },
    { name: 'Query', min: 30, behaviour: 'shadow', range: 8, warn: true, action: 'Queried ownship intentions',
      msg: '{unit}: {force} to {ownType} on heading {hdg}, please state your intentions.' },
    { name: 'Escort', min: 55, behaviour: 'escort', range: 3, action: 'Began escorting ownship',
      msg: '{unit}: We will accompany you while you are in {force} {area}.' },
    { name: 'Protest', min: 80, behaviour: 'escort', range: 1.5, warn: true, action: 'Issued formal protest',
      msg: '{unit}: Formal notice. You are in {force} {area} without clearance. This will be raised diplomatically.' }
  ]
});
