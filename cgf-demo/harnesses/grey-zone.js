// Harness: grey-zone, state-backed (coast guard and militia, irregular border units, drones).
// Never fires, but swarms and physically blocks. Domain-neutral: boats block a sea lane, militia
// trucks set up a roadblock, drones crowd an air corridor.
// Needs plugins/greyzone-tactics.js for the "swarm" and "block" behaviours.
CGF.registerHarness({
  id: 'grey-zone',
  name: 'Grey-zone (state-backed)',
  description: 'Deniable state-backed units. Swarms and blocks the ownship\'s path; never fires.',
  teamwork: 0.8,              // 0..1: how well its units share a picture and act together (CGF teamwork)
  kind: 'state',
  affiliation: 'suspect',
  baseTension: 15, aggression: 1.0, decayPerMin: 2.5, ackRelief: 6,
  warnRepeatSec: 200, ignoreAfterSec: 150,
  failState: null,
  weights: { proximity: 4, bowOn: 3, cpa: 6, contiguous: 4, territorial: 10, fcRadar: 25, ignoredWarning: 6, highSpeed: 4, opening: -3 },
  ranges: { close: 8, cpa: 1.5, highSpeedKts: 20 },
  states: [
    { name: 'Presence', min: 0, behaviour: 'patrol', standDown: 'Went back to presence patrol' },
    { name: 'Swarm', min: 30, behaviour: 'swarm', range: 2.5, action: 'Swarmed around ownship',
      msg: '{unit}: You are disturbing {force} activity in this area.' },
    { name: 'Block', min: 55, behaviour: 'block', range: 1.5, warn: true, action: 'Formed line to block ownship path',
      msg: '{unit}: You are entering {force} jurisdiction. Turn back.' },
    { name: 'Close block', min: 80, behaviour: 'block', range: 0.6, warn: true, action: 'Closed to collision distance to block ownship',
      msg: '{unit}: Final warning. Any collision is your responsibility.' }
  ]
});
