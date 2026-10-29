// Target rule shared by the live policy and the allocation page (INTERFACES §5.1, §10;
// docs/project/request-devin-predict-target.md). Standalone: it needs nothing else loaded, so allocate.html can
// load it on its own. js/adapt/adapt.js calls pickTarget for every seat, so the preview and the live policy cannot
// disagree.
//
//   Adapt.pickTarget(competencies, seatList, catalog) -> { competency, reason }
//   Adapt.predictTarget({ profile, seat, competencies, mode }) -> { competency, mean, evidence, reason, settings }
(function () {
  'use strict';
  const W = window;
  const Adapt = W.Adapt = W.Adapt || {};

  const EVIDENCE_MIN = 8;   // alpha + beta for "enough evidence" (INTERFACES §5)
  const CATALOG = [         // INTERFACES §1, used when contracts/contracts.js is not loaded
    'hail_discipline', 'collision_avoidance', 'territorial_awareness', 'weapons_discipline', 'speed_management',
    'threat_evaluation', 'contact_detection', 'picture_reporting', 'escalation_control'
  ];

  // Competency -> the CGF settings (INTERFACES §2) the rule policy nudges to exercise it (PLAN §7). Competencies that
  // no event measures yet have no tactic. Kept targeted: "aggression" scales every provocation at once, so it would
  // escalate every CGF regardless of the target.
  const TACTICS = {
    hail_discipline:       ['sensitivity', 'weight.ignoredWarning'],
    collision_avoidance:   ['weight.cpa', 'weight.proximity'],
    territorial_awareness: ['weight.territorial', 'weight.contiguous', 'calm_down_rate'],
    weapons_discipline:    ['weight.fcRadar', 'reaction_delay_s'],
    speed_management:      ['detection', 'weight.slowSpeed']
  };

  const catalog = () => (W.CGF && W.CGF.contracts && W.CGF.contracts.COMPETENCIES) || CATALOG;
  const enough = b => !!b && b.alpha + b.beta >= EVIDENCE_MIN;
  const mean = b => b.alpha / (b.alpha + b.beta);

  // competencies: id -> {alpha, beta} (missing ids count as the prior, which never has enough evidence)
  // The weakest with enough evidence among the seat's list; ties go to the one earlier in the list. If none, the
  // same over the whole catalog.
  function pickTarget(competencies, seatList, all) {
    const weakest = list => list.filter(k => enough(competencies[k])).sort((a, b) => mean(competencies[a]) - mean(competencies[b]))[0] || null;
    let k = weakest(seatList || []);
    if (k) return { competency: k, reason: 'weakest_in_seat' };
    k = weakest(all || catalog());
    return k ? { competency: k, reason: 'weakest_overall' } : { competency: null, reason: 'no_evidence' };
  }

  function predictTarget(input) {
    const none = reason => ({ competency: null, mean: null, evidence: 0, reason, settings: [] });
    try {
      if (!input || typeof input !== 'object') return none('no_evidence');
      if (input.mode === 'fixed') return none('fixed_mode');
      const comps = (input.profile && input.profile.competencies) || {};
      const clean = {};
      for (const [k, b] of Object.entries(comps)) {
        if (b && Number.isFinite(b.alpha) && Number.isFinite(b.beta) && b.alpha > 0 && b.beta > 0) clean[k] = { alpha: b.alpha, beta: b.beta };
      }
      const r = pickTarget(clean, Array.isArray(input.competencies) ? input.competencies : [], catalog());
      if (!r.competency) return none(r.reason);
      const b = clean[r.competency];
      return { competency: r.competency, mean: mean(b), evidence: b.alpha + b.beta, reason: r.reason, settings: (TACTICS[r.competency] || []).slice() };
    } catch (e) {
      return none('no_evidence');
    }
  }

  Object.assign(Adapt, { EVIDENCE_MIN, TACTICS, pickTarget, predictTarget, catalog });
})();
