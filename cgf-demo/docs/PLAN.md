# Project Plan: Adaptive CGF Trainer (merged design)

Decided 2026-10-29: the plan and the team repo (`buttception/T-S_Hackathon26`, `cgf-demo/`, commit `eb719dc`) are merged. The repo's maritime simulator is the base. The plan's adaptation engine is built on top of it. Each trainee gets their own tailoring from two signals: their **experience** (a profile that persists across sessions) and their **current behaviour** (what they are doing in this run).

Updated 2026-10-29: roles re-cut into four lanes by person (JL, Devin, Glenda, Eevee). See sections 3, 5 and 7, and `docs/LANES.md`, which has each person's tasks and the hand-offs. This replaces the Lead / Sim / Engine / Console / Design split and the earlier "Evi" Design role (read Evi as Eevee).

## 1. Goal and scoring

Win on the published criteria by finishing one sharp loop, not by building many features.

| Criterion | Weight | What earns it here |
|---|---|---|
| Demonstrated potential | 30% | Side-by-side divergence with visible reasons |
| Readiness / completeness | 30% | Core loop runs end to end, every run, offline, from `file://` |
| Uniqueness / creativity | 20% | Targets the weakness, not the difficulty; blends history with live behaviour; instructor steering |
| AI adoption, market, CI savings | 20% | Competency model, optional LLM explanations and reports, cohort view, savings model |

Rule: nothing in Phase 2 starts until Gate G1 passes. An unfinished core loses more readiness marks than any enhancement earns.

## 2a. What each CGF must do (added 2026-10-29, JL)

1. **Work together and share information.** CGFs in a force share a picture (what they know about the ownship and what other units have done), and act on it as a group.  Today units act independently; the only cross-unit link is the `conflict` factor. Task D6.
2. **React to the trainee's current actions.** Exists: tension factors and harness states. Task D2 adds the live success-rate signal.
3. **Customise from the trainee's past training.** The profile picks the competency to exercise. Task D2 (tailoring on `link-init`).

Sharing is information only; it stays inside the envelope and cannot change scores or outcomes (invariant 8).

## 2. The merged idea

The repo's CGFs already react to what the trainee does right now: a tension score from weighted factors, with harness states that escalate. The adaptation layer adds a second, slower signal: what the trainee is known to be weak at.

| Signal | Source | Time scale | What it decides |
|---|---|---|---|
| Experience | Trainee profile: a Beta posterior per competency, kept across sessions | Sessions | **Which** competency to exercise (the weakest one with enough evidence) |
| Current behaviour | Events and stats from this run, in a rolling window | Seconds to minutes | **How hard** to push: raise pressure when the trainee is cruising, ease off when they are overwhelmed |

The two are linked. The profile is the prior. Events from the current run update the posterior live, so evidence from this session shifts the target during the session. A trainee who has been weak at hailing but handles it well today stops being the target once the live evidence outweighs the history.

Adjustments change the CGF's own settings, never the trainee's score or the scenario outcome. They stay inside the instructor's envelope, and each one carries its reason and its evidence.

## 3. Assumptions

- Hackathon length is not yet fixed. Timings below use percentages, with 24h and 48h equivalents.
- Roles: four people, one lane each. JL: allocation, hand-off to the runtime, competency update (and Lead duties). Devin: simulation runtime and CGF behaviour, with the instructor-facing reasoning. Glenda: end-of-training report and trainee history. Eevee: UI/UX design of the whole page.
- Stack: vanilla JS loaded with `<script>` tags, no build step, no server, runs from `file://`. This matches the repo and suits locked-down laptops. The earlier Python / FastAPI decision is dropped.
- Tests: Node's built-in `node:test` if Node is allowed on the event machines. Otherwise a browser test page (`tests/index.html`). Confirm which.
- A local open-weight LLM is optional. Every LLM feature has a template fallback, and the repo already has template-style reasons.
- Use of Claude Code on the event machines is permitted. Confirm before the event.
- Devin Tan wrote the existing repo and owns the runtime and the in-run adaptation (old Sim and the policy half of Engine). Changes to his files go to him as requests, not as edits by another session. His lane is the heaviest: events must exist before anyone downstream has input, so the session record (INTERFACES §9.1) is the first thing the others need from him.
- JL owns the trainee allocation page and the link to the runtime (both built), and now the competency update (old E1, E2): the estimator and profile persistence move from the Engine lane to JL. Devin's policy reads the profile; he no longer writes it.
- Glenda owns the end-of-training report (old L3) and the trainee history. The report feeds the history, and the history gives the next session its context.
- Eevee owns look and feel across every page. She edits CSS and `design/` only; each page's owner applies new markup she requests. She does not touch simulation or logic.
- The Console lane no longer exists as a lane. Its tasks were moved to the owners listed in section 7.

