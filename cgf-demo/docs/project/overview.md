# Hackathon (Adaptive CGF Trainer): overview

**Summary**: JL's team entry for a hackathon. An engine adapts CGF behaviour, inside bounds the instructor sets, to exercise a trainee's weakest competency. It uses the trainee's history to pick the target and their current behaviour to set the intensity. The demo is a web console showing two instances side by side, with explanations, plain-language steering, a fixed mode, and reports. The team is four people: Lead (JL), Sim, Engine, Console. JL works in two Claude sessions: a Lead session in the vault, and a code session in the repo clone.

**Last updated**: 2026-10-29

---

## Resume here

- **Location**:
  - Code: public GitHub repo `buttception/T-S_Hackathon26`, folder `cgf-demo/`.
  - Planning docs: this folder (`README.md`, `PLAN.md`, `CLAUDE.md`, `docs/INTERFACES.md`).
  - Local clone on zyrch-zbook: `~/repos/T-S_Hackathon26`.
- **Status**: direction decided on 2026-10-29: **merge**. The repo (Devin Tan, a working offline simulator in vanilla JS, now at `ae2c008`) is the base. The plan's adaptation engine is built on top, in JS under `js/adapt/`. Each trainee is tailored from their experience (a profile kept across sessions, which picks the competency to exercise) and their current behaviour (a rolling live signal, which sets how hard to push). `PLAN.md`, `docs/INTERFACES.md`, `CLAUDE.md` and `README.md` in this folder were rewritten to match. Nothing is built yet.
- **Lanes (2026-10-29, JL)**: four people, one lane each, in `docs/LANES.md`. JL: allocation, hand-off to the runtime, and the competency update from the logs and report. Devin: simulation runtime, CGF adaptation, and the instructor reasoning panel (why difficulty or hostility rose or fell). Glenda: end-of-training report and trainee history. Eevee: UI/UX of the whole page, CSS and `design/` only. `PLAN.md`, `CLAUDE.md`, `README.md` and INTERFACES §9.1 and §10 were updated to match.
- **Source of truth moved to the repo (2026-10-29)**: the lane docs and these project pages are on `main` of `buttception/T-S_Hackathon26` (`f808ded`, merged by JL): `CLAUDE.md` at the repo root, `cgf-demo/docs/` (`PLAN.md`, `LANES.md`, `INTERFACES.md`) and `cgf-demo/docs/project/` (this overview, `repo-vs-plan`, `allocation-page`, `allocation-run-link`, `README`). The team's Claude sessions work from the repo copy. **This vault folder is now JL's local reference copy**: edits here don't reach the team, and it can drift from the repo. Pull the repo's versions before relying on this page. The repo copy has JL's email redacted from the git-setup note.
- **Still open for the lanes**: Devin and Glenda need to agree to the session record and history contracts (INTERFACES §9.1, proposed). JL still needs to tell Devin about the `link/pane.js` tag in `runtime.html`.
- **Next step**: JL reviews the rewritten `PLAN.md` and `docs/INTERFACES.md`, mainly the provisional competency list and event types (INTERFACES §1 and §4). Then the Lead starts Phase 0 (docs are already in `cgf-demo/docs/`): write `contracts/` validators, add the test harness, and brief the Sim lane on S1 (fixed-step mode) and S2 (event emission). Owner JL, no date set.
- **Built and on `main` (2026-10-29)**: the trainee allocation page with player roles (fighter 2 seats, warship 3, tank 2; [[user/projects/Hackathon/allocation-page]]), and the link from it to the runtime ([[user/projects/Hackathon/allocation-run-link]]): `allocate.html`, then "Start run", then `host.html` with two panes of `runtime.html`. The link lives in `cgf-demo/link/` so JL and Devin can work at the same time; `cgf-demo/link/README.md` has the file ownership and the runtime API the link depends on. The clone is on `main` (the merged feature branch was deleted).
- **For JL to do**: tell Devin about the one tag the link adds to `runtime.html` and about `link/README.md`. Decide the envelope scale (the fixture's values are about a fifth of the runtime's defaults, so the link does not apply them) and the rule for a crew's weakest competency.
- **Next build step**: the panes load the same scenario but play identically, because there is no scripted trainee agent (Sim S3) and no tailoring from the trainee's profile (R3, subscribe to the `link-init` event). Those two make the panes diverge.
- **First command**: open `cgf-demo/runtime.html` in Chrome or Edge, or use `?demo=tour&loop=1`.
- **Read first**: [[user/projects/Hackathon/repo-vs-plan]], then the repo's `cgf-demo/README.md` and `cgf-demo/PRESENTING.md`. If the plan is still current, read `PLAN.md` here.

