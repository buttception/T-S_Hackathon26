// Local LLM instructor prompting. Turns plain-language instructor requests into simulator commands
// using a model running on this machine or the local network (air-gapped): Ollama, or any
// OpenAI-compatible server (llama.cpp server, LM Studio, vLLM).
//
// The model never touches the simulation directly:
//   1. the live scenario is summarised into a context block (units, forces, allowed harnesses, states)
//   2. the model returns JSON commands (schema below)
//   3. every command is validated against the live scenario
//   4. valid commands are shown as a preview and run through the same CGF.inject calls as the buttons
(function () {
  'use strict';
  const CGF = window.CGF;

  const DEFAULTS = { enabled: true, provider: 'ollama', url: 'http://localhost:11434', model: 'qwen2.5:3b', preview: true, fallback: true, timeoutSec: 60 };
  const STORE_KEY = 'cgf-llm-settings';

  function loadSettings() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  const settings = loadSettings();
  function saveSettings() { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* storage unavailable */ } }

  const OPS = ['escalate', 'calm', 'force', 'set_harness', 'spawn', 'radio', 'malfunction', 'repair', 'fog', 'restart', 'load', 'mode'];

  // JSON schema for structured output (Ollama "format"); OpenAI-compatible servers get json_object mode
  const SCHEMA = {
    type: 'object',
    properties: {
      commands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: OPS },
            unit: { type: 'string' }, force: { type: 'string' }, state: { type: 'string' }, harness: { type: 'string' },
            amount: { type: 'number' }, text: { type: 'string' }, id: { type: 'string' }, on: { type: 'boolean' },
            scenario: { type: 'string' }, mode: { type: 'string' }
          },
          required: ['op']
        }
      },
      question: { type: 'string' }
    },
    required: ['commands']
  };

  // ------------------------------------------------------------ prompt
  function buildContext() {
    const S = CGF.scenario, sim = CGF.sim;
    const forces = Object.entries(S.forces).filter(([k]) => k !== S.ownShip.force).map(([k, f]) => {
      const H = sim.forceHarness[k];
      return `- ${k} (tag ${f.tag}, "${f.label}", ${f.kind}): current harness ${H ? H.id : 'none'}; allowed harnesses: ${CGF.harnessesFor(k).map(h => `${h.id} ("${h.name}")`).join(', ') || 'none'}${S.spawn[k] ? '; can spawn' : ''}`;
    });
    const units = CGF.cgfs().map(u => {
      const H = CGF.harnessOf(u);
      return `- ${u.name}: ${u.type || ''}, force ${u.force}, ${CGF.domainOf(u)}, state "${CGF.stateOf(u).name}" (tension ${Math.round(u.tension)}); states: ${H.states.map(s => s.name).join(' > ')}`;
    });
    return [
      `Scenario: ${S.id} (${S.name}). Domain: ${S.domain}. Trainee: ${sim.own.name}. Mode: ${sim.mode}.`,
      `Forces:`, ...forces,
      `Units:`, ...units,
      `Malfunction ids: ${CGF.malfunctions.map(m => `${m.id} (${m.label})`).join(', ')}.`,
      `Scenario ids for "load": ${Object.values(CGF.scenarios).map(s => `${s.id} ("${s.name}")`).join(', ')}.`
    ].join('\n');
  }

  function systemPrompt() {
    return `You convert a military training instructor's request into JSON commands for a training simulator.
Reply with JSON only, in the form {"commands":[...]} where each command is one of:
  {"op":"escalate","unit":"<unit>","amount":25}        make a unit more aggressive (amount 10-50, default 25)
  {"op":"calm","unit":"<unit>","amount":25}            make a unit less aggressive
  {"op":"force","unit":"<unit>","state":"<state>"}     put a unit straight into one of ITS states
  {"op":"set_harness","force":"<force key>","harness":"<harness id>"}   change how a whole force behaves
  {"op":"spawn","force":"<force key>"}                 bring in a new unit for that force
  {"op":"radio","unit":"<unit>","text":"<message>"}    radio demand the trainee must answer
  {"op":"malfunction","id":"<malfunction id>","on":true}   ownship fault
  {"op":"repair"}                                      clear all malfunctions
  {"op":"fog","on":true}                               fog on (false = clear)
  {"op":"restart"}                                     restart the scenario
  {"op":"load","scenario":"<scenario id>"}             switch scenario
  {"op":"mode","mode":"freeplay"|"exercise"}
Rules:
- Use ONLY unit names, force keys, state names, harness ids, malfunction ids and scenario ids from the CONTEXT.
- A force can only use its allowed harnesses. "Red jets" means Red units of type Fighter; apply a request to every unit it describes.
- Several requests in one sentence become several commands, in order.
- If the request is unclear or impossible, return {"commands":[],"question":"<short question for the instructor>"}.
Example: "make the red jets a bit more aggressive and have the black drone get in the way"
-> {"commands":[{"op":"escalate","unit":"R-F1","amount":25},{"op":"escalate","unit":"R-F2","amount":25},{"op":"force","unit":"B-U1","state":"Block"}]}
Example: "red should back off and be friendly now"
-> {"commands":[{"op":"set_harness","force":"red","harness":"non-hostile-state"}]}`;
  }

  // ------------------------------------------------------------ model call
  async function post(url, body, signal) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  async function chat(messages, schema) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), settings.timeoutSec * 1000);
    const base = settings.url.replace(/\/+$/, '');
    try {
      if (settings.provider === 'ollama') {
        const r = await post(`${base}/api/chat`, { model: settings.model, messages, stream: false, format: schema || SCHEMA, options: { temperature: 0.1 } }, ctrl.signal);
        return r.message && r.message.content;
      }
      const body = { model: settings.model, messages, temperature: 0.1, response_format: { type: 'json_object' } };
      let r;
      try { r = await post(`${base}/v1/chat/completions`, body, ctrl.signal); }
      catch (e) { if (!/HTTP 4\d\d/.test(e.message)) throw e; delete body.response_format; r = await post(`${base}/v1/chat/completions`, body, ctrl.signal); }
      return r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error(`no answer from the model within ${settings.timeoutSec} s`);
      if (e instanceof TypeError) throw new Error(`cannot reach ${base} (is the model server running, and does it allow this page's origin?)`);
      throw e;
    } finally { clearTimeout(timer); }
  }

  function parseJson(text) {
    if (!text) throw new Error('empty reply from the model');
    try { return JSON.parse(text); }
    catch (e) {
      const m = String(text).match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('the model did not reply with JSON');
    }
  }

  // ------------------------------------------------------------ validation against the live scenario
  const norm = s => String(s || '').toLowerCase().replace(/[\s_-]+/g, '');
  const findUnit = name => CGF.cgfs().find(u => norm(u.name) === norm(name));
  function findForce(key) {
    const S = CGF.scenario, n = norm(key);
    return Object.keys(S.forces).find(k => k !== S.ownShip.force && (norm(k) === n || norm(S.forces[k].tag) === n || norm(S.forces[k].label) === n)) || null;
  }
  function findHarnessFor(force, h) {
    const n = norm(h);
    return CGF.harnessesFor(force).find(x => norm(x.id) === n || norm(x.name) === n) || null;
  }
  function findScenario(s) {
    const n = norm(s);
    return Object.values(CGF.scenarios).find(x => norm(x.id) === n || norm(x.name) === n) || null;
  }

  // Returns { ok, text (human readable), run() } for one command
  function check(c) {
    const bad = why => ({ ok: false, text: `${c.op || '?'}: ${why}` });
    if (!c || OPS.indexOf(c.op) < 0) return bad(`unknown operation "${c && c.op}"`);
    const amount = Math.max(5, Math.min(60, Number(c.amount) || 25));
    switch (c.op) {
      case 'escalate': case 'calm': {
        const u = findUnit(c.unit); if (!u) return bad(`no unit "${c.unit}"`);
        return { ok: true, text: `${c.op === 'escalate' ? 'Escalate' : 'Calm'} ${u.name} by ${amount}`, run: () => CGF.inject.adjust(u, c.op === 'escalate' ? amount : -amount) };
      }
      case 'force': {
        const u = findUnit(c.unit); if (!u) return bad(`no unit "${c.unit}"`);
        const st = CGF.harnessOf(u).states.find(s => norm(s.name) === norm(c.state));
        if (!st) return bad(`${u.name} has no state "${c.state}"`);
        return { ok: true, text: `Force ${u.name} to "${st.name}"`, run: () => CGF.inject.force(u, st.name) };
      }
      case 'set_harness': {
        const f = findForce(c.force); if (!f) return bad(`no force "${c.force}"`);
        const h = findHarnessFor(f, c.harness); if (!h) return bad(`"${c.harness}" is not an allowed harness for ${CGF.scenario.forces[f].label}`);
        return { ok: true, text: `Set ${CGF.scenario.forces[f].label} to "${h.name}"`, run: () => CGF.inject.setForceHarness(f, h.id) };
      }
      case 'spawn': {
        const f = findForce(c.force); if (!f) return bad(`no force "${c.force}"`);
        if (!CGF.scenario.spawn[f]) return bad(`no spawn template for ${CGF.scenario.forces[f].label}`);
        return { ok: true, text: `Spawn a ${CGF.scenario.forces[f].label} unit`, run: () => CGF.inject.spawn(f) };
      }
      case 'radio': {
        const u = findUnit(c.unit); if (!u) return bad(`no unit "${c.unit}"`);
        const text = String(c.text || '').slice(0, 200);
        return { ok: true, text: `${u.name} radio demand: "${text || 'default warning'}"`, run: () => CGF.inject.radio(u, text) };
      }
      case 'malfunction': {
        const m = CGF.malfunctions.find(x => norm(x.id) === norm(c.id) || norm(x.label) === norm(c.id));
        if (!m) return bad(`no malfunction "${c.id}"`);
        const on = c.on !== false;
        return { ok: true, text: `${on ? 'Inject' : 'Repair'} malfunction: ${m.label}`, run: () => CGF.inject.malfunction(m.id, on) };
      }
      case 'repair': return { ok: true, text: 'Repair all malfunctions', run: () => CGF.inject.repairAll() };
      case 'fog': { const on = c.on !== false; return { ok: true, text: on ? 'Fog on' : 'Clear fog', run: () => CGF.inject.fog(on) }; }
      case 'restart': return { ok: true, text: 'Restart the scenario (harness choices kept)', run: () => CGF.ui.restartScenario() };
      case 'load': {
        const s = findScenario(c.scenario); if (!s) return bad(`no scenario "${c.scenario}"`);
        return { ok: true, text: `Load scenario "${s.name}"`, run: () => CGF.ui.loadScenario(s.id) };
      }
      case 'mode': {
        const mode = norm(c.mode) === 'freeplay' ? 'freeplay' : norm(c.mode) === 'exercise' ? 'exercise' : null;
        if (!mode) return bad(`unknown mode "${c.mode}"`);
        return { ok: true, text: `Switch to ${mode}`, run: () => CGF.inject.setMode(mode) };
      }
    }
    return bad('not supported');
  }

  // ------------------------------------------------------------ public API
  // interpret(text) -> { plan: [{ok, text, run}], question, raw, ms }
  async function interpret(text) {
    const t0 = performance.now();
    const content = await chat([
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: `CONTEXT:\n${buildContext()}\n\nINSTRUCTOR REQUEST: ${text}` }
    ]);
    const parsed = parseJson(content);
    const cmds = Array.isArray(parsed.commands) ? parsed.commands : [];
    return { plan: cmds.map(check), question: parsed.question || '', raw: content, ms: Math.round(performance.now() - t0) };
  }

  // Applies the valid steps of a plan, in order. Commands after a "load" or "restart" still resolve
  // against the units that existed when the plan was made, so those two are best used last.
  function apply(plan, source) {
    const ok = plan.filter(p => p.ok);
    for (const p of ok) p.run();
    CGF.log(`LLM commands applied (${ok.length}${plan.length > ok.length ? ` of ${plan.length}` : ''})${source ? ' · ' + source : ''}`, 'instr');
    return ok.length;
  }

  // Lists the models the server has, to check the connection
  async function test() {
    const base = settings.url.replace(/\/+$/, '');
    const url = settings.provider === 'ollama' ? `${base}/api/tags` : `${base}/v1/models`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const j = await res.json();
    return (j.models || j.data || []).map(m => m.name || m.id);
  }

  // Generic JSON call for other features (steering directives, rephrased reasons). The caller validates the result.
  const chatJson = async (system, user, schema) =>
    parseJson(await chat([{ role: 'system', content: system }, { role: 'user', content: user }], schema));

  CGF.llm = { settings, saveSettings, interpret, apply, test, buildContext, systemPrompt, check, chatJson };
})();
