# Decisions: adaptive runtime (Devin's lane)

Dated 2026-10-29. Branch `devin/adaptive-runtime`, merged to `main` by Devin at his request rather than through JL,
so JL please review this note. Module overview: [README.md](README.md). No contract (`contracts/`, `docs/INTERFACES.md`)
was changed.

## Decided in this lane

| # | Decision | Why |
|---|---|---|
| 1 | New code lives in new files: `js/sim/`, `js/adapt/`, `js/ui-reasoning.js`, `trainees/`, `tests/runtime/`. `js/engine.js` only gains small hooks | Keeps merges with the other lanes conflict-free. **JL: please add `js/sim/` and `tests/runtime/` to Devin's row in `LANES.md` and `CLAUDE.md`** |
| 2 | The adaptation engine runs in each pane, started by the `link-init` event | The host does not relay `events` / `apply` yet. `Adapt` is pure, so it can move to the host page (INTERFACES §11) unchanged |
| 3 | A training session always runs its full `duration_s`, in adaptive and fixed mode. A failure state is logged (`exercise_failed`) and makes the final outcome `fail`, but does not stop the run | Every pane yields the same amount of evidence, and the live signal has time to act. At `duration_s` the run ends through the normal `outcome` path, so the host still receives `ended` |
| 4 | Each competency event's seat is the first seat, in seat order, whose `seatFocus` lists that competency | INTERFACES §4 says the runtime decides the seat; `fixtures/platforms.js` is the mapping (still provisional) |
| 5 | An unanswered hail counts as `hail_ignored` once, at the first of: the engine's 180 s ignore timer, a newer warning from the same unit, or the unit escalating past the warning | Otherwise a trainee who ignores a hail and gets escalated never produces hail evidence |
| 6 | Policy tactics are targeted: hail → sensitivity, `weight.ignoredWarning`; collision → `weight.cpa`, `weight.proximity`; territorial → `weight.territorial`, `weight.contiguous`, calm-down rate; weapons → `weight.fcRadar`, reaction delay; piracy → detection, `weight.slowSpeed`. Aggression is not used | Aggression scales every provocation, so it escalated every CGF regardless of the target and ended runs early |
| 7 | Step 20% of the base-to-bound span; a setting changes at most once every 2 cycles; with fewer than 3 target events a seat probes "up" but only halfway to the bound | PLAN E4's step limit and cooldown. Without the probe ceiling, seats with no evidence drove settings to the maximum in about 2 minutes |
| 8 | Every enveloped setting starts each session at its envelope `base` (an initial setting, not an adjustment record) | Both panes start from the same instructor-set point |
| 9 | Scripted crews comply after acknowledging a hail (turn away for 180 s, then resume the route); the weak-hail profile ignores early hails and answers after four | Realistic behaviour, and it gives the G1 "trainee starts answering" beat regardless of timing |
| 10 | Reasons are templates computed from the adjustment record and its evidence events. An optional local-LLM rephrasing is discarded if it contains any number not in the template | Invariant 5; works with the LLM off (invariant 4) |
| 11 | Session id = `s_<yyyymmdd>_<hhmmss>_<pane>`, from the wall clock at session start (outside the simulation); tests pass a fixed id | Unique per run for Glenda's history; the simulation itself stays clock-free (invariant 3 holds for a given id) |
| 12 | Follows JL's 9-competency catalog (`90ccaa3`): the pirate speed events now measure `speed_management`; the competency list comes from `contracts.COMPETENCIES` | INTERFACES §1, §1.1, §4 |
| 13 | A competency that no seat lists (`speed_management` on a warship) belongs to the seat that steers, the one that owns `collision_avoidance` | Speed is set by whoever steers (the Officer of the Deck on a warship) |
| 14 | **`Adapt.predictTarget` is built** (JL's request): `js/adapt/predict.js`, standalone, pure, never throws. It defines `Adapt.pickTarget`, and the live policy calls that same function, so the preview and the live target cannot disagree (a test checks every seeded trainee in every seat of every platform). `settings` lists the tactic's settings. **JL: add `<script src="js/adapt/predict.js"></script>` to `allocate.html`** | `docs/project/request-devin-predict-target.md` |
| 15 | Steering toward a competency with no tactic (the four not measured yet) is rejected with "not measured by the simulator yet" | It could not change anything, so applying it would mislead the instructor |
| 16 | **The four new competencies:** none is measured honestly yet, so none has an event or tactic. Proposal: `escalation_control` can be measured next, from whether the weapons seat's actions push a CGF over the tension peak (the `tension_peak` and `fc_restraint` signals already exist). `threat_evaluation`, `contact_detection` and `picture_reporting` need trainee actions the simulator does not model (classifying, selecting or reporting contacts); defer them, or drop them from `seatFocus` for the demo | INTERFACES §4 asks Devin to decide which can be measured honestly |

## Needs a decision from JL

| # | Question | What the runtime does now | Recommendation |
|---|---|---|---|
| A | **Band direction.** INTERFACES §6 and PLAN §2: up when the trainee is cruising, down when overwhelmed. PLAN G1 and LANES D2: press the weak trainee, and ease off when they improve (the inverse) | Both built: `band_mode: 'challenge'` (default, §6) and `'remediation'` (G1). Linked panes use the default because the config has no field for it | Pick one. For the G1 demo, `remediation`. If both stay, add a `band_mode` field to the §3 config |
| B | **Run length.** The ownship starts about 16 nm from Red, so hails begin about 15 minutes in. The default `duration_s` 1200 gives one or two hail events | Runs as configured | Default `duration_s` to 2400 or more (gives about 4 to 6 hail events with the scripted crews) |
| C | **Envelope scale.** §2 says the settings are the Setup sliders. `fixtures/envelope-default.js` has aggression base 0.4 and sensitivity max 0.9, below the runtime defaults of 1 | Applies the envelope literally, so linked CGFs are calmer and hail less | Raise the default envelope to around `LOCAL_ENVELOPE` in `js/adapt/runtime.js` (aggression and sensitivity 0.6 to 2.0, base 1.0; reaction 5 to 60 s, base 30) |
| D | **Session record to the host (D5).** `link/pane.js` sends `ended` with only `outcome` and `text` | Record emitted as the `session-record` event in the pane, and exportable as JSON from the Reasoning tab | In `pane.js`: `CGF.on('session-record', r => send(...))`, as a `record` field on `ended` or a new message type in `contracts/link.js` |
| E | **§9.1 example.** Uses seat `"tao"` (the warship seats are `weapons`, `sensors`, `navigation`); `platform` is a string there but `{type, model}` in §3 | Follows §9.1: `platform: "warship"`, with the real seat ids | Fix the example; confirm `platform` is the type string |
| F | **G1 seating.** Hail discipline belongs to the navigation seat, but the §3 / §3.1 examples put `trainee_b` in the weapons seat, where the target is weapons discipline | Follows `seatFocus` | Put `trainee_b` at navigation in the demo allocation (or move hail discipline in `seatFocus`) |
| G | **Validators.** `contracts/` has no `validateEvent` or session-record validator | `tests/runtime/` checks the §4, §7 and §9.1 shapes | Add them to `contracts/`; the runtime will call them |
| H | ~~**Profile `name`.**~~ Resolved by JL in `90ccaa3` (`validateProfile` accepts `name`) | The Reasoning tab now shows the name beside the trainee id | None |
| I | **Process.** This branch was merged to `main` directly | | Review the merge; revert or adjust if anything conflicts with the lane plan |