## Repo as built (ae2c008)

- **Engine**: `js/engine.js` defines `window.CGF`, with registries for scenarios, harnesses, behaviours, factors and malfunctions. The host calls `CGF.tick(dtReal)` every frame. Simulated time runs at `timeScale` (default 60) times real time, in sub-steps of at most 2 s. The engine has no randomness.
- **CGF model**: each unit has a tension score from 0 to 100. Eleven weighted factors in `js/factors.js` raise or lower it: proximity, bowOn, cpa, territorial, contiguous, fcRadar, ignoredWarning, highSpeed, slowSpeed, opening and conflict. Tension decays toward a baseline. Harness states (Patrol, Shadow, Warn, Harass, Weapons ready) change with hysteresis and a reaction delay. Reaching `failState` fails the exercise.
- **Harnesses** (domain-neutral names): `hostile-state`, `non-hostile-state`, `grey-zone`, `raiders` and `civil-traffic`. They can be swapped live per force. The old names (`hostile-navy`, `non-hostile-navy`, `piracy`, `civil-shipping`) no longer exist.
- **Scenarios**: `strait-transit` (the default, sea), `border-patrol` (land), `airspace-patrol` (air), `sea-air`, and `projects/piracy-drill`. A project is a `config.js` that lists plugins, harnesses and scenarios. Only `strait-transit` has a competency signal so far.
- **UI**: Trainee, Instructor, CGF log and Setup tabs. The instructor tab has injects and a free-text command line. The CGF log can be exported to CSV. There are Exercise and Freeplay modes and captioned demos (`demos/demos.js`).
- **Local LLM**: `js/llm.js` (settings in `localStorage` key `cgf-llm-settings`, default Ollama with `qwen2.5:3b`) turns plain-language instructor requests into JSON commands. Each command is validated against the live scenario and shown as a preview before it runs through the same `CGF.inject` calls as the buttons. It falls back when the model is unavailable. `PROMPTING.md` documents it.
- **Still listed as next ideas in its README** (check whether the README has been updated): generated radio chatter, scripted inject timelines, and replay for debriefs.
- **Issues seen in a read of engine.js** (not tested):
  - In freeplay, `failState` can log repeatedly when a unit re-enters it.
  - A weight whose factor isn't registered is ignored without warning.
  - Catch-up sub-steps in `tick` are uncapped after a stalled tab.
  - The `opening` factor is not clamped to 1.
- **Start a clean session with**: "Continue Hackathon: read the Resume here block in Knowledge/user/projects/Hackathon/overview.md and tell me the next step before doing anything."

## Open threads

