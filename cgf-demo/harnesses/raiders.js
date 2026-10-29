// Harness: opportunistic non-state raiders: pirates at sea, bandits or ambushers on land.
// Note the negative weights: speed, facing them and visible weapons DETER raiders, while slow,
// predictable movement encourages them, the opposite of a state force.
// Needs plugins/greyzone-tactics.js for the "swarm" behaviour used in the final state.
CGF.registerHarness({
  id: 'raiders',
  name: 'Raiders / piracy (non-state)',
  description: 'Opportunistic raiders. Encouraged by slow, predictable targets; deterred by speed, manoeuvre and visible weapons.',
  teamwork: 0.4,              // 0..1: how well its units share a picture and act together (CGF teamwork)
  kind: 'non-state',
  affiliation: 'hostile',
  baseTension: 10, aggression: 1.2, decayPerMin: 4, ackRelief: 0,
  failState: 'Close assault',
  weights: { proximity: 6, slowSpeed: 10, contiguous: 3, cpa: 2, bowOn: -6, highSpeed: -8, fcRadar: -12, opening: -4 },
  ranges: { close: 12, cpa: 1, highSpeedKts: 22, slowSpeedKts: 14 },
  states: [
    { name: 'Loiter', min: 0, behaviour: 'patrol', standDown: 'Broke off, loitering' },
    { name: 'Probe', min: 35, behaviour: 'approach', range: 3, action: 'Closed to probe ownship' },
    { name: 'Attack run', min: 60, behaviour: 'approach', range: 0.4, action: 'Began high-speed attack run' },
    { name: 'Close assault', min: 85, behaviour: 'swarm', range: 0.15, action: 'Closed in to board / assault ownship' }
  ]
});
