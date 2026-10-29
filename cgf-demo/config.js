// Project configuration. The engine in js/ is shared; a project is just this list of files.
// Paths are relative to index.html. Use another project's config with index.html?config=projects/<name>/config.js
window.CGF_CONFIG = {
  title: 'CGF Trainer',
  subtitle: 'Blue force: Singapore · sea, land and air',

  // Extra behaviours / factors / malfunctions. Load before the harnesses that use them.
  plugins: [
    'plugins/greyzone-tactics.js'
  ],

  // Behaviour profiles a force can use (switchable live). Domain-neutral: the same files drive
  // ships, ground vehicles and aircraft; each scenario scales their ranges and speeds.
  harnesses: [
    'harnesses/hostile-state.js',
    'harnesses/non-hostile-state.js',
    'harnesses/grey-zone.js',
    'harnesses/raiders.js',
    'harnesses/civil-traffic.js'
  ],

  // Maps, forces and units
  scenarios: [
    'scenarios/strait-transit.js',     // sea
    'scenarios/border-patrol.js',      // land
    'scenarios/airspace-patrol.js',    // air
    'scenarios/sea-air.js',            // sea and air together
    'projects/piracy-drill/scenario.js'
  ],
  defaultScenario: 'strait-transit',

  // Hands-off demo scripts (Play demo button, or index.html?demo=harness&loop=1)
  demos: [
    'demos/demos.js'
  ],

  // Starting values for the sliders (optional)
  params: { timeScale: 60, reaction: 30 }
};
