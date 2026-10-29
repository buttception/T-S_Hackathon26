// Cooperating CGFs (LANES D6). The units of one force share a picture and act on it:
//   - shared fix: the last known ownship position, heading and speed, from whichever unit holds contact. A unit
//     that has lost contact steers on that fix (dead-reckoned) instead of on the true position.
//   - shared alerts: when one unit's warning goes unanswered, or a unit escalates to Harass or above, the others
//     in its force are told and raise their own readiness ("escalate together").
//   - coordinated stations: units shadowing or escorting together take different bearings (js/behaviours.js).
// How much of this a force does is its teamwork, 0..1: the harness's value ("teamwork"), overridden per force by
// the instructor (Instructor tab), and scaled live by the "weight.team" setting that adaptation can move with the
// crew's capability (js/adapt/adapt.js). Teamwork 0 is a force of individuals, exactly as before.
// Sharing is information only: it never changes the trainee's score, the outcome, or a unit's position except
// through that unit's own behaviour (invariant 8). No randomness: the same seed gives the same result.
(function () {
  'use strict';
  const CGF = window.CGF, U = CGF.util;

  const FIX_FRESH_S = 300;     // a shared fix older than this (times teamwork) is not used
  const ALERT_BOOST = 15;      // tension a teammate gains from an alert, at teamwork 1 and weight.team 1
  const ALERT_REPEAT_S = 120;  // the same unit does not re-alert its force for the same reason within this time

  const sim = () => CGF.sim;

  // The force's teamwork: instructor override, else the harness's value, else 0
  CGF.teamworkOf = force => {
    const s = sim(), o = s.teamwork && s.teamwork[force];
    if (o != null) return o;
    const H = s.forceHarness[force];
    return H && typeof H.teamwork === 'number' ? H.teamwork : 0;
  };

  // Instructor override (Instructor tab). null clears it, back to the harness's value.
  CGF.setTeamwork = (force, value) => {
    const s = sim();
    s.teamwork = s.teamwork || {};
    if (value == null) delete s.teamwork[force]; else s.teamwork[force] = U.clamp(value, 0, 1);
    const label = (CGF.scenario.forces[force] || {}).label || force;
    CGF.log(`INSTRUCTOR teamwork for ${label}: ${value == null ? 'harness default' : Math.round(CGF.teamworkOf(force) * 100) + '%'}`, 'instr');
    CGF.record(null, 'Teamwork changed', `${label}: ${Math.round(CGF.teamworkOf(force) * 100)}%`, 'instructor');
    CGF.emit('team-config', force);
  };

  function picture(force) {
    const s = sim();
    s.picture = s.picture || {};
    return s.picture[force] = s.picture[force] || { fix: null, by: null, alerts: {} };
  }
  CGF.pictureOf = picture;

  // Where unit u believes the ownship is: the truth if it holds contact itself; else its force's shared fix,
  // dead-reckoned, if teamwork lets it use one; else the truth (a force of individuals behaves as before)
  CGF.perceivedOwn = u => {
    const s = sim(), o = s.own;
    if (u.role !== 'cgf' || U.dist(u, o) <= CGF.detectionRange()) return o;
    const tw = CGF.teamworkOf(u.force), p = s.picture && s.picture[u.force];
    if (!tw || !p || !p.fix) return o;
    const age = s.t - p.fix.t;
    if (age > FIX_FRESH_S * tw) return o;
    const v = U.vel(p.fix);
    return { x: p.fix.x + v.x * age / 3600, y: p.fix.y + v.y * age / 3600, hdg: p.fix.hdg, spd: p.fix.spd, domain: o.domain };
  };

  // Teammates of u that can act on what it shares: armed CGF units of the same force
  const teammates = u => sim().units.filter(v => v !== u && v.force === u.force && v.role === 'cgf' && CGF.harnessOf(v).armed);

  function alertForce(u, reason) {
    const tw = CGF.teamworkOf(u.force);
    if (!tw || !CGF.harnessOf(u) || !CGF.harnessOf(u).armed) return;
    const p = picture(u.force), key = `${u.name}:${reason}`, t = sim().t;
    if (p.alerts[key] != null && t - p.alerts[key] < ALERT_REPEAT_S) return;
    p.alerts[key] = t;
    for (const v of teammates(u)) {
      const boost = Math.round(ALERT_BOOST * tw * CGF.weightMult(v, 'team') * 10) / 10;
      if (boost <= 0) continue;
      v.tension = U.clamp(v.tension + boost, 0, 100);
      CGF.log(`${v.name}: alerted by ${u.name} (${reason}); readiness +${boost}`, 'alert');
      CGF.record(v, 'Joined the response (teamwork)', `${u.name}: ${reason}`, `team · teamwork ${Math.round(tw * 100)}%`);
      CGF.emit('sim:team', { from: u.name, to: v.name, force: u.force, reason, boost, t });
    }
  }

  // Keep the shared fix current from any unit that holds contact
  CGF.on('sim:step', () => {
    const s = sim(); if (!s) return;
    for (const u of s.units) {
      if (u.role !== 'cgf' || !CGF.teamworkOf(u.force) || U.dist(u, s.own) > CGF.detectionRange()) continue;
      const p = picture(u.force);
      p.fix = { x: s.own.x, y: s.own.y, hdg: s.own.hdg, spd: s.own.spd, t: s.t };
      p.by = u.name;
    }
  });
  CGF.on('sim:hail-ignored', u => alertForce(u, 'warning ignored'));
  CGF.on('sim:state', (u, from, to) => { if (to > from && CGF.levelOf(u) >= 0.75) alertForce(u, `escalated to ${CGF.stateOf(u).name}`); });

  CGF.team = { FIX_FRESH_S, ALERT_BOOST, teammates };
})();
