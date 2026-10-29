// Harness: grey-zone maritime militia. Never fires, but swarms and physically blocks.
// Needs plugins/greyzone-tactics.js for the "swarm" and "block" behaviours.
CGF.registerHarness({
  id: 'grey-zone',
  name: 'Grey-zone militia',
  description: 'Deniable "fishing" vessels backed by a coast guard. Swarms and blocks the ownship\'s path; never fires.',
  kind: 'state',           // state-backed: coast guard and maritime militia
  affiliation: 'suspect',
  baseTension: 15, aggression: 1.0, decayPerMin: 2.5, ackRelief: 6,
  warnRepeatSec: 200, ignoreAfterSec: 150,
  failState: null,
  weights: { proximity: 4, bowOn: 3, cpa: 6, contiguous: 4, territorial: 10, fcRadar: 25, ignoredWarning: 6, highSpeed: 4, opening: -3 },
  ranges: { close: 8, cpa: 1.5, highSpeedKts: 20 },
  states: [
    { name: 'Fishing', min: 0, behaviour: 'patrol', standDown: 'Went back to fishing' },
    { name: 'Swarm', min: 30, behaviour: 'swarm', range: 2.5, action: 'Swarmed around ownship',
      msg: '{unit}: Vessel, you are disturbing {force} fishing grounds.' },
    { name: 'Block', min: 55, behaviour: 'block', range: 1.5, warn: true, action: 'Formed line to block ownship path',
      msg: '{unit}: You are entering {force} jurisdiction. Turn back.' },
    { name: 'Close block', min: 80, behaviour: 'block', range: 0.6, warn: true, action: 'Closed to collision distance to block ownship',
      msg: '{unit}: Final warning. Any collision is your responsibility.' }
  ]
});
