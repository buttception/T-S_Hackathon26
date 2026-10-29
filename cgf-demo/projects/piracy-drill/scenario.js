// Example second project: an anti-piracy escort drill reusing the same engine and harnesses.
// The opposing force here is a non-state pirate group. Speed, manoeuvre and visible weapons deter it.
(function () {
  const lane = [[20, -96], [20, 96]];

  CGF.registerScenario({
    id: 'piracy-drill',
    view: { half: 72, grid: 10 },   // the map is twice the original size
    name: 'Piracy drill (high-risk area transit)',
    shortName: 'Piracy drill',
    domain: 'sea',
    brief: {
      objective: 'BLUE-1 transits the high-risk area and protects the merchant ships.',
      situation: ['Pirate skiffs are opportunistic.', 'Merchant traffic shares the corridor.'],
      constraints: 'Keep speed up, manoeuvre and keep weapons visible.'
    },
    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      pirate: { label: 'Pirate group', tag: 'PIR', kind: 'non-state', color: '#ff9f1c', harness: 'raiders' },
      white:  { label: 'Neutral shipping', tag: 'MER', kind: 'civil', color: '#00e200', harness: 'civil-traffic' }
    },
    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 12, y: -64, hdg: 0, spd: 10, maxSpd: 30 },
    objective: { x: 12, y: 64, name: 'Exit point' },
    land: [{ name: 'Coast', owner: 'white', poly: [[-96, -96], [-60, -96], [-52, 0], [-60, 96], [-96, 96]] }],
    zones: [{ name: 'High-risk area', kind: 'contiguous', owner: 'pirate', poly: [[-10, -60], [90, -60], [90, 60], [-10, 60]] }],
    lanes: [{ name: 'Transit corridor', label: 'Transit corridor', labelAt: [20, -80], points: lane }],
    units: [
      { name: 'Skiff 1', type: 'Skiff', force: 'pirate', x: 36, y: -12, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.2, patrolSpd: 6, patrol: [[36, -12], [32, -28]] },
      { name: 'Skiff 2', type: 'Skiff', force: 'pirate', x: 40, y: 4, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.0, patrolSpd: 6, patrol: [[40, 4], [34, 16]] },
      { name: 'Skiff 3', type: 'Skiff', force: 'pirate', x: 36, y: 24, hdg: 270, spd: 6, maxSpd: 30, turnRate: 4, temperament: 0.9, patrolSpd: 6, patrol: [[36, 24], [42, 32]] },
      { name: 'MV Tern', type: 'Bulk carrier', force: 'white', x: 20, y: -40, hdg: 0, spd: 11, maxSpd: 14, route: lane, wpIdx: 1 },
      { name: 'MT Coral', type: 'Tanker', force: 'white', x: 20, y: 10, hdg: 0, spd: 10, maxSpd: 13, route: lane, wpIdx: 1 }
    ],
    spawn: {
      pirate: { name: 'Skiff', type: 'Skiff', x: 60, y: 0, hdg: 270, spd: 20, maxSpd: 32, turnRate: 4, temperament: 1.3, patrolSpd: 8, patrol: [[52, 0], [44, -12]] },
      white: { name: 'MV', type: 'Merchant', x: 20, y: -92, hdg: 0, spd: 11, maxSpd: 14, route: lane, wpIdx: 1 }
    }
  });
})();
