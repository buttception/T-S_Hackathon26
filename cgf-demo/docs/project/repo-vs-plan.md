# Hackathon: repo vs plan

**Summary**: This page compares the team repo (`buttception/T-S_Hackathon26` at `eb719dc`, folder `cgf-demo/`) with the plan in this folder (`PLAN.md`, `docs/INTERFACES.md`, `CLAUDE.md`). The two share a theme: CGFs that respond to the trainee, an instructor who stays in control, and explanations for what the CGFs do. Their core ideas differ.

**Last updated**: 2026-10-29

---

## Core idea

| | Plan | Repo |
|---|---|---|
| What the CGFs respond to | The trainee's **long-term weakness**. A competency model is built over sessions. | The trainee's **current behaviour**: provocation, scored by weighted factors every sim step. |
| Purpose of the response | Teaching: exercise the weakest skill. | Realism: forces escalate as real actors would. |
| Who the trainee is | A scripted trainee agent (`strong`, `weak_rear_security`). | A human at the keyboard. Demo scripts can drive the ownship. |
| Domain | Ground: a compound with rooms, cover, flanking. | Maritime: a strait transit with territorial waters, hails, fire-control radar, pirates, merchants. |

## Feature by feature

| Plan feature | Repo status | Closest thing in the repo |
|---|---|---|
| Competency estimate (Beta posterior per competency) | Missing | `sim.stats` counts warnings ignored, acks, time in territorial and contiguous zones, and fire-control time. These are raw counts, not competencies. |
| Trainee profile that persists across sessions | Missing | Nothing persists: no files and no localStorage. |
| Adaptation policy (rules v1, bandit v2) | Missing | None. Parameters change only when the instructor moves a slider or swaps a harness. |
| Instructor envelope (min, max, base per parameter, with a clamp) | Partial | Setup sliders: aggression, sensitivity, reaction delay, calm-down rate, detection, time scale. These set values directly. There are no bounds an AI must respect. |
| Fixed mode (zero adjustments) | Different meaning | Exercise mode means a scored run that ends on success or failure. CGFs still react, which is fine because nothing adapts. |
| Explanation for each adjustment | Present, for a different subject | "Why is it reacting?" and the CGF log explain **CGF state changes** by factor. The plan explained **engine parameter adjustments** by trainee evidence. |
| Side-by-side, two trainees, same seed | Missing | One canvas. `CGF.sim` is a single global, so two instances need two iframes or a refactor. |
| Determinism (byte-identical logs) | Probably deterministic, not tested | There is no `Math.random` anywhere. Sub-steps are fixed at 2 s, but `tick` depends on real frame timing. |
| Steering in plain language through an LLM, as a validated directive | Partial | A keyword parser (`runCommand` in `js/ui.js`) maps text to `CGF.inject.*`. There is no LLM, and steering targets units and forces, not competencies. |
| LLM explanations with template fallback | Missing | The template-style reasons already exist. No LLM. |
| Report per trainee, with facts from code and narrative from the LLM | Partial | The after-action summary and CSV export of the CGF log. No narrative, no validator. |
| Cohort heatmap | Missing | No. |
| Savings model | Missing | No. |

## Things the repo has that the plan doesn't

- Five live-swappable harnesses (`hostile-state`, `non-hostile-state`, `grey-zone`, `raiders`, `civil-traffic`; renamed domain-neutral in Devin's later commits), each with typed states, radio calls, warnings and a fail state.
- Land, air and combined scenarios (`border-patrol`, `airspace-patrol`, `sea-air`) beside the sea one, and a local-LLM prompting layer (`js/llm.js`) that previews validated commands. Both were added after this page's first comparison at `eb719dc`; the table above was not re-checked against them.
- Neutral traffic that reacts to conflict nearby, and pirates whose logic is inverted (speed deters them).
- Ownship malfunctions (rudder, engine, radar, comms, GPS drift, fire control stuck), with an instructor-only truth view.
- MIL-STD-2525 / APP-6-style symbology.
- A plugin and project system: one engine, many scenarios through `config.js`.
- Captioned demos that play themselves, plus a presenting guide (`PRESENTING.md`).
- Runs from `file://` with no server or install, so it suits an air-gapped network.

## Engineering differences

| | Plan | Repo |
|---|---|---|
| Stack | Python 3.11, FastAPI, Pydantic, vanilla JS canvas | Vanilla JS only, loaded with `<script>` tags, no server |
| Structure | Four lanes (sim, engine, console, runner), with frozen contracts in `contracts/` | One folder. The engine, UI and content are split by file, not by owner. |
| Tests | pytest for each invariant | None |
| Rules for agents | `CLAUDE.md` with lanes and invariants | None in the repo |
| Timing | 10 ticks per second of sim time; engine evaluates every 5 s | Sub-steps of up to 2 s; time scale 60x by default |

## Where they could meet

- Treat maritime skills as the competencies, measured with events the repo already counts. Examples:
  - Hail discipline: ack vs ignored
  - Collision avoidance: CPA
  - Territorial awareness: time in zones
  - Weapons discipline: fire-control use
  - Anti-piracy speed management
- Add an adaptation layer that changes harness weights or `aggression` inside instructor bounds, to exercise the weakest of those skills. Log each change with its evidence, as the plan's adjustment record does. Exercise mode can be the fixed mode.
- Show two trainees side by side by putting two copies of `index.html` in iframes, each driven by a demo script that acts as a scripted trainee.
