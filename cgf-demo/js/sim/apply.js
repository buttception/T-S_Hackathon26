// CGF settings (docs/INTERFACES.md §2) and CGF.apply (§10, Sim task S4).
//
// A setting is either a Setup-tab parameter ("aggression", "sensitivity", "reaction_delay_s", "calm_down_rate",
// "detection") or a multiplier on one factor weight ("weight.<factor>", default 1.0). Adjustments change these
// settings only; they never touch a unit's position, the trainee's score or the scenario outcome (invariant 8).
(function () {
  'use strict';
  const CGF = window.CGF;

  // Contract setting name -> CGF.params key (the Setup sliders)
  const PARAMS = { aggression: 'aggression', sensitivity: 'sensitivity', reaction_delay_s: 'reaction', calm_down_rate: 'decay', detection: 'detection' };
  const WEIGHT_RE = /^weight\.([A-Za-z]+)$/;

  const isSetting = s => !!PARAMS[s] || WEIGHT_RE.test(s);

  // force: 'all' or a harness id ("hostile-state"). Parameters are shared by every force in a pane, so a
  // harness-specific parameter change applies to all of them; weights can be set per harness.
  function get(setting, force) {
    if (PARAMS[setting]) return CGF.params[PARAMS[setting]];
    const m = WEIGHT_RE.exec(setting);
    if (!m) return undefined;
    const e = CGF.sim.weightMult && CGF.sim.weightMult[m[1]];
    if (!e) return 1;
    return force && force !== 'all' && e[force] != null ? e[force] : (e.all != null ? e.all : 1);
  }

  function set(setting, value, force) {
    if (PARAMS[setting]) { CGF.params[PARAMS[setting]] = value; return; }
    const m = WEIGHT_RE.exec(setting);
    if (!m) throw new Error(`unknown setting "${setting}"`);
    const sim = CGF.sim;
    sim.weightMult = sim.weightMult || {};
    const e = sim.weightMult[m[1]] = sim.weightMult[m[1]] || {};
    e[force && force !== 'all' ? force : 'all'] = value;
  }

  // Applies §7 adjustment records in order. Each takes effect from the next simulation step.
  function apply(adjustments) {
    const sim = CGF.sim;
    sim.applied = sim.applied || [];
    let paramsChanged = false;
    for (const a of adjustments || []) {
      if (!isSetting(a.setting)) { CGF.log(`Adjustment ${a.adjustment_id}: unknown setting "${a.setting}", ignored.`, 'alert'); continue; }
      set(a.setting, a.new, a.force);
      if (PARAMS[a.setting]) paramsChanged = true;
      sim.applied.push(a);
      const arrow = a.pressure_direction === 'up' ? 'raised' : a.pressure_direction === 'down' ? 'eased' : 'set';
      CGF.record(null, `Adaptation: ${a.setting} ${arrow}`, `${a.old} → ${a.new}${a.clamped ? ' (capped by the envelope)' : ''}`,
        `${a.source === 'instructor_steer' ? 'instructor steering' : 'adaptation'} · ${a.seat || 'pane'} · target ${a.target_competency || 'none'}`);
    }
    if (paramsChanged) CGF.emit('params');   // the Setup sliders follow
    if (adjustments && adjustments.length) CGF.emit('adapt:applied', adjustments);
  }

  CGF.settings = { PARAMS, isSetting, get, set };
  CGF.apply = apply;
})();
