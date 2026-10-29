// Scenario: Blue force (Singapore) transits a strait between Red force waters (west) and a Black force
// claimed reef (east), sharing the sea lanes with neutral merchant shipping, with a pirate group to the south-east.
// Coordinates are nautical miles from the map centre (x east, y north). Countries other than Blue are not named.
(function () {
  const lanePointsNorth = [[16, -96], [17, 0], [16, 96]];
  const lanePointsSouth = [[24, 96], [23, 0], [24, -96]];

  CGF.registerScenario({
    id: 'strait-transit',
    view: { half: 72, grid: 10 },   // the map is twice the original size
    name: 'Strait transit (Red, Black, pirates, neutral shipping)',
    shortName: 'Strait transit',
    domain: 'sea',
    brief: {
      objective: 'BLUE-1 transits north to the Exit point.',
      situation: ['Red holds the western coast.', 'Black claims the reef to the east.', 'Pirates operate to the south-east.', 'Merchant ships use both sea lanes.'],
      constraints: 'Keep the sea lanes open. Avoid escalation.'
    },

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

    ownShip: { name: 'BLUE-1 (RSN)', force: 'blue', x: 20, y: -64, hdg: 0, spd: 14, maxSpd: 30, turnRate: 0.8, accel: 0.12 },
    objective: { x: 20, y: 64, name: 'Exit point' },

    land: [
      { name: 'Red force', owner: 'red', poly: [[-96, -96], [-44, -96], [-36, -30], [-12, 0], [-36, 30], [-44, 96], [-96, 96]] },
      { name: 'Black reef', owner: 'black', poly: [[42, 0], [48, -2], [50, 4], [44, 8]] }
    ],
    zones: [
      { name: 'Red territorial waters', kind: 'territorial', owner: 'red',
        poly: [[-96, -96], [-32, -96], [-24, -30], [0, 0], [-24, 30], [-32, 96], [-96, 96]] },
      { name: 'Red contiguous zone', kind: 'contiguous', owner: 'red',
        poly: [[-96, -96], [-20, -96], [-12, -30], [12, 0], [-12, 30], [-20, 96], [-96, 96]] },
      { name: 'Black claimed reef waters', kind: 'territorial', owner: 'black',
        poly: [[34, -8], [56, -8], [56, 16], [34, 16]] },
      { name: 'Black claimed fishing zone', kind: 'contiguous', owner: 'black',
        poly: [[26, -18], [64, -18], [64, 26], [26, 26]] }
    ],
    lanes: [
      { name: 'SLOC northbound', label: 'SLOC', labelAt: [16, -80], points: lanePointsNorth },
      { name: 'SLOC southbound', points: lanePointsSouth }
    ],

    units: [
      // Red force
      { name: 'R-11', type: 'Frigate', force: 'red', x: -2, y: 12, hdg: 180, spd: 10, maxSpd: 28, turnRate: 1.0, temperament: 1.0, patrolSpd: 10, patrol: [[-2, 18], [-2, -18]] },
      { name: 'R-21', type: 'Fast patrol boat', force: 'red', x: -16, y: -32, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-16, -32], [-4, -44], [-20, -52]] },
      { name: 'R-22', type: 'Fast patrol boat', force: 'red', x: -16, y: 32, hdg: 90, spd: 12, maxSpd: 38, turnRate: 2.5, temperament: 1.4, patrolSpd: 14, patrol: [[-16, 32], [-4, 44], [-20, 52]] },
      // Black force
      { name: 'B-31', type: 'Coast guard cutter', force: 'black', x: 32, y: 8, hdg: 180, spd: 10, maxSpd: 24, turnRate: 1.5, temperament: 1.1, patrolSpd: 10, patrol: [[32, 20], [32, -8]] },
      { name: 'B-41', type: 'Militia vessel', force: 'black', x: 38, y: -6, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[38, -6], [36, 12]] },
      { name: 'B-42', type: 'Militia vessel', force: 'black', x: 52, y: 12, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[52, 12], [40, 18]] },
      { name: 'B-43', type: 'Militia vessel', force: 'black', x: 54, y: -4, hdg: 0, spd: 6, maxSpd: 14, turnRate: 2, temperament: 1.2, patrolSpd: 6, patrol: [[54, -4], [48, -12]] },
      // Pirate group (non-state): skiffs loitering east of the lanes, preying on slow ships
      { name: 'Skiff 1', type: 'Skiff', force: 'pirate', x: 60, y: -48, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.1, patrolSpd: 6, patrol: [[60, -48], [52, -60]] },
      { name: 'Skiff 2', type: 'Skiff', force: 'pirate', x: 66, y: -32, hdg: 270, spd: 6, maxSpd: 32, turnRate: 4, temperament: 1.0, patrolSpd: 6, patrol: [[66, -32], [58, -40]] },
      // Neutral shipping on the sea lanes
      { name: 'MV Orion Star', type: 'Container ship', force: 'white', x: 16, y: -80, hdg: 0, spd: 14, maxSpd: 20, route: lanePointsNorth, wpIdx: 1 },
      { name: 'MT Halcyon', type: 'Tanker', force: 'white', x: 16.6, y: -24, hdg: 0, spd: 12, maxSpd: 16, route: lanePointsNorth, wpIdx: 1 },
      { name: 'MV Aster', type: 'Bulk carrier', force: 'white', x: 16.6, y: 36, hdg: 0, spd: 13, maxSpd: 17, route: lanePointsNorth, wpIdx: 2 },
      { name: 'MV Kaya', type: 'Container ship', force: 'white', x: 24, y: 76, hdg: 180, spd: 15, maxSpd: 21, route: lanePointsSouth, wpIdx: 1 },
      { name: 'MV Lumen', type: 'Ro-ro', force: 'white', x: 23.4, y: 12, hdg: 180, spd: 14, maxSpd: 20, route: lanePointsSouth, wpIdx: 1 }
    ],

    // Templates the instructor's "Spawn" inject uses, per force
    spawn: {
      red:   { name: 'R-PB', type: 'Fast patrol boat', x: -10, y: 2, hdg: 90, spd: 20, maxSpd: 38, turnRate: 2.5, temperament: 1.5, patrolSpd: 14, patrol: [[-6, 6], [-6, -6]] },
      black: { name: 'B-MV', type: 'Militia vessel', x: 48, y: -12, hdg: 270, spd: 10, maxSpd: 14, turnRate: 2, temperament: 1.3, patrolSpd: 6, patrol: [[40, -12], [36, 8]] },
      pirate: { name: 'Skiff', type: 'Skiff', x: 68, y: -56, hdg: 270, spd: 20, maxSpd: 32, turnRate: 4, temperament: 1.3, patrolSpd: 8, patrol: [[56, -52], [48, -60]] },
      white: { name: 'MV', type: 'Merchant', x: 16, y: -92, hdg: 0, spd: 13, maxSpd: 18, route: lanePointsNorth, wpIdx: 1 }
    }
  });
})();
