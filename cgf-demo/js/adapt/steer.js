// Instructor steering (PLAN E6 / C7, LANES D4): plain-language text -> a steering directive (INTERFACES §8).
// Text reaches the engine ONLY as a directive that passes validate() (CLAUDE.md invariant 6). Anything that
// fails is shown to the instructor and never applied.
//
//   CGF.adaptSteer.parse(text, crew)        keyword parser, always available (the template fallback)
//   CGF.adaptSteer.interpret(text, crew)    local LLM if enabled, keyword parser otherwise or on failure
//   CGF.adaptSteer.validate(directive, crew) -> errors[]
// crew: the pane's crew [{seat, trainee_id}], so a directive can only name a trainee who is in it.
(function () {
  'use strict';
  const CGF = window.CGF;

  // The catalog (INTERFACES §1) and the competencies that can be steered: those with a tactic (js/adapt/predict.js).
  // The others are not measured by any event yet, so steering toward them could not change anything.
  const COMPETENCIES = window.Adapt.catalog();
  const STEERABLE = Object.keys(window.Adapt.TACTICS);
  const INTENSITIES = ['low', 'medium', 'high'];
  const FIELDS = ['raw_text', 'trainee_id', 'competency', 'intensity', 'duration_s'];
  const DURATION = [30, 1800];   // sim seconds a directive may last
  const DEFAULT_DURATION = 300;

  const WORDS = [
    [/\b(hail|hails|hailing|warning|warnings|radio|acknowledg\w*)\b/, 'hail_discipline'],
    [/\b(collision|collisions|cpa|close quarters|closing|close pass\w*|avoid\w*)\b/, 'collision_avoidance'],
    [/\b(territor\w*|zone|zones|waters|border|incursion\w*)\b/, 'territorial_awareness'],
    [/\b(weapon\w*|fire[- ]?control|fc|radar lock|lock|restraint)\b/, 'weapons_discipline'],
    [/\b(speed|pira\w*|skiff\w*|raider\w*|bandit\w*)\b/, 'speed_management'],
    [/\b(threat\w*)\b/, 'threat_evaluation'],
    [/\b(detect\w*|contact\w*)\b/, 'contact_detection'],
    [/\b(picture|report\w*)\b/, 'picture_reporting'],
    [/\b(escalat\w*|de-?escalat\w*)\b/, 'escalation_control']
  ];

  function validate(d, crew) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return ['directive: must be an object'];
    const errs = Object.keys(d).filter(k => !FIELDS.includes(k)).map(k => `directive: unknown field "${k}"`);
    if (typeof d.raw_text !== 'string' || !d.raw_text.trim()) errs.push('directive.raw_text: required');
    if (!(crew || []).some(m => m.trainee_id === d.trainee_id)) errs.push(`directive.trainee_id: "${d.trainee_id}" is not in this pane's crew`);
    if (!COMPETENCIES.includes(d.competency)) errs.push(`directive.competency: one of ${STEERABLE.join(', ')}`);
    else if (!STEERABLE.includes(d.competency)) errs.push(`directive.competency: "${d.competency}" is not measured by the simulator yet, so it cannot be steered`);
    if (!INTENSITIES.includes(d.intensity)) errs.push(`directive.intensity: one of ${INTENSITIES.join(', ')}`);
    if (!Number.isInteger(d.duration_s) || d.duration_s < DURATION[0] || d.duration_s > DURATION[1]) errs.push(`directive.duration_s: whole seconds, ${DURATION[0]} to ${DURATION[1]}`);
    return errs;
  }

  // "test trainee B's collision avoidance hard for 5 minutes"
  function parse(text, crew) {
    const t = String(text || '').toLowerCase();
    let trainee = null;
    for (const m of crew || []) {
      const id = m.trainee_id, short = id.replace(/^trainee_/, '');
      // a seat counts only as "<seat> seat", so "weapons discipline" does not pick the weapons seat
      if (t.includes(id) || new RegExp(`\\btrainee\\s+${short}\\b`).test(t) || new RegExp(`\\b${m.seat} seat\\b`).test(t)) { trainee = id; break; }
    }
    if (!trainee && crew && crew.length === 1) trainee = crew[0].trainee_id;
    const comp = (WORDS.find(([re]) => re.test(t)) || [])[1] || null;
    const intensity = /\b(hard|harder|high|heavy|really|aggressive\w*|max\w*)\b/.test(t) ? 'high'
      : /\b(gentl\w*|light\w*|low|easy|bit|slight\w*)\b/.test(t) ? 'low' : 'medium';
    const mins = t.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/), secs = t.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/);
    const duration_s = mins ? Math.round(parseFloat(mins[1]) * 60) : secs ? parseInt(secs[1], 10) : DEFAULT_DURATION;
    return { raw_text: String(text || '').trim(), trainee_id: trainee, competency: comp, intensity, duration_s };
  }

  const SCHEMA = {
    type: 'object',
    properties: {
      trainee_id: { type: 'string' }, competency: { type: 'string', enum: STEERABLE },
      intensity: { type: 'string', enum: INTENSITIES }, duration_s: { type: 'integer' }
    },
    required: ['trainee_id', 'competency', 'intensity', 'duration_s']
  };

  function systemPrompt(crew) {
    return `You turn a training instructor's steering request into one JSON directive for an adaptive simulator.
Reply with JSON only: {"trainee_id":"<id>","competency":"<competency>","intensity":"low|medium|high","duration_s":<seconds>}
Crew (seat: trainee_id): ${crew.map(m => `${m.seat}: ${m.trainee_id}`).join(', ')}
Competencies: ${STEERABLE.join(', ')} (the others are not measured yet)
"Trainee B" means trainee_b. Default intensity medium, default duration ${DEFAULT_DURATION} seconds (30 to 1800).`;
  }

  // Returns { directive, errors, via }. A directive with errors must not be applied.
  async function interpret(text, crew) {
    const viaKeywords = () => { const d = parse(text, crew); return { directive: d, errors: validate(d, crew), via: 'keyword parser' }; };
    const S = CGF.llm && CGF.llm.settings;
    if (!S || !S.enabled) return viaKeywords();
    try {
      const r = await CGF.llm.chatJson(systemPrompt(crew), String(text), SCHEMA);
      const d = { raw_text: String(text).trim(), trainee_id: r.trainee_id, competency: r.competency, intensity: r.intensity, duration_s: r.duration_s };
      const errors = validate(d, crew);
      if (!errors.length) return { directive: d, errors, via: `local LLM (${S.model})` };
      const k = viaKeywords();
      return k.errors.length ? { directive: d, errors, via: `local LLM (${S.model})` } : Object.assign(k, { via: 'keyword parser (the model\'s answer failed validation)' });
    } catch (e) {
      return Object.assign(viaKeywords(), { via: `keyword parser (model unavailable: ${e.message})` });
    }
  }

  CGF.adaptSteer = { FIELDS, COMPETENCIES, INTENSITIES, DURATION, parse, validate, interpret, systemPrompt };
})();
