// Scripted trainee crews (Sim task S3). Each seat of the pane's crew is driven by an agent profile file
// (trainees/*.js, the path given in the scenario config's crew[].agent_profile). The seat that owns a competency
// (CGF.simEvents.seatFor) makes the decisions that competency is about:
//   hail_discipline        answer warnings (H) or let them go unanswered
//   collision_avoidance    alter course when another vessel's CPA is too close
//   territorial_awareness  steer back out of foreign claimed zones
//   weapons_discipline     switch fire-control radar on an escalating unit, or hold
//   speed_management       speed up when raiders close in
// and the navigation seat (owner of collision_avoidance) follows the profile's route.
// All chance comes from CGF.rng seeded per seat, so a seed replays exactly.
//
// Agent profile (registered with CGF.registerTraineeAgent(path, profile)):
//   { id, label,
//     hail:     { ack: [{ from_s?, after_hails?, p }], delay_s: [min, max], comply_s },
//               probability of acknowledging: the last entry whose conditions hold (sim time reached, and
//               number of hails this crew has already received) wins. After acknowledging, the crew complies:
//               it turns away from the hailing unit for comply_s, then resumes its route
//     nav:      { speed, routes: { <scenario id>: [[x, y], ...] }, start: { <scenario id>: [x, y, hdg] },
//                 cpa_margin, give_way_p, respect_zones | zone_p },
//               start: where the scripted crew begins in that scenario (nearer the action than the ownship's
//               default start, so a short run still meets the CGFs); give_way_p / zone_p: chance of giving way to
//               a close contact / of turning back out of a claimed zone, decided once per encounter or entry
//     weapons:  { fc_misuse_p },                                  chance of locking radar on an escalating unit
//     piracy:   { speed_up_p, sprint } }
//
// AI partner seats (INTERFACES §3.2, LANES D8) have no agent profile: they are played from the allocation's
// agent_params. rates is keyed by the success event of each measured competency; at every opportunity the partner
// takes the success action with that probability. reaction_delay_s is how long it takes to answer a hail.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  CGF.traineeAgents = CGF.traineeAgents || {};
  CGF.registerTraineeAgent = (path, profile) => { CGF.traineeAgents[path] = profile; };

  let A = null; // the running crew

  const DEFAULT = {
    hail: { ack: [{ from_s: 0, p: 0.9 }], delay_s: [10, 40], comply_s: 180 },
    nav: { speed: 16, routes: {}, cpa_margin: 1.5, respect_zones: true },
    weapons: { fc_misuse_p: 0 },
    piracy: { speed_up_p: 0.9, sprint: 26 }
  };
  const part = (profile, key) => Object.assign({}, DEFAULT[key], profile && profile[key]);

  // The probability in force at sim time t after `seen` hails, from a [{from_s?, after_hails?, p}] schedule
  const pAt = (schedule, t, seen) => schedule.reduce((p, s) =>
    ((s.from_s == null || t >= s.from_s) && (s.after_hails == null || (seen || 0) >= s.after_hails) ? s.p : p), schedule[0] ? schedule[0].p : 0);

  // An AI partner seat's behaviour, from the allocation's agent_params (rates by success event type)
  function partnerProfile(params, navFrom) {
    const r = (params && params.rates) || {}, rate = (k, d) => (typeof r[k] === 'number' ? Math.min(1, Math.max(0, r[k])) : d);
    const d = params && typeof params.reaction_delay_s === 'number' ? params.reaction_delay_s : 20;
    return {
      id: 'partner', label: 'AI partner',
      hail: { ack: [{ p: rate('hail_acknowledged', 0.8) }], delay_s: [d, d * 1.5], comply_s: 180 },
      nav: Object.assign({}, navFrom || {}, { give_way_p: rate('safe_passage', 0.9), zone_p: rate('left_territorial', 0.8) }),
      weapons: { fc_misuse_p: 1 - rate('fc_restraint', 0.9) },
      piracy: { speed_up_p: rate('pirate_speed_response', 0.8), sprint: 26 }
    };
  }

  // config: §3 scenario config. Returns the list of agent paths that are not registered (empty when ready).
  function start(config) {
    const trainees = config.crew.filter(c => c.role !== 'partner');
    const missing = trainees.map(c => c.agent_profile).filter(p => !CGF.traineeAgents[p]);
    if (missing.length) return [...new Set(missing)];
    const crew = config.crew, type = config.platform.type;
    // a partner seat that steers follows the same route as the scripted trainees
    const navFrom = (CGF.traineeAgents[(trainees[0] || {}).agent_profile] || {}).nav;
    const profileOf = m => (m.role === 'partner' ? partnerProfile(m.agent_params, navFrom) : CGF.traineeAgents[m.agent_profile]);
    const seatOf = comp => CGF.simEvents.seatFor(comp, crew, type);
    const agentOf = comp => { const m = seatOf(comp); return { seat: m.seat, profile: profileOf(m), rng: rngs[m.seat] }; };
    const rngs = {};
    crew.forEach((c, i) => { rngs[c.seat] = CGF.rng((config.seed * 7919 + (i + 1) * 104729) >>> 0); });
    A = {
      hail: agentOf('hail_discipline'), nav: agentOf('collision_avoidance'), zone: agentOf('territorial_awareness'),
      weapons: agentOf('weapons_discipline'), piracy: agentOf('speed_management'),
      wp: 0, warnings: {}, fcOffAt: null, escalations: {}, sprintUntil: -1, raiders: {}, complyUntil: -1, complyFrom: null,
      inZone: false, zoneTurn: false, giveWay: {}
    };
    // a scripted crew can start nearer the action than the scenario's default ownship start
    const st = (part(A.nav.profile, 'nav').start || {})[CGF.scenario.id];
    if (st) { const o = CGF.sim.own; o.x = st[0]; o.y = st[1]; if (st[2] != null) { o.hdg = st[2]; o.ordHdg = st[2]; } o.track = []; }
    return [];
  }

  function stop() { A = null; }

  function onStep() {
    if (!A || !CGF.sim || CGF.sim.outcome) return;
    const sim = CGF.sim, o = sim.own, t = sim.t, k = CGF.rangeScale(), ss = CGF.speedScale();

    // navigation: follow the route (or head for the objective)
    const nav = part(A.nav.profile, 'nav');
    const route = (nav.routes[CGF.scenario.id] || []).concat(CGF.scenario.objective ? [[CGF.scenario.objective.x, CGF.scenario.objective.y]] : []);
    if (route.length) {
      while (A.wp < route.length - 1 && Math.hypot(route[A.wp][0] - o.x, route[A.wp][1] - o.y) < 1 * k) A.wp++;
      o.ordHdg = Math.round(U.bearing(o, { x: route[A.wp][0], y: route[A.wp][1] }));
    }
    o.ordSpd = Math.min(o.maxSpd, nav.speed * ss);

    // any crew opens the range from a unit that locks fire-control radar on it (whether or not it answered hails)
    const locked = t >= A.complyUntil && CGF.cgfs().find(u => CGF.harnessOf(u).armed && (CGF.stateOf(u) || {}).fcRadar);
    if (locked) { A.complyFrom = locked; A.complyUntil = t + part(A.hail.profile, 'hail').comply_s; }

    // complying with an acknowledged warning: open the range from the unit that hailed, then resume the route
    if (t < A.complyUntil && A.complyFrom) { o.ordHdg = Math.round(U.bearing(A.complyFrom, o)); o.ordSpd = Math.min(o.ordSpd, 14 * ss); }

    // territorial awareness: decide once per entry into a foreign claimed zone whether to turn back out of it
    const zn = part(A.zone.profile, 'nav'), zoneP = zn.zone_p != null ? zn.zone_p : (zn.respect_zones ? 1 : 0);
    const inZone = CGF.zonesAt(o).some(z => z.owner !== o.force);
    if (inZone && !A.inZone) A.zoneTurn = A.zone.rng.chance(zoneP);
    A.inZone = inZone;
    if (inZone && A.zoneTurn) o.ordHdg = U.norm360(o.ordHdg + 45);

    // collision avoidance: give way to starboard when another vessel's CPA is inside the margin (decided once per contact)
    const nv = part(A.nav.profile, 'nav'), margin = nv.cpa_margin * k, giveP = nv.give_way_p != null ? nv.give_way_p : 1;
    for (const u of sim.units) {
      if (CGF.domainOf(u) !== (o.domain || CGF.scenario.domain)) continue;
      const c = U.cpaCalc(o, u), close = c.tcpa > 0 && c.tcpa < 600 && c.cpa < margin;
      if (!close) { delete A.giveWay[u.name]; continue; }
      if (!(u.name in A.giveWay)) A.giveWay[u.name] = A.nav.rng.chance(giveP);
      if (A.giveWay[u.name]) { o.ordHdg = U.norm360(o.ordHdg + 30); break; }
    }

    // piracy response: sprint when raiders start closing in
    const pir = part(A.piracy.profile, 'piracy');
    for (const u of sim.units) {
      if (u.role !== 'cgf' || CGF.scenario.forces[u.force].kind !== 'non-state') continue;
      if (u.stateIdx >= 1 && !A.raiders[u.name]) { A.raiders[u.name] = true; if (A.piracy.rng.chance(pir.speed_up_p)) A.sprintUntil = t + 300; }
      else if (u.stateIdx === 0) A.raiders[u.name] = false;
    }
    if (t < A.sprintUntil) o.ordSpd = Math.min(o.maxSpd, pir.sprint * ss);

    // weapons discipline: lock fire-control on an escalating unit (a lapse), and switch it off a minute later
    const wpn = part(A.weapons.profile, 'weapons');
    for (const u of CGF.cgfs()) {
      if (!CGF.harnessOf(u).armed) continue;
      const hot = CGF.levelOf(u) >= 0.75;
      if (hot && !A.escalations[u.name]) {
        A.escalations[u.name] = true;
        if (!sim.fcTarget && A.weapons.rng.chance(wpn.fc_misuse_p)) { CGF.actions.toggleFc(u); A.fcOffAt = t + 60; }
      } else if (!hot) A.escalations[u.name] = false;
    }
    if (A.fcOffAt != null && t >= A.fcOffAt) { if (sim.fcTarget) CGF.actions.toggleFc(); A.fcOffAt = null; }

    // hail discipline: decide once per warning whether to answer it, then answer after a delay
    const hail = part(A.hail.profile, 'hail');
    for (const u of CGF.cgfs()) {
      if (!u.warnPending) continue;
      const key = `${u.name}@${u.warnTime}`;
      if (!(key in A.warnings)) {
        const seen = Object.keys(A.warnings).length;
        A.warnings[key] = A.hail.rng.chance(pAt(hail.ack, t, seen)) ? t + A.hail.rng.between(hail.delay_s[0], hail.delay_s[1]) : null;
      }
    }
    const due = Object.entries(A.warnings).filter(([, at]) => at != null && t >= at);
    if (due.length) {
      for (const [key] of due) A.warnings[key] = null;
      const hailing = CGF.cgfs().filter(u => u.warnPending);
      if (hailing.length) {
        CGF.actions.acknowledge();
        A.complyFrom = hailing.sort((a, b) => U.dist(a, o) - U.dist(b, o))[0];
        A.complyUntil = t + hail.comply_s;
      }
    }
  }

  CGF.on('sim:step', onStep);
  CGF.on('reset', stop);

  CGF.crewAgent = { start, stop, active: () => !!A, pAt, partnerProfile };
})();