## 4. Collaboration setup

Git on GitHub (`buttception/T-S_Hackathon26`). Each lane works on its own branch and merges to `main` through the Lead. `main` always opens and runs.

Two Claude Code sessions are used to limit context growth:
- **Lead session**: this vault. Holds decisions, contracts, plan docs, the Resume block.
- **Code session(s)**: work in the clone, one task at a time, inside one lane's files. Hand-off between sessions goes through the Resume block in `overview.md`, not through chat history.

## 5. Team and ownership

Paths are inside `cgf-demo/` unless stated.

Full file lists, tasks and acceptance tests per person are in `docs/LANES.md`.

| Person | Lane | Owns | Responsible for |
|---|---|---|---|
| JL | Allocation, hand-off, competency update (and Lead) | `allocate.html`, `host.html`, `link/`, `js/assess/`, `contracts/`, `fixtures/`, `runner/`, `docs/` | Trainee allocation, passing each seat's trainee to the runtime, reading the session record and report to update competency, contract freeze, merges, business case, pitch |
| Devin Tan | Simulation runtime and CGF behaviour | `runtime.html`, `js/engine.js`, `js/factors.js`, `js/llm.js`, `js/adapt/`, `js/ui-reasoning.js`, harnesses, scenarios, `demos/`, `trainees/` | Event emission, fixed-step mode, determinism, scripted trainees, in-run adaptation policy and envelope clamp, steering, the instructor reasoning panel, the session record |
| Glenda | End-of-training report and trainee history | `report.html`, `js/report/`, `js/history/`, `fixtures/history/` | Report facts and narrative, history store, context for the next session |
| Eevee | UI/UX of the whole page | `css/`, every `*.css`, `design/` | Visual system, layout and flow of every page, pitch deck look, polish review before freeze |

## 6. Phases and gates

| Phase | Window | 24h | 48h | Exit gate |
|---|---|---|---|---|
| 0. Contracts and stubs | 0 to 8% | 0h to 2h | 0h to 4h | G0 |
| 1. Core loop | 8 to 45% | 2h to 11h | 4h to 22h | G1 |
| 2. Enhancements | 45 to 72% | 11h to 17h | 22h to 35h | G2 |
| 3. Freeze and harden | 72 to 87% | 17h to 21h | 35h to 42h | G3 |
| 4. Pitch | 87 to 100% | 21h to 24h | 42h to 48h | Submit |

**G0:** Contracts in `docs/INTERFACES.md` match the validators in `contracts/`. Each lane has a stub that returns fixture data. The runner executes a full loop on stubs and writes an adjustment log. Fixed-step mode exists. The visual system (D1) is handed to Console.

**G1 (the readiness gate):** Same seed, same scenario, two scripted trainees in two panes.
- Trainee B's profile is weak at hail discipline. Their CGFs visibly shift toward hail pressure within two evaluation cycles. Trainee A's do not.
- The live signal works: when scripted trainee B starts acknowledging hails during the run, the pressure eases.
- Every adjustment stays inside the envelope. Fixed mode produces zero adjustments.
- All of this shows in the console with template explanations.

Hard check at 50% of total time: if G1 has not passed, the whole team works on G1 and the cut list applies from the top.

**G2:** Enhancements merged in priority order (section 7). Each one has passed its acceptance test.

**G3:** Feature freeze. Five back-to-back demo runs with no failure. Fallback video recorded.

## 7. Lane task breakdown

Tasks within each lane run in order. Phase 2 tasks carry a priority number; the team builds them in that order across lanes. Competency names, event types and parameter ranges are provisional until Sim confirms what the repo can emit (`docs/INTERFACES.md` sections 1 and 4).

### Who builds which task (since 2026-10-29)

The task tables below keep their IDs. The owner of each is:

