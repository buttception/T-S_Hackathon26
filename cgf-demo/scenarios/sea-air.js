// Scenario (SEA + AIR): BLUE-1 frigate transits the strait with a friendly BLUE-2 patrol aircraft overhead.
// Red force has ships AND fighters; Black force has militia boats AND a drone; merchant ships follow the
// sea lanes and airliners follow an airway above them. Ships and aircraft of one force share one harness,
// and merchants and airliners share the same civil-traffic harness.
(function () {
  const laneNorth = [[8, -48], [8.5, 0], [8, 48]];
  const laneSouth = [[12, 48], [11.5, 0], [12, -48]];
  const airway = [[-48, -36], [48, 36]];
  const blue2Orbit = [[18, -18], [26, -10], [18, -2], [10, -10], [18, -18]];

  CGF.registerScenario({
    id: 'sea-air',
    name: 'SEA + AIR · Strait transit with air activity',
    domain: 'sea',
    brief: 'BLUE-1 transits north with BLUE-2 (patrol aircraft) overhead. Red force ships and fighters hold the west; Black force boats and a drone claim the reef to the east. Merchant ships below and airliners above share the area. Avoid escalation.',
    terms: { area: 'waters and airspace', ownType: 'warship' },
    view: { half: 40 },

    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:    { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black:  { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      white:  { label: 'Neutral shipping', tag: 'MER', kind: 'civil', color: '#00e200', harness: 'civil-traffic' },
      civair: { label: 'Civil aviation', tag: 'CIV', kind: 'civil', color: '#7dff7d', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 10, y: -32, hdg: 0, spd: 14, maxSpd: 30, turnRate: 0.8, accel: 0.12 },
    objective: { x: 10, y: 32, name: 'Exit point' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-48, -48], [-22, -48], [-18, -15], [-6, 0], [-18, 15], [-22, 48], [-48, 48]] },
      { name: 'Black reef', owner: 'black', poly: [[21, 0], [24, -1], [25, 2], [22, 4]] }
    ],
    zones: [
      { name: 'Red territorial waters and airspace', kind: 'territorial', owner: 'red', poly: [[-48, -48], [-16, -48], [-12, -15], [0, 0], [-12, 15], [-16, 48], [-48, 48]] },
      { name: 'Red contiguous zone', kind: 'contiguous', owner: 'red', poly: [[-48, -48], [-10, -48], [-6, -15], [6, 0], [-6, 15], [-10, 48], [-48, 48]] },
      { name: 'Black claimed reef waters', kind: 'territorial', owner: 'black', poly: [[17, -4], [28, -4], [28, 8], [17, 8]] },
      { name: 'Black claimed zone', kind: 'contiguous', owner: 'black', poly: [[13, -9], [32, -9], [32, 13], [13, 13]] }
    ],
    lanes: [
      { name: 'SLOC northbound', label: 'SLOC', labelAt: [8, -40], points: laneNorth },
      { name: 'SLOC southbound', points: laneSouth },
      { name: 'Airway', label: 'Airway', labelAt: [-40, -30], style: 'air', points: airway }
    ],

    units: [
      // Blue force: friendly patrol aircraft orbiting overhead (no harness, so it just flies its route)
      { name: 'BLUE-2 (RSAF)', type: 'Maritime patrol aircraft', force: 'blue', domain: 'air', x: 18, y: -18, hdg: 45, spd: 220, maxSpd: 300, minSpd: 150, turnRate: 4, accel: 5, route: blue2Orbit, wpIdx: 1 },
      // Red force: ships and fighters, one harness
      { name: 'R-11', type: 'Frigate', force: 'red', x: -1, y: 6, hdg: 180, spd: 10, maxSpd: 28, turnRate: 1.0, temperament: 1.0, patrolSpd: 10, patrol: [[-1, 9], [-1, -9]] },
      { name: 'R-21', type: 'Fast patrol boat', force: 'red', x: -8, y: -16, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-8, -16], [-2, -22], [-10, -26]] },
      { name: 'R-F1', type: 'Fighter', force: 'red', domain: 'air', x: -26, y: 10, hdg: 180, spd: 350, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.2, patrolSpd: 350, patrol: [[-26, 20], [-26, -20]] },
      { name: 'R-F2', type: 'Fighter', force: 'red', domain: 'air', x: -32, y: -10, hdg: 0, spd: 350, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.0, patrolSpd: 350, patrol: [[-32, -20], [-32, 20]] },
      // Black force: militia boats and a drone, one harness
      { name: 'B-41', type: 'Militia vessel', force: 'black', x: 19, y: -3, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[19, -3], [18, 6]] },
      { name: 'B-42', type: 'Militia vessel', force: 'black', x: 26, y: 6, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[26, 6], [20, 9]] },
      { name: 'B-U1', type: 'UAV', force: 'black', domain: 'air', x: 24, y: 10, hdg: 180, spd: 90, maxSpd: 150, minSpd: 60, turnRate: 5, accel: 3, temperament: 1.2, patrolSpd: 90, patrol: [[24, 12], [24, -6]] },
      // Merchant ships on the sea lanes
      { name: 'MV Orion Star', type: 'Container ship', force: 'white', x: 8, y: -40, hdg: 0, spd: 14, maxSpd: 20, route: laneNorth, wpIdx: 1 },
      { name: 'MT Halcyon', type: 'Tanker', force: 'white', x: 8.3, y: -12, hdg: 0, spd: 12, maxSpd: 16, route: laneNorth, wpIdx: 1 },
      { name: 'MV Kaya', type: 'Container ship', force: 'white', x: 12, y: 38, hdg: 180, spd: 15, maxSpd: 21, route: laneSouth, wpIdx: 1 },
      { name: 'MV Lumen', type: 'Ro-ro', force: 'white', x: 11.7, y: 6, hdg: 180, spd: 14, maxSpd: 20, route: laneSouth, wpIdx: 1 },
      // Airliners on the airway, same civil-traffic harness as the merchants
      { name: 'AL 101', type: 'Airliner', force: 'civair', domain: 'air', x: -30, y: -22, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 },
      { name: 'AL 215', type: 'Airliner', force: 'civair', domain: 'air', x: 10, y: 8, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 }
    ],

    spawn: {
      red:    { name: 'R-F', type: 'Fighter', domain: 'air', x: -40, y: 0, hdg: 90, spd: 500, maxSpd: 600, minSpd: 250, turnRate: 6, accel: 10, temperament: 1.4, patrolSpd: 350, patrol: [[-20, 10], [-20, -10]] },
      black:  { name: 'B-U', type: 'UAV', domain: 'air', x: 30, y: 0, hdg: 270, spd: 120, maxSpd: 150, minSpd: 60, turnRate: 5, accel: 3, temperament: 1.3, patrolSpd: 90, patrol: [[22, 6], [22, -6]] },
      white:  { name: 'MV', type: 'Merchant', x: 8, y: -46, hdg: 0, spd: 13, maxSpd: 18, route: laneNorth, wpIdx: 1 },
      civair: { name: 'AL', type: 'Airliner', domain: 'air', x: -46, y: -34, hdg: 53, spd: 420, maxSpd: 500, minSpd: 250, turnRate: 3, accel: 3, route: airway, wpIdx: 1 }
    }
  });
})();
