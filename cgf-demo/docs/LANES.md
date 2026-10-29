# Lanes: who works where

Decided 2026-10-29 (JL). Replaces the earlier Lead / Sim / Engine / Console / Design split. Each person works in their own lane with their own Claude Code session. Paths are inside `cgf-demo/`.

## How to start a session

Tell Claude who you are in your first message, for example: "I am Glenda. Work in the Report lane." Claude then reads `CLAUDE.md`, `PLAN.md`, `docs/INTERFACES.md` and this file, and edits only the files in your lane. If your name or lane is missing, Claude must ask before editing anything.

## The flow, and who owns each step

```text
Allocation  ->  Runtime + CGF  ->  End-of-training report  ->  Competency update
 (JL)           (Devin)            (Glenda)                    (JL)
     \_________________ page look and feel (Eevee) ______________/
```

1. **JL** picks the crew and scenario on the allocation page and chooses which seats are trainees and which are AI partners (built from older runs), and hands the `Allocation` to the host page, which sends the one runtime its config (`init`, INTERFACES §11). One crew per run; there are no panes A and B (changed 2026-10-29).
2. **Devin** runs the simulation for that config. The CGFs adapt to what the trainee does, and the instructor can see why.
3. When a run ends, the host passes the **session record** (events, adjustments, outcome) to **Glenda**. She builds the end-of-training report and appends it to the trainee's history.
4. **JL** reads the session record and the report, and updates the trainee's competency profile. The allocation page then shows the new profile.
5. **Eevee** designs how all of it looks and flows. She does not own any logic.

## Lanes

### JL: allocation, hand-off and competency update

Purpose: decide who trains, pass that to the runtime, and learn from the result.

| Owns | Notes |
|---|---|
| `allocate.html`, `js/ui-allocate.js` | Trainee allocation page (built) |
| `host.html`, `link/` (JS and README) | Host page and the allocation-to-runtime link (built) |
| `js/assess/` (new) | Competency estimator and profile update: reads the session record and the report, writes the profile |
| `contracts/`, `fixtures/` (profiles, platforms), `runner/`, `docs/` | Contracts change only through JL |
| `tests/allocate.html`, `tests/link.html`, `tests/assess/` | |

Tasks:

| ID | Task | Acceptance |
|---|---|---|
| J1 | Allocation page and link to the runtime | Built for two panes; **to change** to one crew (J8) |
| J2 | Pass each seat's trainee, profile and envelope to Devin through the `link-init` event, as the config in INTERFACES §3 | Devin's code reads the config; no other channel |
| J3 | Decide the envelope scale and the rule for a crew's weakest competency (open) | Written into INTERFACES §3 and §11 |
| J4 | Competency update (old E1, E2): Beta posterior per competency from the session record and report facts; profile persistence in `localStorage` and seeded fixtures | A fixture session for the weak trainee lowers `hail_discipline`; the profile round-trips |
| J5 | Allocation page reads the saved profile, so the bars move after a run | Bars change after a run |
| J6 | Cohort data and heatmap data (old E8, C8; first to cut) | Matrix for the seeded cohort |
| J7 | **AI partners** (added 2026-10-29): the allocation page lets the instructor mark a seat as `partner` and pick `derived_from` (a trainee and optional sessions); `Assess.partnerParams(derived_from) -> agent_params` computes the partner's success rates per event type from `History.entries`, else from profile means, else a default (INTERFACES §3.2) | A partner seat validates and gets `agent_params`; the same inputs give the same params |
| J8 | **Single crew** (added 2026-10-29): `Allocation` loses `slots` and `pane`; `expandAllocation` returns one config; `host.html` hosts one runtime; `link/` messages drop the pane letter (INTERFACES §3.1, §11); tests updated | Allocation, host and link tests pass for one crew; no reference to pane A or B remains except the `?pane=run` marker |

### Devin: simulation runtime and CGF behaviour

Purpose: run the simulation and adapt the CGFs live, and let the instructor see the reasoning.

| Owns | Notes |
|---|---|
| `runtime.html`, `js/main.js`, `js/engine.js`, `js/factors.js`, `js/llm.js` | Existing runtime |
| `harnesses/`, `scenarios/`, `plugins/`, `projects/`, `demos/`, `trainees/` | Existing content, plus scripted trainees |
| `js/adapt/` | In-run adaptation: policy, envelope clamp, tailoring from the profile, steering |
| `js/sim/`, `tests/runtime/` | Simulation events, scripted crews, applying adjustments, and the runtime tests |
| `js/ui-reasoning.js` (new) | Instructor reasoning panel (see D3 below) |
| `tests/` for the files above | |

Tasks (Sim S1 to S7 keep their meaning from `PLAN.md` §7):

