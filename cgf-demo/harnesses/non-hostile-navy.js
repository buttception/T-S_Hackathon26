// Harness: non-hostile state navy / coast guard. Tolerant, quick to calm down.
// Responds with queries, escorts and diplomatic protests, never force. No failure state.
CGF.registerHarness({
  id: 'non-hostile-navy',
  name: 'Non-hostile navy',
  description: 'Protective but friendly. Queries, escorts and protests; never uses force.',
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
      msg: '{unit}: {force} coast guard to vessel on course {hdg}, please state your intentions.' },
    { name: 'Escort', min: 55, behaviour: 'escort', range: 3, action: 'Began escorting ownship',
      msg: '{unit}: We will accompany you while you are in {force} waters.' },
    { name: 'Protest', min: 80, behaviour: 'escort', range: 1.5, warn: true, action: 'Issued formal protest',
      msg: '{unit}: Formal notice. You are in {force} waters without clearance. This will be raised diplomatically.' }
  ]
});
