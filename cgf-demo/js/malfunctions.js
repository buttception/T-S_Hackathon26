// Ownship malfunctions the instructor can inject. Each one sets "mods" that the engine reads:
//   turnRateMult, maxSpd (kts), radarRangeNm, commsDown, fcStuck, gpsDriftKts [east, north]
// An optional tick(sim, dt) runs every step while the malfunction is active.
// Add your own with CGF.registerMalfunction({ id, label, desc, mods, tick }) in a plugin file.
(function () {
  'use strict';
  const reg = window.CGF.registerMalfunction;
  reg({ id: 'rudder', label: 'Rudder jam',         desc: 'heading locked',                 mods: { turnRateMult: 0 } });
  reg({ id: 'engine', label: 'Engine failure',     desc: 'max 4 kts',                      mods: { maxSpd: 4 } });
  reg({ id: 'radar',  label: 'Radar failure',      desc: 'contacts only within 3 nm',      mods: { radarRangeNm: 3 } });
  reg({ id: 'comms',  label: 'Comms failure',      desc: 'cannot acknowledge hails',       mods: { commsDown: true } });
  reg({ id: 'gps',    label: 'GPS drift',          desc: 'displayed position drifting',    mods: { gpsDriftKts: [7, -4] } });
  reg({ id: 'fc',     label: 'Fire-control stuck', desc: 'radar stuck on nearest contact', mods: { fcStuck: true } });
})();
