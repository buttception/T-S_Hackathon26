// Example second project: an anti-piracy escort drill reusing the same engine and harnesses.
// The opposing force here is a non-state pirate group. Speed, manoeuvre and visible weapons deter it.
(function () {
  const lane = [[10, -48], [10, 48]];

  CGF.registerScenario({
    id: 'piracy-drill',
    name: 'Piracy drill (high-risk area transit)',
    brief: 'BLUE-1 transits a high-risk area alongside merchant traffic. Pirate skiffs are opportunistic: keep speed up, manoeuvre and protect the merchants.',
    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      pirate: { label: 'Pirate group', tag: 'PIR', kind: 'non-state', color: '#ff9f1c', harness: 'piracy' },
      white:  { label: 'Neutral shipping', tag: 'MER', kind: 'civil', color: '#00e200', harness: 'civil-shipping' }
    },
    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 6, y: -32, hdg: 0, spd: 10, maxSpd: 30 },
    objective: { x: 6, y: 32, name: 'Exit point' },
    land: [{ name: 'Coast', owner: 'white', poly: [[-48, -48], [-30, -48], [-26, 0], [-30, 48], [-48, 48]] }],
    zones: [{ name: 'High-risk area', kind: 'contiguous', owner: 'pirate', poly: [[-5, -30], [45, -30], [45, 30], [-5, 30]] }],
    lanes: [{ name: 'Transit corridor', points: lane }],
    units: [
      { name: 'Skiff 1', type: 'Skiff', force: 'pirate', x: 18, y: -6, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.2, patrolSpd: 6, patrol: [[18, -6], [16, -14]] },
      { name: 'Skiff 2', type: 'Skiff', force: 'pirate', x: 20, y: 2, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.0, patrolSpd: 6, patrol: [[20, 2], [17, 8]] },
      { name: 'Skiff 3', type: 'Skiff', force: 'pirate', x: 18, y: 12, hdg: 270, spd: 6, maxSpd: 30, turnRate: 4, temperament: 0.9, patrolSpd: 6, patrol: [[18, 12], [21, 16]] },
      { name: 'MV Tern', type: 'Bulk carrier', force: 'white', x: 10, y: -20, hdg: 0, spd: 11, maxSpd: 14, route: lane, wpIdx: 1 },
      { name: 'MT Coral', type: 'Tanker', force: 'white', x: 10, y: 5, hdg: 0, spd: 10, maxSpd: 13, route: lane, wpIdx: 1 }
    ],
    spawn: {
      pirate: { name: 'Skiff', type: 'Skiff', x: 30, y: 0, hdg: 270, spd: 20, maxSpd: 32, turnRate: 4, temperament: 1.3, patrolSpd: 8, patrol: [[26, 0], [22, -6]] },
      white: { name: 'MV', type: 'Merchant', x: 10, y: -46, hdg: 0, spd: 11, maxSpd: 14, route: lane, wpIdx: 1 }
    }
  });
})();
