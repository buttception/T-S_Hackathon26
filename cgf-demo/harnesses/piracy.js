// Harness: non-state piracy / armed robbery. Note the negative weights: speed, pointing the bow at
// them and fire-control radar DETER pirates, while slow speed encourages them.
// Needs plugins/greyzone-tactics.js for the "swarm" behaviour used in the final state.
CGF.registerHarness({
  id: 'piracy',
  name: 'Piracy (non-state)',
  description: 'Opportunistic skiffs. Encouraged by slow, predictable ships; deterred by speed, manoeuvre and visible weapons.',
  kind: 'non-state',
  affiliation: 'hostile',
  baseTension: 10, aggression: 1.2, decayPerMin: 4, ackRelief: 0,
  failState: 'Boarding attempt',
  weights: { proximity: 6, slowSpeed: 10, contiguous: 3, cpa: 2, bowOn: -6, highSpeed: -8, fcRadar: -12, opening: -4 },
  ranges: { close: 12, cpa: 1, highSpeedKts: 22, slowSpeedKts: 14 },
  states: [
    { name: 'Loiter', min: 0, behaviour: 'patrol', standDown: 'Broke off, loitering' },
    { name: 'Probe', min: 35, behaviour: 'approach', range: 3, action: 'Closed to probe ownship' },
    { name: 'Attack run', min: 60, behaviour: 'approach', range: 0.4, action: 'Began high-speed attack run' },
    { name: 'Boarding attempt', min: 85, behaviour: 'swarm', range: 0.15, action: 'Attempted to board ownship' }
  ]
});