| Tasks | Owner |
|---|---|
| S1 to S7 (Sim) | Devin |
| E3, E4, E5, E6, E7 (clamp, policy, fixed mode, steering, bandit) | Devin |
| E1, E2, E8 (competency estimator, profile persistence, cohort) | JL |
| C1, C2 (host page, envelope setup on the allocation page) | JL |
| C3, C4 (adjustment log with reasons, live pressure and target), C5, C6, C7 (LLM client, explanations, steering box) | Devin, in the instructor reasoning panel |
| C4 competency bars on the allocation page, C8 (cohort heatmap) | JL |
| L1, L2, L4, L5, L6 | JL |
| L3 (report generator) | Glenda |
| Report view, trainee history, history context (new, not in the tables) | Glenda (G1 to G5 in `docs/LANES.md`) |
| D1 to D5 (Design) | Eevee (E1 to E5 in `docs/LANES.md`). Her IDs there are separate from this plan's E-tasks |

Tasks and acceptance tests that changed with the re-cut: `Adapt.endSession` returns the session record and no longer writes the profile; the profile is written by JL's `Assess.update`; the explanation text is filled by Devin's reasoning panel. See INTERFACES §9.1 and §10.

### Sim

| ID | Task | Phase | Acceptance |
|---|---|---|---|
| S1 | Fixed-step mode: `CGF.step(dt)` with no dependence on frame timing; cap catch-up sub-steps in `tick` | 0 | Same seed and inputs give byte-identical event logs over 10 runs |
| S2 | Event emission per INTERFACES, derived from the existing stats and factors (hail acked or ignored, CPA, territorial time, fire-control time, speed response to pirates) | 1 | Every event validates against the contract |
| S3 | Scripted trainee driven by a profile file; ship `strong` and `weak_hail_discipline` | 1 | The weak trainee ignores hails far more often than the strong one over 100 seeded runs |
| S4 | `apply(adjustments)`: set unit parameters and factor-weight multipliers at runtime | 1 | Applied values show in the Setup tab and the CGF log |
| S5 | Instance isolation so two copies run side by side (iframes with `postMessage`, since `file://` iframes are cross-origin) | 1 | Two panes render and tick independently |
| S6 | Fix known engine issues: repeated `failState` logging in freeplay, silent unknown-factor weights, unclamped `opening` factor | 1 | Unit test for each |
| S7 | Snapshot stream for the console | 1 | Both panes update smoothly |

### Engine

| ID | Task | Phase | Acceptance |
|---|---|---|---|
| E1 | Competency estimator: Beta posterior per competency from success and fail events; prior from the stored profile | 1 | Fixture log for the weak trainee ranks `hail_discipline` lowest |
| E2 | Profile persistence (`localStorage`, plus seeded profiles as `fixtures/*.js` because `fetch` fails on `file://`); seed two demo trainees and 20 cohort trainees | 1 | Profiles load at session start and update at session end |
| E3 | Envelope clamp as a pure function | 1 | Property test: no output ever leaves the envelope |
| E4 | Rule policy v1, using both signals. Target: weakest competency with enough evidence, from the live posterior. Intensity: rolling-window success rate in the target competency against a challenge band. Step limit and cooldown per cycle | 1 | First adjustment for the weak trainee targets `hail_discipline` within two cycles; intensity falls when the live success rate rises |
| E5 | Fixed mode: no adjustments | 1 | Zero adjustments across a full session |
| E6 | Steering directive: overrides the target competency for its duration | 2, priority 2 | Directive changes the target within one cycle and expires on time |
| E7 | Policy v2: Thompson-sampling bandit over tactic variants; reward is targeted-competency exposure per minute while the success rate stays inside the challenge band | 2, priority 4 | Matches or beats v1 on exposure in a seeded comparison; v1 stays as the fallback flag |
| E8 | Cohort aggregation | 2, priority 5 | Returns trainee by competency matrix for the seeded cohort |

Competency to tactic mapping for v1 (proposed; Sim and Engine validate it against `js/factors.js` and the harnesses):

