// Project configuration. The engine in js/ is shared; a project is just this list of files.
// Paths are relative to index.html. Use another project's config with index.html?config=projects/<name>/config.js
window.CGF_CONFIG = {
  title: 'CGF Maritime Trainer',
  subtitle: 'Blue force: Singapore',

  // Extra behaviours / factors / malfunctions. Load before the harnesses that use them.
  plugins: [
    'plugins/greyzone-tactics.js'
  ],

  // Behaviour profiles a force can use (switchable live from the Instructor tab)
  harnesses: [
    'harnesses/hostile-navy.js',
    'harnesses/non-hostile-navy.js',
    'harnesses/grey-zone.js',
    'harnesses/piracy.js',
    'harnesses/civil-shipping.js'
  ],

  // Maps, forces and units
  scenarios: [
    'scenarios/strait-transit.js',
    'projects/piracy-drill/scenario.js'
  ],
  defaultScenario: 'strait-transit',

  // Hands-off demo scripts (Play demo button, or index.html?demo=tour&loop=1)
  demos: [
    'demos/demos.js'
  ],

  // Starting values for the sliders (optional)
  params: { timeScale: 60, reaction: 30 }
};
