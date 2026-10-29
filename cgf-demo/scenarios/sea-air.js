// Scenario (SEA + AIR): BLUE-1 frigate transits the strait with a friendly BLUE-2 patrol aircraft overhead.
// Red force has ships AND fighters; Black force has militia boats AND a drone; merchant ships follow the
// sea lanes and airliners follow an airway above them. Ships and aircraft of one force share one harness,
// and merchants and airliners share the same civil-traffic harness.
(function () {
  const laneNorth = [[16, -96], [17, 0], [16, 96]];
  const laneSouth = [[24, 96], [23, 0], [24, -96]];
  const airway = [[-96, -72], [96, 72]];
  const blue2Orbit = [[36, -36], [52, -20], [36, -4], [20, -20], [36, -36]];

  CGF.registerScenario({
    id: 'sea-air',
    name: 'SEA + AIR · Strait transit with air activity',
    domain: 'sea',
    brief: 'BLUE-1 transits north with BLUE-2 (patrol aircraft) overhead. Red force ships and fighters hold the west; Black force boats and a drone claim the reef to the east. Merchant ships below and airliners above share the area. Avoid escalation.',
    terms: { area: 'waters and airspace', ownType: 'warship' },
    view: { half: 80, grid: 10 },   // the map is twice the original size

    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:    { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black:  { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      white:  { label: 'Neutral shipping', tag: 'MER', kind: 'civil', color: '#00e200', harness: 'civil-traffic' },
      civair: { label: 'Civil aviation', tag: 'CIV', kind: 'civil', color: '#7dff7d', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 20, y: -64, hdg: 0, spd: 14, maxSpd: 30, turnRate: 0.8, accel: 0.12 },
    objective: { x: 20, y: 64, name: 'Exit point' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-96, -96], [-44, -96], [-36, -30], [-12, 0], [-36, 30], [-44, 96], [-96, 96]] },
      { name: 'Black reef', owner: 'black', poly: [[42, 0], [48, -2], [50, 4], [44, 8]] }
    ],
    zones: [
      { name: 'Red territorial waters and airspace', kind: 'territorial', owner: 'red', poly: [[-96, -96], [-32, -96], [-24, -30], [0, 0], [-24, 30], [-32, 96], [-96, 96]] },
      { name: 'Red contiguous zone', kind: 'contiguous', owner: 'red', poly: [[-96, -96], [-20, -96], [-12, -30], [12, 0], [-12, 30], [-20, 96], [-96, 96]] },
      { name: 'Black claimed reef waters', kind: 'territorial', owner: 'black', poly: [[34, -8], [56, -8], [56, 16], [34, 16]] },
      { name: 'Black claimed zone', kind: 'contiguous', owner: 'black', poly: [[26, -18], [64, -18], [64, 26], [26, 26]] }
    ],
    lanes: [
      { name: 'SLOC northbound', label: 'SLOC', labelAt: [16, -80], points: laneNorth },
      { name: 'SLOC southbound', points: laneSouth },
      { name: 'Airway', label: 'Airway', labelAt: [-80, -60], style: 'air', points: airway }
    ],

    units: [
      // Blue force: friendly patrol aircraft orbiting overhead (no harness, so it just flies its route)
      { name: 'BLUE-2 (RSAF)', type: 'Maritime patrol aircraft', force: 'blue', domain: 'air', x: 36, y: -36, hdg: 45, spd: 220, maxSpd: 300, minSpd: 150, turnRate: 4, accel: 5, route: blue2Orbit, wpIdx: 1 },
      // Red force: ships and fighters, one harness
      { name: 'R-11', type: 'Frigate', force: 'red', x: -2, y: 12, hdg: 180, spd: 10, maxSpd: 28, turnRate: 1.0, temperament: 1.0, patrolSpd: 10, patrol: [[-2, 18], [-2, -18]] },
      { name: 'R-21', type: 'Fast patrol boat', force: 'red', x: -16, y: -32, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-16, -32], [-4, -44], [-20, -52]] },
      { name: 'R-F1', type: 'Fighter', force: 'red', domain: 'air', x: -52, y: 20, hdg: 180, spd: 350, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.2, patrolSpd: 350, patrol: [[-52, 40], [-52, -40]] },
      { name: 'R-F2', type: 'Fighter', force: 'red', domain: 'air', x: -64, y: -20, hdg: 0, spd: 350, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.0, patrolSpd: 350, patrol: [[-64, -40], [-64, 40]] },
      // Black force: militia boats and a drone, one harness
      { name: 'B-41', type: 'Militia vessel', force: 'black', x: 38, y: -6, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[38, -6], [36, 12]] },
      { name: 'B-42', type: 'Militia vessel', force: 'black', x: 52, y: 12, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[52, 12], [40, 18]] },
      { name: 'B-U1', type: 'UAV', force: 'black', domain: 'air', x: 48, y: 20, hdg: 180, spd: 90, maxSpd: 150, minSpd: 60, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 90, patrol: [[48, 24], [48, -12]] },
      // Merchant ships on the sea lanes
      { name: 'MV Orion Star', type: 'Container ship', force: 'white', x: 16, y: -80, hdg: 0, spd: 14, maxSpd: 20, route: laneNorth, wpIdx: 1 },
      { name: 'MT Halcyon', type: 'Tanker', force: 'white', x: 16.6, y: -24, hdg: 0, spd: 12, maxSpd: 16, route: laneNorth, wpIdx: 1 },
      { name: 'MV Kaya', type: 'Container ship', force: 'white', x: 24, y: 76, hdg: 180, spd: 15, maxSpd: 21, route: laneSouth, wpIdx: 1 },
      { name: 'MV Lumen', type: 'Ro-ro', force: 'white', x: 23.4, y: 12, hdg: 180, spd: 14, maxSpd: 20, route: laneSouth, wpIdx: 1 },
      // Airliners on the airway, same civil-traffic harness as the merchants
      { name: 'AL 101', type: 'Airliner', force: 'civair', domain: 'air', x: -60, y: -44, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 },
      { name: 'AL 215', type: 'Airliner', force: 'civair', domain: 'air', x: 20, y: 16, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 }
    ],

    spawn: {
      red:    { name: 'R-F', type: 'Fighter', domain: 'air', x: -80, y: 0, hdg: 90, spd: 500, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.4, patrolSpd: 350, patrol: [[-40, 20], [-40, -20]] },
      black:  { name: 'B-U', type: 'UAV', domain: 'air', x: 60, y: 0, hdg: 270, spd: 120, maxSpd: 150, minSpd: 60, turnRate: 5, accel: 3, temperament: 1.3, patrolSpd: 90, patrol: [[44, 12], [44, -12]] },
      white:  { name: 'MV', type: 'Merchant', x: 16, y: -92, hdg: 0, spd: 13, maxSpd: 18, route: laneNorth, wpIdx: 1 },
      civair: { name: 'AL', type: 'Airliner', domain: 'air', x: -92, y: -68, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 }
    }
  });
})();