| Weak competency | Evidence from the repo | CGF settings nudged |
|---|---|---|
| `hail_discipline` | warnings acknowledged vs ignored | `sensitivity` to `ignoredWarning`, earlier and repeated warnings |
| `collision_avoidance` | CPA | `cpa` weight, closer shadowing |
| `territorial_awareness` | time in territorial and contiguous zones | `territorial` and `contiguous` weights, reduce calm-down |
| `weapons_discipline` | fire-control radar time | `fcRadar` weight, quicker reaction |
| `speed_management` | speed change when approached | raider approach rate and `detection` |
| `threat_evaluation`, `contact_detection`, `picture_reporting`, `escalation_control` | not measured yet | no tactic until Devin adds the events (INTERFACES §4) |

### Console

| ID | Task | Phase | Acceptance |
|---|---|---|---|
| C1 | Side-by-side host page with two panes | 1 | Renders two live instances |
| C2 | Setup panel: envelope min, max and base per parameter, mode toggle | 1 | Values reach the engine and show in the log |
| C3 | Adjustment log with template explanations that cite the evidence | 1 | Every adjustment appears with its reason |
| C4 | Profile strip per trainee: competency bars, current target, live pressure | 1 | Updates as events arrive |
| C5 | LLM client with local backend and template fallback | 2, priority 1 | Demo runs with the LLM switched off |
| C6 | LLM explanations from structured adjustment records | 2, priority 1 | One sentence per adjustment; falls back on timeout |
| C7 | Steering box: text to a directive. Reuse the existing keyword parser and the validate-then-preview pattern in `js/llm.js`; add a competency-directive schema on top. Show the parsed directive before applying | 2, priority 2 | Invalid parses rejected by schema, never applied |
| C8 | Cohort heatmap | 2, priority 5 | Renders E8 output |

Console builds C1 to C8 from the matching Design spec (D1 to D4) once it exists. Until then it uses the repo's current styles, so Design never blocks the core loop.

### Design

Design delivers specs and mockups only. It never edits simulation, engine or other programming files; Console implements the designs in `css/` and `js/ui*.js`.

| ID | Task | Phase | Acceptance |
|---|---|---|---|
| D1 | Visual system: colour tokens, type scale, spacing, component states (normal, warning, alert, disabled), building on the repo's current look and its MIL-STD-2525 / APP-6 symbology | 0 | Covers every existing panel. Readable on a projector from the back of the room. Colour is never the only carrier of meaning |
| D2 | Core-loop screens: two-pane layout, profile strip (competency bars, current target, live pressure), adjustment log with reasons, envelope setup and mode toggle | 0 to 1 | Console can build C1 to C4 from it without open questions; ready before C1 starts |
| D3 | Trainee allocation page: roster table, slots A and B, shared run options, validation messages | 1 | Matches the allocation page tasks (A3 to A7); ready before A3 starts |
| D4 | Phase 2 screens: LLM steering preview card, report view, cohort heatmap | 2, ahead of each priority | Each spec is ready before its Console task (C7, report view, C8) starts |
| D5 | Pitch deck theme and a UI polish review of the demo | 3 to 4 | Deck and app share one look. Issues found in the five G3 demo runs are logged for Console |

### Lead

