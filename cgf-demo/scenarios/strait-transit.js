// Scenario: Blue force (Singapore) transits a strait between Red force waters (west) and a Black force
// claimed reef (east), sharing the sea lanes with neutral merchant shipping, with a pirate group to the south-east.
// Coordinates are nautical miles from the map centre (x east, y north). Countries other than Blue are not named.
(function () {
  const lanePointsNorth = [[8, -48], [8.5, 0], [8, 48]];
  const lanePointsSouth = [[12, 48], [11.5, 0], [12, -48]];

  CGF.registerScenario({
    id: 'strait-transit',
    name: 'Strait transit (Red, Black, pirates, neutral shipping)',
    brief: 'BLUE-1 transits north to the exit point. Red force holds the western coast; Black force claims the reef to the east; a pirate group operates to the south-east. Keep the sea lanes open and avoid escalation.',

    // Every side taking part. "harness" = the behaviour each non-Blue force starts with (swappable live).
    // kind: state | non-state | civil (a force only accepts harnesses of its own kind).
    // tag: prefix on map labels. color: the force's zones, legend and log entries. Unit symbols use
    // standard-identity colours (friend / hostile / suspect / neutral) set by the harness, per MIL-STD-2525 / APP-6.
    forces: {
      blue:   { label: 'Blue force (Singapore)', tag: 'BLU', kind: 'state', color: '#00a8dc' },
      red:    { label: 'Red force', tag: 'RED', kind: 'state', color: '#ff3031', harness: 'hostile-state' },
      black:  { label: 'Black force', tag: 'BLK', kind: 'state', color: '#b8bec6', harness: 'grey-zone' },
      pirate: { label: 'Pirate group', tag: 'PIR', kind: 'non-state', color: '#ff9f1c', harness: 'raiders' },
      white:  { label: 'Neutral shipping', tag: 'MER', kind: 'civil', color: '#00e200', harness: 'civil-traffic' }
    },

    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 10, y: -32, hdg: 0, spd: 14, maxSpd: 30, turnRate: 0.8, accel: 0.12 },
    objective: { x: 10, y: 32, name: 'Exit point' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-48, -48], [-22, -48], [-18, -15], [-6, 0], [-18, 15], [-22, 48], [-48, 48]] },
      { name: 'Black reef', owner: 'black', poly: [[21, 0], [24, -1], [25, 2], [22, 4]] }
    ],
    zones: [
      { name: 'Red territorial waters', kind: 'territorial', owner: 'red',
        poly: [[-48, -48], [-16, -48], [-12, -15], [0, 0], [-12, 15], [-16, 48], [-48, 48]] },
      { name: 'Red contiguous zone', kind: 'contiguous', owner: 'red',
        poly: [[-48, -48], [-10, -48], [-6, -15], [6, 0], [-6, 15], [-10, 48], [-48, 48]] },
      { name: 'Black claimed reef waters', kind: 'territorial', owner: 'black',
        poly: [[17, -4], [28, -4], [28, 8], [17, 8]] },
      { name: 'Black claimed fishing zone', kind: 'contiguous', owner: 'black',
        poly: [[13, -9], [32, -9], [32, 13], [13, 13]] }
    ],
    lanes: [
      { name: 'SLOC northbound', label: 'SLOC', labelAt: [8, -40], points: lanePointsNorth },
      { name: 'SLOC southbound', points: lanePointsSouth }
    ],

    units: [
      // Red force
      { name: 'R-11', type: 'Frigate', force: 'red', x: -1, y: 6, hdg: 180, spd: 10, maxSpd: 28, turnRate: 1.0, temperament: 1.0, patrolSpd: 10, patrol: [[-1, 9], [-1, -9]] },
      { name: 'R-21', type: 'Fast patrol boat', force: 'red', x: -8, y: -16, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-8, -16], [-2, -22], [-10, -26]] },
      { name: 'R-22', type: 'Fast patrol boat', force: 'red', x: -8, y: 16, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-8, 16], [-2, 22], [-10, 26]] },
      // Black force
      { name: 'B-31', type: 'Coast guard cutter', force: 'black', x: 16, y: 4, hdg: 180, spd: 10, maxSpd: 24, turnRate: 1.5, temperament: 1.1, patrolSpd: 10, patrol: [[16, 10], [16, -4]] },
      { name: 'B-41', type: 'Militia vessel', force: 'black', x: 19, y: -3, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[19, -3], [18, 6]] },
      { name: 'B-42', type: 'Militia vessel', force: 'black', x: 26, y: 6, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[26, 6], [20, 9]] },
      { name: 'B-43', type: 'Militia vessel', force: 'black', x: 27, y: -2, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[27, -2], [24, -6]] },
      // Pirate group (non-state): skiffs loitering east of the lanes, preying on slow ships
      { name: 'Skiff 1', type: 'Skiff', force: 'pirate', x: 30, y: -24, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.1, patrolSpd: 6, patrol: [[30, -24], [26, -30]] },
      { name: 'Skiff 2', type: 'Skiff', force: 'pirate', x: 33, y: -16, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.0, patrolSpd: 6, patrol: [[33, -16], [29, -20]] },
      // Neutral shipping on the sea lanes
      { name: 'MV Orion Star', type: 'Container ship', force: 'white', x: 8, y: -40, hdg: 0, spd: 14, maxSpd: 20, route: lanePointsNorth, wpIdx: 1 },
      { name: 'MT Halcyon', type: 'Tanker', force: 'white', x: 8.3, y: -12, hdg: 0, spd: 12, maxSpd: 16, route: lanePointsNorth, wpIdx: 1 },
      { name: 'MV Aster', type: 'Bulk carrier', force: 'white', x: 8.3, y: 18, hdg: 0, spd: 13, maxSpd: 17, route: lanePointsNorth, wpIdx: 2 },
      { name: 'MV Kaya', type: 'Container ship', force: 'white', x: 12, y: 38, hdg: 180, spd: 15, maxSpd: 21, route: lanePointsSouth, wpIdx: 1 },
      { name: 'MV Lumen', type: 'Ro-ro', force: 'white', x: 11.7, y: 6, hdg: 180, spd: 14, maxSpd: 20, route: lanePointsSouth, wpIdx: 1 }
    ],

    // Templates the instructor's "Spawn" inject uses, per force
    spawn: {
      red:   { name: 'R-PB', type: 'Fast patrol boat', x: -5, y: 1, hdg: 90, spd: 20, maxSpd: 38, turnRate: 2.5, temperament: 1.5, patrolSpd: 14, patrol: [[-3, 3], [-3, -3]] },
      black: { name: 'B-MV', type: 'Militia vessel', x: 24, y: -6, hdg: 270, spd: 10, maxSpd: 14, turnRate: 2, temperament: 1.3, patrolSpd: 6, patrol: [[20, -6], [18, 4]] },
      pirate: { name: 'Skiff', type: 'Skiff', x: 34, y: -28, hdg: 270, spd: 20, maxSpd: 32, turnRate: 4, temperament: 1.3, patrolSpd: 8, patrol: [[28, -26], [24, -30]] },
      white: { name: 'MV', type: 'Merchant', x: 8, y: -46, hdg: 0, spd: 13, maxSpd: 18, route: lanePointsNorth, wpIdx: 1 }
    }
  });
})();
