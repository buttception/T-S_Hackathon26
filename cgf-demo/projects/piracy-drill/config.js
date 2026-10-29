// Stand-alone project config: open runtime.html?config=projects/piracy-drill/config.js
// Same engine, a different set of harnesses and scenarios. Paths are relative to runtime.html.
window.CGF_CONFIG = {
  title: 'Anti-Piracy Escort Trainer',
  subtitle: 'Blue force: Singapore',
  plugins: ['plugins/greyzone-tactics.js'],
  harnesses: ['harnesses/raiders.js', 'harnesses/civil-traffic.js', 'harnesses/grey-zone.js'],
  scenarios: ['projects/piracy-drill/scenario.js'],
  defaultScenario: 'piracy-drill',
  demos: ['demos/demos.js'],   // only demos whose scenario is loaded are offered
  params: { timeScale: 60, reaction: 15 }
};