- Event length is not fixed. PLAN gives timings as percentages, with 24h and 48h equivalents.
- IT must confirm, for the corporate laptops: a local open-weight LLM, installing packages, and using Claude Code.
- The git host is GitHub (`buttception/T-S_Hackathon26`). Git 2.56.0 was installed on this laptop on 2026-10-29 with winget. Global identity is set to `JL` / `limjuinlong@gmail.com`. The repo is cloned to `~/repos/T-S_Hackathon26`. `main` was fast-forwarded to `ae2c008` (Devin's commits since `eb719dc`), and the clone is on the branch `feat/allocation-page`, created by the allocation-page session. Pushing hasn't been tried yet, so GitHub sign-in is still to do.
- Is Node allowed on the event machines? It decides between `node:test` and a browser test page.
- Lanes were re-cut by person on 2026-10-29 (see Decisions). Devin's lane is the heaviest and gates the others, because the session record comes from him. "Eevee" is written in the plan as the earlier "Evi" (assumed the same person, JL spelled it Eevee).
- Open on the re-cut: the order report, then competency update, then `History.attachAssessment` is my proposal; JL's text implies it but did not state it. Whether Eevee may edit HTML markup was assumed no (CSS and `design/` only, requests to page owners).
- Allocation page is on `main` and `origin/main` at `062d7f2` (2026-10-29): `allocate.html`, `js/ui-allocate.js`, `contracts/contracts.js`, `fixtures/platforms.js`, `tests/allocate.html` (59 browser tests under `file://`, per the commit message; not run by me). Details in [[user/projects/Hackathon/allocation-page]].
- "Dynamic trainee type" means the allocation follows the **player role** (commit `062d7f2`): the instructor picks a platform type (fighter, warship, tank) and model, and the page seats one trainee per seat of that type in each of two crews. `platform` and `crew` replace the single `trainee` field in INTERFACES §3, and §3.1 slots hold a crew. The page saves the `Allocation` wrapper, not a bare array. The scenario list follows the platform's domain.
- Seat roles researched online (2026-10-29, JL: use internet information; the hackathon is a proof of concept). Fighters (pilot, weapon systems officer) and tanks (commander, driver, from a four-person crew) were already sourced. Warship seats were invented, and no public Formidable-class watch bill exists. They now use generic US Navy watch roles: Tactical Action Officer (weapons), operations specialist for the air and surface picture (sensors) and Officer of the Deck (navigation), with the helmsman simulated. Seat ids are unchanged, so no contract or test change. Edited in `fixtures/platforms.js`, committed and pushed to `main` as `6a74d4d` at JL's instruction. Real RSN billet titles may differ.
- The runtime (`runtime.html`, `js/main.js`, `js/ui.js`) still does not read the allocation or the platform (searched, no matches). The commit message says the run page expands it, but no run-page code does yet. The platform choice affects nothing in the simulation.
- **Per-seat adaptation decided (2026-10-29, JL)**, with a crew view as the wider-usage goal because most training is team based. INTERFACES §5.1: one working copy and target per seat, the target is the weakest competency among the seat's focus competencies, a pane's CGFs take the single largest change per setting (never summed), and events and adjustments carry a `seat` (§4, §7). §5.2 describes the planned crew view (team competencies, crew target, crew report); it is not built for G1. Work this creates: Devin maps each event type to a seat and emits `seat`; Devin's policy keeps a window per seat; JL's `contracts/` validators gain `seat` and profile `name`.
- Still open from the crew change: the five competencies are maritime but fighters and tanks are now selectable, and only `strait-transit` has a competency signal. The seat-to-competency focus mapping in `fixtures/platforms.js` is provisional.
- **The docs now live in the repo** (JL, 2026-10-29). `cgf-demo/docs/` and the root `CLAUDE.md` are the source of truth; edit them here. The vault copies are updated from the repo at the end of the day, when JL asks.
- `index.html` was renamed `runtime.html` and pushed straight to `main` at JL's instruction (`f97f9ed`, 2026-10-29). References were updated in `allocate.html`, `config.js`, `README.md`, `PRESENTING.md`, `PROMPTING.md`, `demos/demos.js`, `js/main.js` and `projects/piracy-drill/config.js`. No redirect stub. Entry points are now `runtime.html`, `runtime.html?demo=tour&loop=1` and `runtime.html?config=projects/<name>/config.js`.- Two panes from `file://` rely on iframes plus `postMessage`. Untested; Sim task S5 checks it first.
- Check the event rules on whether code written before the event is allowed. PLAN puts Phase 0 at hour 0.
- The savings model (PLAN §11) needs division figures before the pitch. Don't present invented numbers.

## Decisions so far

- Lanes by person (2026-10-29, JL): JL allocation, hand-off and competency update; Devin runtime, CGF adaptation and the instructor-visible reasoning for raising or lowering difficulty and hostility; Glenda end-of-training report feeding the trainee history; Eevee UI/UX. Why: each person, with their own Claude, works without touching another's files. Detail: `docs/LANES.md`.

- Merge of the plan and the repo (2026-10-29, JL): adapt to the trainee's experience and current behaviour, tailored per trainee. Why: the repo already reacts to current behaviour and runs offline; the plan's competency model, envelope and explanations are what it lacks. See [[user/projects/Hackathon/repo-vs-plan]].
- The allocation page outputs an `Allocation` wrapper (INTERFACES §3.1) that pairs the two panes, not a bare pair of configs (2026-10-29, JL). `agent_profile` is required in every seat, so scripted-only seats hold for G1 (INTERFACES §3.1). Display names are the trainee's name (JL, 2026-10-29): INTERFACES §5 profile gains a `name` field; `contracts/contracts.js`, the roster fixture and the allocation page still need it (the validator rejects unknown keys). Names stay synthetic, per the data rule. Still undecided: competency coverage in seeded profiles and the "no new scenarios before G2" rule. Per-seat adaptation is decided (see above).
- Stack is vanilla JS with no build step, running from `file://`. This replaces the earlier Python 3.11 / FastAPI decision.
- Competencies are maritime, measured from counters the repo already keeps: hail discipline, collision avoidance, territorial awareness, weapons discipline, piracy response. Provisional until Sim confirms what can be emitted.
- Each lane owns a set of files. Contracts change only through the Lead.
- The LLM is never on the critical path, and every LLM feature has a template fallback.
- All data is synthetic.
