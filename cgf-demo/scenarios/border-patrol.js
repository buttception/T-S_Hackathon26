// Scenario (LAND): a Blue force (Singapore) patrol drives a border road to a northern checkpoint.
// Red force holds the territory to the west, Black force militia hold hills to the east, a bandit group
// operates from the forest, and civilian traffic uses the roads.
// It reuses exactly the same harness files as the sea scenario; only the map, units and domain differ.
// Distances are km and speeds km/h (domain "land": harness ranges ×1, speed thresholds ×2).
(function () {
  const roadNorth = [[16, -80], [16, 80]];
  const roadSouth = [[18, 80], [18, -80]];

  CGF.registerScenario({
    id: 'border-patrol',
    view: { half: 60, grid: 10 },   // the map is twice the original size
    name: 'LAND · Border road patrol',
    domain: 'land',
    shortName: 'Border road patrol',
    brief: {
      objective: 'BLUE-1 drives north along the border road to Checkpoint North.',
      situation: ['Red holds the territory to the west.', 'Black militia hold the hills to the east.', 'Bandits operate from the forest.'],
      constraints: 'Keep the road open. Avoid escalation.'
    },
    terms: { area: 'territory', ownType: 'patrol' },

    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:    { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black:  { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      bandit: { label: 'Bandit group', tag: 'BND', kind: 'non-state', color: '#ff9f1c', harness: 'raiders' },
      white:  { label: 'Civilian traffic', tag: 'CIV', kind: 'civil', color: '#00e200', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (SAF)', force: 'blue', x: 16, y: -56, hdg: 0, spd: 40, maxSpd: 80, turnRate: 6, accel: 2 },
    objective: { x: 16, y: 52, name: 'Checkpoint North' },

    land: [
      { name: 'Lake', poly: [[-4, 20], [6, 24], [8, 34], [-2, 36], [-6, 28]], fill: '#12304a', stroke: '#1f4a6b' },
      { name: 'Forest', poly: [[40, -64], [66, -60], [70, -36], [44, -40]], fill: '#15301a', stroke: '#24502b' },
      { name: 'Black-held hills', owner: 'black', poly: [[36, -6], [48, -8], [50, 6], [38, 10]], fill: '#2d2b1b', stroke: '#4a4630' }
    ],
    zones: [
      { name: 'Red territory', kind: 'territorial', owner: 'red', poly: [[-90, -90], [-12, -90], [-8, 0], [-12, 90], [-90, 90]] },
      { name: 'Red border buffer', kind: 'contiguous', owner: 'red', poly: [[-90, -90], [0, -90], [4, 0], [0, 90], [-90, 90]] },
      { name: 'Black-held area', kind: 'territorial', owner: 'black', poly: [[32, -12], [54, -12], [54, 14], [32, 14]] },
      { name: 'Black claimed zone', kind: 'contiguous', owner: 'black', poly: [[24, -24], [62, -24], [62, 24], [24, 24]] }
    ],
    lanes: [
      { name: 'Border road', label: 'Border road', labelAt: [18, -72], points: [[17, -90], [17, 90]] },
      { name: 'East road', label: 'East road', labelAt: [40, -30], points: [[-12, -28], [17, -28], [64, -28]] }
    ],

    units: [
      // Red force
      { name: 'R-11', type: 'APC', force: 'red', x: -12, y: 8, hdg: 180, spd: 20, maxSpd: 70, turnRate: 5, accel: 2, temperament: 1.0, patrolSpd: 20, patrol: [[-12, 16], [-12, -16]] },
      { name: 'R-21', type: 'Recon vehicle', force: 'red', x: -10, y: -36, hdg: 0, spd: 30, maxSpd: 90, turnRate: 6, accel: 3, temperament: 1.4, patrolSpd: 30, patrol: [[-10, -36], [-6, -52], [-16, -60]] },
      { name: 'R-22', type: 'Recon vehicle', force: 'red', x: -10, y: 40, hdg: 0, spd: 30, maxSpd: 90, turnRate: 6, accel: 3, temperament: 1.4, patrolSpd: 30, patrol: [[-10, 40], [-6, 56], [-16, 60]] },
      // Black force
      { name: 'B-31', type: 'Militia technical', force: 'black', x: 30, y: 8, hdg: 180, spd: 20, maxSpd: 70, turnRate: 5, accel: 2, temperament: 1.1, patrolSpd: 20, patrol: [[30, 18], [30, -10]] },
      { name: 'B-41', type: 'Militia pickup', force: 'black', x: 40, y: -10, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[40, -10], [36, 12]] },
      { name: 'B-42', type: 'Militia pickup', force: 'black', x: 52, y: 12, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[52, 12], [42, 18]] },
      { name: 'B-43', type: 'Militia pickup', force: 'black', x: 52, y: -8, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[52, -8], [46, -16]] },
      // Bandit group (non-state)
      { name: 'BND-1', type: 'Technical', force: 'bandit', x: 54, y: -50, hdg: 270, spd: 10, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.1, patrolSpd: 10, patrol: [[54, -50], [48, -58]] },
      { name: 'BND-2', type: 'Technical', force: 'bandit', x: 62, y: -42, hdg: 270, spd: 10, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.0, patrolSpd: 10, patrol: [[62, -42], [56, -46]] },
      // Civilian traffic on the roads
      { name: 'Bus 12', type: 'Bus', force: 'white', x: 16, y: -72, hdg: 0, spd: 50, maxSpd: 70, turnRate: 5, accel: 2, route: roadNorth, wpIdx: 1 },
      { name: 'Truck 7', type: 'Truck', force: 'white', x: 16, y: -12, hdg: 0, spd: 45, maxSpd: 65, turnRate: 4, accel: 1.5, route: roadNorth, wpIdx: 1 },
      { name: 'Car 3', type: 'Car', force: 'white', x: 18, y: 60, hdg: 180, spd: 60, maxSpd: 100, turnRate: 6, accel: 3, route: roadSouth, wpIdx: 1 },
      { name: 'Truck 9', type: 'Truck', force: 'white', x: 18, y: 4, hdg: 180, spd: 45, maxSpd: 65, turnRate: 4, accel: 1.5, route: roadSouth, wpIdx: 1 }
    ],

    spawn: {
      red:    { name: 'R-AV', type: 'Armoured vehicle', x: -20, y: 0, hdg: 90, spd: 40, maxSpd: 80, turnRate: 5, accel: 2, temperament: 1.5, patrolSpd: 25, patrol: [[-12, 6], [-12, -6]] },
      black:  { name: 'B-TK', type: 'Militia technical', x: 48, y: -16, hdg: 270, spd: 30, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.3, patrolSpd: 15, patrol: [[40, -12], [36, 8]] },
      bandit: { name: 'BND', type: 'Technical', x: 60, y: -52, hdg: 270, spd: 40, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.3, patrolSpd: 15, patrol: [[52, -48], [46, -56]] },
      white:  { name: 'Car', type: 'Car', x: 16, y: -88, hdg: 0, spd: 60, maxSpd: 100, turnRate: 6, accel: 3, route: roadNorth, wpIdx: 1 }
    }
  });
})();
