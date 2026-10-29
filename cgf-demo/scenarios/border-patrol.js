// Scenario (LAND): a Blue force (Singapore) patrol drives a border road to a northern checkpoint.
// Red force holds the territory to the west, Black force militia hold hills to the east, a bandit group
// operates from the forest, and civilian traffic uses the roads.
// It reuses exactly the same harness files as the sea scenario; only the map, units and domain differ.
// Distances are km and speeds km/h (domain "land": harness ranges ×1, speed thresholds ×2).
(function () {
  const roadNorth = [[8, -40], [8, 40]];
  const roadSouth = [[9, 40], [9, -40]];

  CGF.registerScenario({
    id: 'border-patrol',
    name: 'LAND · Border road patrol',
    domain: 'land',
    brief: 'BLUE-1 drives north along the border road to Checkpoint North. Red force holds the territory to the west; Black force militia hold the hills to the east; bandits operate from the forest. Keep the road open and avoid escalation.',
    terms: { area: 'territory', ownType: 'patrol' },

    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:    { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black:  { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      bandit: { label: 'Bandit group', tag: 'BND', kind: 'non-state', color: '#ff9f1c', harness: 'raiders' },
      white:  { label: 'Civilian traffic', tag: 'CIV', kind: 'civil', color: '#00e200', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (SAF)', force: 'blue', x: 8, y: -28, hdg: 0, spd: 40, maxSpd: 80, turnRate: 6, accel: 2 },
    objective: { x: 8, y: 26, name: 'Checkpoint North' },

    land: [
      { name: 'Lake', poly: [[-2, 10], [3, 12], [4, 17], [-1, 18], [-3, 14]], fill: '#12304a', stroke: '#1f4a6b' },
      { name: 'Forest', poly: [[20, -32], [33, -30], [35, -18], [22, -20]], fill: '#15301a', stroke: '#24502b' },
      { name: 'Black-held hills', owner: 'black', poly: [[18, -3], [24, -4], [25, 3], [19, 5]], fill: '#2d2b1b', stroke: '#4a4630' }
    ],
    zones: [
      { name: 'Red territory', kind: 'territorial', owner: 'red', poly: [[-45, -45], [-6, -45], [-4, 0], [-6, 45], [-45, 45]] },
      { name: 'Red border buffer', kind: 'contiguous', owner: 'red', poly: [[-45, -45], [0, -45], [2, 0], [0, 45], [-45, 45]] },
      { name: 'Black-held area', kind: 'territorial', owner: 'black', poly: [[16, -6], [27, -6], [27, 7], [16, 7]] },
      { name: 'Black claimed zone', kind: 'contiguous', owner: 'black', poly: [[12, -12], [31, -12], [31, 12], [12, 12]] }
    ],
    lanes: [
      { name: 'Border road', label: 'Border road', labelAt: [9, -36], points: [[8.5, -45], [8.5, 45]] },
      { name: 'East road', label: 'East road', labelAt: [20, -15], points: [[-6, -14], [8.5, -14], [32, -14]] }
    ],

    units: [
      // Red force
      { name: 'R-11', type: 'APC', force: 'red', x: -6, y: 4, hdg: 180, spd: 20, maxSpd: 70, turnRate: 5, accel: 2, temperament: 1.0, patrolSpd: 20, patrol: [[-6, 8], [-6, -8]] },
      { name: 'R-21', type: 'Recon vehicle', force: 'red', x: -5, y: -18, hdg: 0, spd: 30, maxSpd: 90, turnRate: 6, accel: 3, temperament: 1.4, patrolSpd: 30, patrol: [[-5, -18], [-3, -26], [-8, -30]] },
      { name: 'R-22', type: 'Recon vehicle', force: 'red', x: -5, y: 20, hdg: 0, spd: 30, maxSpd: 90, turnRate: 6, accel: 3, temperament: 1.4, patrolSpd: 30, patrol: [[-5, 20], [-3, 28], [-8, 30]] },
      // Black force
      { name: 'B-31', type: 'Militia technical', force: 'black', x: 15, y: 4, hdg: 180, spd: 20, maxSpd: 70, turnRate: 5, accel: 2, temperament: 1.1, patrolSpd: 20, patrol: [[15, 9], [15, -5]] },
      { name: 'B-41', type: 'Militia pickup', force: 'black', x: 20, y: -5, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[20, -5], [18, 6]] },
      { name: 'B-42', type: 'Militia pickup', force: 'black', x: 26, y: 6, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[26, 6], [21, 9]] },
      { name: 'B-43', type: 'Militia pickup', force: 'black', x: 26, y: -4, hdg: 0, spd: 15, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.2, patrolSpd: 15, patrol: [[26, -4], [23, -8]] },
      // Bandit group (non-state)
      { name: 'BND-1', type: 'Technical', force: 'bandit', x: 27, y: -25, hdg: 270, spd: 10, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.1, patrolSpd: 10, patrol: [[27, -25], [24, -29]] },
      { name: 'BND-2', type: 'Technical', force: 'bandit', x: 31, y: -21, hdg: 270, spd: 10, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.0, patrolSpd: 10, patrol: [[31, -21], [28, -23]] },
      // Civilian traffic on the roads
      { name: 'Bus 12', type: 'Bus', force: 'white', x: 8, y: -36, hdg: 0, spd: 50, maxSpd: 70, turnRate: 5, accel: 2, route: roadNorth, wpIdx: 1 },
      { name: 'Truck 7', type: 'Truck', force: 'white', x: 8, y: -6, hdg: 0, spd: 45, maxSpd: 65, turnRate: 4, accel: 1.5, route: roadNorth, wpIdx: 1 },
      { name: 'Car 3', type: 'Car', force: 'white', x: 9, y: 30, hdg: 180, spd: 60, maxSpd: 100, turnRate: 6, accel: 3, route: roadSouth, wpIdx: 1 },
      { name: 'Truck 9', type: 'Truck', force: 'white', x: 9, y: 2, hdg: 180, spd: 45, maxSpd: 65, turnRate: 4, accel: 1.5, route: roadSouth, wpIdx: 1 }
    ],

    spawn: {
      red:    { name: 'R-AV', type: 'Armoured vehicle', x: -10, y: 0, hdg: 90, spd: 40, maxSpd: 80, turnRate: 5, accel: 2, temperament: 1.5, patrolSpd: 25, patrol: [[-6, 3], [-6, -3]] },
      black:  { name: 'B-TK', type: 'Militia technical', x: 24, y: -8, hdg: 270, spd: 30, maxSpd: 60, turnRate: 5, accel: 2, temperament: 1.3, patrolSpd: 15, patrol: [[20, -6], [18, 4]] },
      bandit: { name: 'BND', type: 'Technical', x: 30, y: -26, hdg: 270, spd: 40, maxSpd: 80, turnRate: 6, accel: 3, temperament: 1.3, patrolSpd: 15, patrol: [[26, -24], [23, -28]] },
      white:  { name: 'Car', type: 'Car', x: 8, y: -44, hdg: 0, spd: 60, maxSpd: 100, turnRate: 6, accel: 3, route: roadNorth, wpIdx: 1 }
    }
  });
})();
