// Scenario (AIR): a Blue force (Singapore) fighter flies north to a patrol station between Red force
// airspace (west) and a Black force air defence zone (east), with airliners on the airways.
// It reuses exactly the same harness files as the sea and land scenarios. Domain "air" scales the
// harness ranges ×6 and speed thresholds ×20, so "shadow at 6" becomes 36 nm and "high speed" 480 kts.
(function () {
  const airwayNorth = [[50, -500], [50, 500]];
  const airwaySouth = [[110, 500], [110, -500]];

  CGF.registerScenario({
    id: 'airspace-patrol',
    view: { half: 300, grid: 50, rings: [50, 100] },   // the map is twice the original size
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

    ownShip: { name: 'BLUE-1 (RSAF)', force: 'blue', x: 80, y: -320, hdg: 0, spd: 420, maxSpd: 600, turnRate: 4, accel: 8 },
    objective: { x: 80, y: 260, name: 'Patrol station' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-520, -520], [-220, -520], [-180, 0], [-220, 520], [-520, 520]] },
      { name: 'Black island', owner: 'black', poly: [[210, -20], [250, -24], [256, 20], [216, 24]] }
    ],
    zones: [
      { name: 'Red airspace', kind: 'territorial', owner: 'red', poly: [[-520, -520], [-120, -520], [-80, 0], [-120, 520], [-520, 520]] },
      { name: 'Red ADIZ', kind: 'contiguous', owner: 'red', poly: [[-520, -520], [0, -520], [40, 0], [0, 520], [-520, 520]] },
      { name: 'Black claimed airspace', kind: 'territorial', owner: 'black', poly: [[180, -60], [280, -60], [280, 60], [180, 60]] },
      { name: 'Black ADIZ', kind: 'contiguous', owner: 'black', poly: [[140, -120], [340, -120], [340, 120], [140, 120]] }
    ],
    lanes: [
      { name: 'Airway A1', label: 'Airway A1', labelAt: [50, -400], points: airwayNorth },
      { name: 'Airway A2', label: 'Airway A2', labelAt: [110, 400], points: airwaySouth }
    ],

    units: [
      // Red force fighters on combat air patrol (aircraft cannot hover: minSpd makes them orbit)
      { name: 'R-F1', type: 'Fighter', force: 'red', x: -120, y: 80, hdg: 180, spd: 350, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.2, patrolSpd: 350, patrol: [[-120, 100], [-120, -60]] },
      { name: 'R-F2', type: 'Fighter', force: 'red', x: -140, y: -80, hdg: 0, spd: 350, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.0, patrolSpd: 350, patrol: [[-140, -100], [-140, 60]] },
      // Black force drones and a patrol aircraft
      { name: 'B-U1', type: 'UAV', force: 'black', x: 190, y: 40, hdg: 0, spd: 120, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 120, patrol: [[190, 50], [190, -40]] },
      { name: 'B-U2', type: 'UAV', force: 'black', x: 270, y: 40, hdg: 180, spd: 120, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 120, patrol: [[270, 50], [270, -40]] },
      { name: 'B-P1', type: 'Patrol aircraft', force: 'black', x: 230, y: -80, hdg: 90, spd: 250, maxSpd: 320, minSpd: 150, turnRate: 3, accel: 5, temperament: 1.0, patrolSpd: 250, patrol: [[170, -90], [300, -90]] },
      // Airliners on the airways
      { name: 'AL 101', type: 'Airliner', force: 'white', x: 50, y: -400, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 },
      { name: 'AL 215', type: 'Airliner', force: 'white', x: 50, y: 80, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 },
      { name: 'AL 330', type: 'Airliner', force: 'white', x: 110, y: 360, hdg: 180, spd: 460, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwaySouth, wpIdx: 1 },
      { name: 'AL 412', type: 'Airliner', force: 'white', x: 110, y: -120, hdg: 180, spd: 460, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwaySouth, wpIdx: 1 }
    ],

    spawn: {
      red:   { name: 'R-F', type: 'Fighter', x: -240, y: 0, hdg: 90, spd: 500, maxSpd: 650, minSpd: 250, turnRate: 4, accel: 10, temperament: 1.4, patrolSpd: 350, patrol: [[-100, 40], [-100, -40]] },
      black: { name: 'B-U', type: 'UAV', x: 240, y: 0, hdg: 270, spd: 150, maxSpd: 180, minSpd: 70, turnRate: 5, accel: 3, temperament: 1.3, patrolSpd: 120, patrol: [[180, 20], [180, -20]] },
      white: { name: 'AL', type: 'Airliner', x: 50, y: -480, hdg: 0, spd: 450, maxSpd: 520, minSpd: 250, turnRate: 2, accel: 3, route: airwayNorth, wpIdx: 1 }
    }
  });
})();
