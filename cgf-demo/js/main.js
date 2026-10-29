// Boot: load the project config (config.js, or ?config=path/to/config.js), then its plugins,
// harnesses and scenarios in order, then start the UI and the main loop.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  async function boot() {
    const configPath = new URLSearchParams(location.search).get('config') || 'config.js';
    await U.loadScript(configPath);
    const config = window.CGF_CONFIG;
    if (!config) throw new Error(`${configPath} did not set window.CGF_CONFIG`);

    for (const src of [...(config.plugins || []), ...(config.harnesses || []), ...(config.scenarios || []), ...(config.demos || [])]) {
      try { await U.loadScript(src); }
      catch (err) { console.error(err); }
    }
    Object.assign(CGF.params, config.params || {});

    CGF.ui.init(config);
    const first = config.defaultScenario || Object.keys(CGF.scenarios)[0];
    if (!first) throw new Error('no scenarios loaded; check the "scenarios" list in ' + configPath);
    CGF.loadScenario(first);

    // Hands-off mode: index.html?demo=tour (&loop=1 to repeat for an unattended stand)
    const qs = new URLSearchParams(location.search);
    if (qs.get('demo')) CGF.demo.start(qs.get('demo'), { loop: qs.get('loop') === '1' });

    const canvas = document.getElementById('map');
    let last = performance.now(), lastPanel = 0;
    function frame(now) {
      CGF.tick(Math.min(0.1, (now - last) / 1000));
      CGF.demo.update();
      last = now;
      CGF.render.draw(canvas, { instructor: CGF.ui.isInstructorView() });
      if (now - lastPanel > 200) { lastPanel = now; CGF.ui.refresh(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  boot().catch(err => {
    console.error(err);
    document.getElementById('title').innerHTML = `CGF Trainer <small style="color:#ff9a9a">· failed to start: ${CGF.util.esc(err.message)}</small>`;
  });
})();
