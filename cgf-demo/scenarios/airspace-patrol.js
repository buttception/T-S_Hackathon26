// Scenario (AIR): a Blue force (Singapore) fighter flies north to a patrol station between Red force
// airspace (west) and a Black force air defence zone (east), with airliners on the airways.
// It reuses exactly the same harness files as the sea and land scenarios. Domain "air" scales the
// harness ranges ×6 and speed thresholds ×20, so "shadow at 6" becomes 36 nm and "high speed" 480 kts.
(function () {
  const airwayNorth = [[25, -250], [25, 250]];
  const airwaySouth = [[55, 250], [55, -250]];

  CGF.registerScenario({
    id: 'airspace-patrol',
    name: 'AIR · Airspace patrol',
    domain: 'air',
    brief: 'BLUE-1 flies north to its patrol station. Red force airspace and its air defence identification zone lie to the west; Black force claims an air defence zone around its island to the east. Airliners use the airways. Avoid escalation.',
    terms: { area: 'airspace', ownType: 'aircraft' },

    forces: {
      blue:  { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:   { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black: { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      white: { label: 'Civil aviation', tag: 'CIV', kind: 'civil', color: '#00e200', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (RSAF)', force: 'blue', x: 40, y: -160, hdg: 0, spd: 420, maxSpd: 600, turnRate: 4, accel: 8 },
    objective: { x: 40, y: 130, name: 'Patrol station' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-260, -260], [-110, -260], [-90, 0], [-110, 260], [-260, 260]] },
      { name: 'Black island', owner: 'black', poly: [[105, -10], [125, -12], [128, 10], [108, 12]] }
    ],
    zones: [
      { name: 'Red airspace', kind: 'territorial', owner: 'red', poly: [[-260, -260], [-60, -260], [-40, 0], [-60, 260], [-260, 260]] },
      { name: 'Red ADIZ', kind: 'contiguous', owner: 'red', poly: [[-260, -260], [0, -260], [20, 0], [0, 260], [-260, 260]] },
      { name: 'Black claimed airspace', kind: 'territorial', owner: 'black', poly: [[90, -30], [140, -30], [140, 30], [90, 30]] },
      { name: 'Black ADIZ', kind: 'contiguous', owner: 'black', poly: [[70, -60], [170, -60], [170, 60], [70, 60]] }
    ],
    lanes: [
      { name: 'Airway A1', label: 'Airway A1', labelAt: [25, -200], points: airwayNorth },
      { name: 'Airway A2', label: 'Airway A2', labelAt: [55, 200], points: airwaySouth }
    ],

    units: [
      // Red force fighters on combat air patrol (aircraft cannot hover: minSpd makes them orbit)
      { name: 'R-F1', type: 'Fighter', force: 'red', x: -60, y: 40, hdg: 180, spd: 350, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.2, patrolSpd: 350, patrol: [[-60, 50], [-60, -30]] },
      { name: 'R-F2', type: 'Fighter', force: 'red', x: -70, y: -40, hdg: 0, spd: 350, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.0, patrolSpd: 350, patrol: [[-70, -50], [-70, 30]] },
      // Black force drones and a patrol aircraft
      { name: 'B-U1', type: 'UAV', force: 'black', x: 95, y: 20, hdg: 0, spd: 120, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 120, patrol: [[95, 25], [95, -20]] },
      { name: 'B-U2', type: 'UAV', force: 'black', x: 135, y: 20, hdg: 180, spd: 120, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 120, patrol: [[135, 25], [135, -20]] },
      { name: 'B-P1', type: 'Patrol aircraft', force: 'black', x: 115, y: -40, hdg: 90, spd: 250, maxSpd: 320, minSpd: 150, turnRate: 3, accel: 5, temperament: 1.0, patrolSpd: 250, patrol: [[85, -45], [150, -45]] },
      // Airliners on the airways
      { name: 'AL 101', type: 'Airliner', force: 'white', x: 25, y: -200, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 },
      { name: 'AL 215', type: 'Airliner', force: 'white', x: 25, y: 40, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 },
      { name: 'AL 330', type: 'Airliner', force: 'white', x: 55, y: 180, hdg: 180, spd: 460, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwaySouth, wpIdx: 1 },
      { name: 'AL 412', type: 'Airliner', force: 'white', x: 55, y: -60, hdg: 180, spd: 460, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwaySouth, wpIdx: 1 }
    ],

    spawn: {
      red:   { name: 'R-F', type: 'Fighter', x: -120, y: 0, hdg: 90, spd: 500, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.4, patrolSpd: 350, patrol: [[-50, 20], [-50, -20]] },
      black: { name: 'B-U', type: 'UAV', x: 120, y: 0, hdg: 270, spd: 150, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.3, patrolSpd: 120, patrol: [[90, 10], [90, -10]] },
      white: { name: 'AL', type: 'Airliner', x: 25, y: -240, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 }
    }
  });
})();