| ID | Task | Acceptance |
|---|---|---|
| D1 | Fixed-step mode, event emission, scripted trainees, `apply`, known engine fixes (S1 to S4, S6) | As `PLAN.md` §7 |
| D2 | Adaptation policy (old E3 to E5): at the start, tailor the CGFs from the seat's profile (picks the competency); during the run, raise or lower pressure from the live success rate; clamp to the envelope; fixed mode makes zero adjustments | Weak-hail trainee's CGFs press hails within two cycles; pressure eases when they improve |
| D3 | **Instructor reasoning panel**: for every raise or lower of difficulty or hostility, show what changed (setting, old, new), the direction, the trainee actions that caused it (the evidence events) and a one-line reason. Reasons come from templates; the LLM may rephrase but never supplies a number | Every adjustment appears with direction, evidence and reason; works with the LLM off |
| D4 | Steering text to a directive (old E6, C7), reusing `js/llm.js` | Invalid parses are rejected, never applied |
| D5 | Emit the **session record** when a run ends (events, adjustments, outcome, seed, config) on the `ended` message path | Glenda and JL consume it without reading runtime internals |
| D6 | **Cooperating CGFs**: units in a force share what they know through a shared picture (last known ownship position and heading, warnings issued, who has been alerted, current target), and act on it. Example: when one unit's warning is ignored, the others in its force know, so they escalate together, shadow from different bearings, or hand the ownship over between units. A unit that loses contact uses the last shared fix | Two units of one force show a coordinated response to one trainee action, visible in the reasoning panel. Same seed gives the same result. Sharing is one-way information; it never changes the trainee's score or a unit's position outside its own behaviour (invariant 8) |
| D7 | **Three signals per CGF, stated together** in the reasoning panel: (a) reaction to the trainee's current actions (exists: tension factors), (b) customisation from the trainee's past training (D2, profile), (c) cooperation with other CGFs (D6). Each adjustment or behaviour change names which of the three caused it | Every entry in the panel carries a cause tag: `live`, `history` or `team` |
| D8 | **Partner agents** (added 2026-10-29): `js/sim/crew-agent.js` plays a `partner` seat from `agent_params` (rates per event type, reaction delay) with the seeded generator; the adaptation policy ignores partner seats (no working copy, no target, no adjustment caused by their events); their events still carry `seat` | A partner seat acts from its params; two runs on one seed give identical events; no adjustment is ever caused by a partner seat |

### Glenda: end-of-training report and trainee history

Purpose: turn a finished session into a report, and keep it so a trainee's context persists.

| Owns | Notes |
|---|---|
| `report.html`, `js/ui-report.js` (new) | Report view for the instructor |
| `js/report/` (new) | Report builder (facts, narrative, validator) |
| `js/history/` (new) | Trainee history store |
| `fixtures/history/` (new) | Seeded history for the demo trainees |
| `tests/report/` | |

Tasks:

| ID | Task | Acceptance |
|---|---|---|
| G1 | Report builder: code computes every figure from the session record (INTERFACES §9 `facts`) | Facts match the record for both demo trainees |
| G2 | Narrative: templates first; the LLM may phrase, never supply numbers; a validator rejects any narrative with a number absent from `facts` | Passes the validator; works with the LLM off |
| G3 | Trainee history store: append one entry per session under `cgf.history.<trainee_id>` (INTERFACES §9.1), with seeded history as `.js` fixtures | History survives a reload; new entries append, never overwrite |
| G4 | Report view: the instructor reads the latest report and the history for a trainee | Opens from the host page after a run |
| G5 | Context for the next session: a short, code-computed summary of recent history that the allocation page (JL) and the runtime (Devin) can read | Returns the last N sessions' weak and strong competencies |

### Eevee: UI/UX design of the whole page

Purpose: one coherent look and flow across the allocation page, host page, runtime, reasoning panel and report.

| Owns | Notes |
|---|---|
| `css/` and every `*.css` file (including `link/host.css`) | Existing styling stays until she restyles it |
| `design/` (new) | Design tokens, layout specs, mockups, a component guide |
| Pitch deck theme | |

Rules for Eevee's sessions:
- She edits CSS and design files only. She does not edit HTML structure or JS. If a layout needs new markup or a class, she writes the request into `design/requests.md` for the owner of that page (JL for allocation and host, Devin for runtime and reasoning panel, Glenda for report).
- The other lanes use the class names and tokens in `design/`, and do not hard-code colours or spacing in their JS or HTML.
- Constraints: readable on a projector, colour never the only carrier of meaning, keep the MIL-STD-2525 / APP-6 symbology, works from `file://`.

Tasks:

| ID | Task | Acceptance |
|---|---|---|
| E1 | Visual system: colour tokens, type scale, spacing, component states, as `css/tokens.css` | Covers every existing page |
| E2 | Layout and flow for the allocation page (trainee and partner seats) and host page (one runtime) | JL can apply it by class names alone |
| E3 | Layout for the instructor reasoning panel | Devin can build D3 from it without open questions |
| E4 | Layout for the report and history view | Glenda can build G4 from it |
| E5 | Pitch deck theme and a polish review of the five back-to-back demo runs | Issues logged to the page owners |

## Hand-offs between lanes (the contracts that matter)

| From to | What | Where defined | Status |
|---|---|---|---|
| JL to Devin | Run config: platform, crew (each seat `trainee` or `partner`, with `agent_params` for partners), per-seat profile, scenario, seed, mode, envelope | INTERFACES §3, §3.2, §11 (`link-init`) | Built for two panes; single crew and partners proposed |
| Glenda to JL | `History.entries(trainee_id) -> entry[]`, so `Assess.partnerParams` can read past runs | INTERFACES §9.1 | Proposed |
| Devin to Glenda and JL | **Session record** at the end of a run: events (§4), adjustments (§7), outcome, seed, config | INTERFACES §9.1 | Proposed, needs Devin's agreement |
| Glenda to JL | **Report** facts per session | INTERFACES §9 | Proposed |
| Glenda to JL and Devin | Trainee history summary | INTERFACES §9.1 | Proposed |
| JL to everyone | Updated profile | INTERFACES §5 | Exists |
| Eevee to all | Tokens and class names | `design/` | New |

## Rules that stop collisions

1. Never edit a file outside your lane. If you need a change there, write down the exact request (file, function, behaviour) and tell its owner.
2. A new file belongs to the lane that creates it, and sits in that lane's folder or uses its prefix.
3. Contracts (`contracts/`, `docs/INTERFACES.md`) change only through JL.
4. The one shared touch point in `runtime.html` is the `link/pane.js` script tag. Devin owns the file; JL's tag stays.
5. Work on your own branch (`jl/...`, `devin/...`, `glenda/...`, `eevee/...`) and merge to `main` through JL. `main` must always open and run.
