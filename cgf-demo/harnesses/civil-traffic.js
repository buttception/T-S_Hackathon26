// Harness: neutral civil traffic: merchant ships on sea lanes, vehicles on roads, airliners on airways.
// Unarmed. "Tension" here is alarm: it rises with nearby military confrontation (the "conflict" factor),
// collision-course approaches and fire-control radar. Alarmed traffic speeds up, leaves its route, then flees.
CGF.registerHarness({
  id: 'civil-traffic',
  name: 'Civil traffic',
  description: 'Ships, vehicles or airliners following their routes. They keep clear of the ownship and run from any confrontation.',
  kind: 'civil',
  affiliation: 'neutral',
  armed: false,
  baseTension: 0, aggression: 1, decayPerMin: 5, ackRelief: 0, reactionMult: 0.5,
  failState: null,
  weights: { conflict: 30, fcRadar: 15, cpa: 10, proximity: 3, bowOn: 3, highSpeed: 3, opening: -2 },
  ranges: { close: 4, cpa: 1.5, highSpeedKts: 24, conflictNm: 20 },
  states: [
    { name: 'Transit', min: 0, behaviour: 'lane', standDown: 'Resumed normal route' },
    { name: 'Cautious', min: 30, behaviour: 'lane', speedMult: 1.25, action: 'Increased speed, keeping clear',
      msg: '{unit}: {unit} increasing speed, keeping clear of military activity.' },
    { name: 'Diverting', min: 55, behaviour: 'flee', speedMult: 0.9, action: 'Left its route, diverting away from activity',
      msg: '{unit}: {unit} leaving the route to avoid military activity.' },
    { name: 'Fleeing', min: 80, behaviour: 'flee', speedMult: 1, action: 'Fleeing the area at best speed',
      msg: '{unit}: {unit} leaving the area at best speed. Request all military units keep clear.' }
  ]
});