| ID | Task | Phase | Acceptance |
|---|---|---|---|
| L1 | Contracts and validators, stubs, fixtures, test harness | 0 | G0 |
| L2 | Integration runner: sim emits events, runner passes them to the engine every evaluation interval, applies the returned adjustments, publishes to the console | 0 to 1 | G1 |
| L3 | Report generator: code computes every figure; the LLM only phrases them; a validator rejects any narrative containing a number absent from the facts | 2, priority 3 | Report passes the validator on both demo trainees |
| L4 | Demo scenario, seeds, five back-to-back runs, fallback video | 3 | G3 |
| L5 | Savings model, deck, Q&A prep (deck uses Design's D5 theme) | 2 to 4 | Rehearsed twice under 5 minutes |
| L6 | Merge gatekeeping at each gate | All | `main` always runs |

## 8. Demo script (5 minutes)

| Time | Beat | On screen |
|---|---|---|
| 0:00 | Problem: one instructor, many trainees, fixed scenarios train the average trainee | Title slide |
| 0:30 | Instructor sets the envelope | Setup panel |
| 1:00 | Same strait, same seed, two trainees. Trainee B's profile shows weak hail discipline; their CGFs start pressing hails. The log says why | Two panes, profile strip, log |
| 2:00 | Trainee B starts acknowledging hails; the pressure eases. History set the target, current behaviour set the intensity | Profile strip and log |
| 2:30 | Instructor types "test trainee B's collision avoidance". The parsed directive is shown, then the CGFs shift | Steering box and pane |
| 3:15 | Toggle fixed mode for assessment | Mode toggle, log goes quiet |
| 3:30 | Report for trainee B, then cohort heatmap | Report and heatmap |
| 4:15 | Savings model, on-prem deployment, HLA/DIS integration roadmap | Two slides |

Keep the fallback video one click away for every beat. The repo's captioned demo scripts can drive the scripted trainees.

## 9. Q&A preparation

| Likely question | Answer |
|---|---|
| Does adaptation break standardised assessment? | Adaptation applies in practice runs only. Fixed mode runs qualification. |
| Can the AI teach wrong lessons? | It acts only inside the instructor's envelope, and every change carries a reason the instructor can audit and override. |
| How is this different from existing adaptive training? | It targets the specific weakness rather than overall difficulty. It combines what the trainee has struggled with before and what they are doing now, and the instructor steers it in plain language. |
| Why use both history and current behaviour? | History says what to exercise. Current behaviour says how hard. Today's evidence also updates the history, so a trainee who has improved stops being the target. |
| Where does trainee data live? | On-prem, with the training system. No cloud dependency. |
| Does it need our simulator? | No. The engine drives CGF settings through an interface designed to map onto HLA/DIS. |
| How do you know it improves training? | The demo shows the mechanism. Proving training transfer needs a trial with real cohorts, which is the proposed next step. |

## 10. Risks

| Risk | Mitigation |
|---|---|
| Lanes do not integrate late in the event | Stubs at G0; the runner exercises the full loop from the first hour |
| Edits collide with the existing repo code | Lane ownership by file (`docs/LANES.md`); each person on their own branch; JL merges |
| Devin's lane gates the others (events, session record) | He delivers the session record (D5) early; Glenda and JL build against a fixture session record until then |
| Report and competency update depend on each other | The order is fixed: report, then competency update, then `History.attachAssessment` (INTERFACES §9.1) |
| The lane rules never reach teammates' Claude sessions | Copy `CLAUDE.md` and `docs/` into the repo at Phase 0 (not done yet) |
| Two panes do not work from `file://` | S5 tests it first; fall back to one pane plus a recorded second run |
| Competencies are not cleanly measurable from existing stats | S2 maps each competency to an existing counter before E1 starts; drop any competency with no clean signal |
| Local LLM too slow on event hardware | Template fallback for every LLM feature; the LLM is never on the critical path |
| Nondeterministic demo | Fixed-step mode; byte-identical log test |
| Scope creep | Five competencies at most; no new scenarios before G2 |
| Design and build drift apart | D1 and D2 are handed over before C1 to C4 start; Console flags any spec it can't build, and Design adjusts the spec rather than the code |
| Corporate laptop restrictions | Confirm Node, local models and Claude Code with IT before the event |
| IP or data exposure | Synthetic data only; no product code |

## 11. Cut list

Cut from the top when behind schedule:

1. Cohort heatmap (C8, E8)
2. Bandit policy v2 (E7)
3. Steering (C7, E6)
4. LLM report narrative (keep the computed facts)
5. LLM explanations (keep templates)

Never cut: the core loop, the envelope clamp, fixed mode, side-by-side divergence, the live-behaviour signal.

## 12. Savings model

Fill with division figures before the pitch. Do not present invented numbers.

```text
Annual saving = N x S0 x r x (C_session + h x C_instructor)

N             trainees per year on the system
S0            simulator sessions to reach proficiency today
r             fractional reduction in sessions from targeted remediation (assumed; state it as an assumption)
C_session     running cost per simulator session
h             instructor hours per session
C_instructor  cost per instructor hour
```

Present r as a sensitivity range, not a claimed result.

## 13. Not now

Out of scope for the hackathon: real simulator integration, HLA/DIS implementation, team-level competencies and crew-level targeting (crews exist, adaptation is per seat; the crew view is planned in INTERFACES §5.2), voice, VR, conversational CGFs, user accounts, a server or database, persistence beyond `localStorage` and seeded fixture files, new scenarios before G2.
