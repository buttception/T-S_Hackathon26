# Adaptive runtime (Devin's lane)

Runtime side of the adaptive CGF trainer: simulation events, scripted crews, CGF settings, in-run adaptation, the
instructor reasoning panel, steering and the session record. Contracts: `docs/INTERFACES.md` §2 to §10. Tasks: `docs/LANES.md` D1 to D5.

Everything is new files or small hooks in `js/engine.js`, so it does not collide with the other lanes. It reads JL's
`contracts/` and `fixtures/` and listens to the `link-init` event from `link/pane.js`, but edits none of them.

## Files

| File | What it does | Task |
|---|---|---|
| `js/engine.js` (hooks only) | `CGF.step(dt)` returns the step's events; `tick` capped at 60 sub-steps; `CGF.endRun`; `CGF.weightMult`; events `sim:step`, `sim:state`, `sim:warn`, `sim:hail-ack`, `sim:hail-ignored`, `sim:fc`, `sim:fail`; failure reported once per unit; unknown harness weights reported | S1, S6 |
| `js/factors.js` | `opening` clamped to 1 | S6 |
| `js/sim/rng.js` | Seeded random numbers (`CGF.rng(seed)`), never `Math.random` | S1 |
| `js/sim/events.js` | §4 events, only while a session is configured. Hail answered or not (ignore timer, superseded, or escalated past); safe passage or close quarters per encounter; entering or leaving foreign claimed zones; fire-control lock or restraint; piracy speed response; tension peaks; failure | S2 |
| `js/sim/apply.js` | `CGF.settings` (§2 settings) and `CGF.apply(adjustments)`: settings only (invariant 8) | S4 |
| `js/sim/team.js` | Cooperating CGFs: a shared picture per force, teammate alerts scaled by the harness `teamwork` (instructor override per force), `sim:team` events | D6 |
| `js/sim/crew-agent.js` | Scripted crews: each seat's agent profile decides what its competencies are about (hails, collision, zones, fire-control, piracy); AI partner seats played from `agent_params` | S3, D8 |
| `trainees/strong.js`, `trainees/weak_hail_discipline.js` | The two agent profiles (paths are the contract in `fixtures/profiles/roster.js`) | S3 |
| `js/adapt/predict.js` | Standalone target rule: `Adapt.pickTarget` (used by the live policy) and `Adapt.predictTarget` for the allocation page; the competency → tactic map | JL's request |
| `js/adapt/clamp.js` | Envelope clamp, pure | E3 |
| `js/adapt/policy-rules.js` | `rules_v1`: competency to settings, step size, cooldown, exposure probe | E4 |
| `js/adapt/adapt.js` | `CGF.Adapt.create(...)`: `evaluate`, `steer`, `liveState`, `endSession` (§10); pure. Remediation band rule, `cause` tags (D7), teamwork tactic on `weight.team`, partner seats skipped | E4, E5, E6, D5 |
| `js/adapt/steer.js` | Steering text to a §8 directive: keyword parser, optional local LLM, strict validation | D4 |
| `js/adapt/runtime.js` | Runs a session in the pane: on `link-init` (or a local start), evaluates every `eval_interval_s`, applies, ends at `duration_s`, emits `session-record` | D2, D5 |
| `js/ui-reasoning.js` | Reasoning tab: per-seat target and live signal, every adjustment with direction, change, evidence and reason, steering box, session-record export | D3, D4, D5 |
| `harnesses/hostile-elite.js` | Elite hostile force: close teamwork, faster reactions | D6 |
| `tests/runtime/` | `node --test tests/runtime/` from `cgf-demo/` (45 tests) | all |

## How a session runs

1. `link/pane.js` loads the scenario and fires `link-init` with the pane's §3 config. `js/adapt/runtime.js` starts:
   events are configured for the crew, every enveloped setting starts at its `base`, the scripted crew starts, and
   `CGF.Adapt.create` builds the per-seat working profiles from `localStorage` `cgf.profile.<id>` or the seeded fixtures.
2. Every `eval_interval_s` of sim time: new events go to `Adapt.evaluate`, and the returned adjustments go to `CGF.apply`.
   - Target per seat: the weakest focus competency with enough evidence (§5.1), updated live by this session's events.
   - Direction per seat from the last 10 target events against the band (§6). With fewer than 3 target events the seat
     probes: "up", but only halfway from base to bound.
   - Pane direction (§5.1): any seat "down" wins, otherwise any "up". Per setting, the single largest request; never summed.
   - One step is 20% of the base-to-bound span; a setting changes at most once every 2 cycles; everything is clamped.
   - Fixed mode evaluates but returns no adjustments.
3. The run lasts the full `duration_s` in both modes. Reaching a failure state is an `exercise_failed` event and makes the
   final outcome `fail`; it no longer stops the run early. At `duration_s` the run ends through the normal `outcome`
   path, so the link still sends `ended` to the host. Then `Adapt.endSession` builds the §9.1 session record, emitted as
   `session-record` and exportable from the Reasoning tab.

Local runs without the host: Reasoning tab → Start (warship crew, chosen trainee at navigation).

## Open points for JL (no contract was changed)

The decisions made in this lane, and these questions with recommendations, are collected in [DECISIONS.md](DECISIONS.md).

1. **Band direction: decided (JL, INTERFACES §6).** Challenge is the only band rule: pressure rises while the trainee
   is above the band and eases toward the instructor's base while they are below it. `band_mode` no longer exists.
2. **Run length.** In `strait-transit` the ownship starts about 16 nm from Red, so hails only begin around 15 minutes in.
   The allocation page's default `duration_s` of 1200 gives one or two hail events per run, which is too few for the live
   signal. 2400 or more works (about 4 to 6 hail events per run with the scripted crews).
3. **Envelope scale.** Linked runs apply the allocation's envelope literally (§2 says the settings are the Setup sliders).
   `fixtures/envelope-default.js` has aggression base 0.4 and sensitivity max 0.9, below the runtime defaults of 1, so
   linked CGFs are calmer and hails rarer. The local runs use `LOCAL_ENVELOPE` in `js/adapt/runtime.js` (base 1).
4. **Where the engine runs.** §11 says the host page. It runs in each pane for now because the host does not relay
   `events` / `apply`. `Adapt` is pure, so it can move to the host unchanged.
5. **Session record to the host (D5).** The record is ready on the `session-record` event, but `link/pane.js` (JL's)
   sends `ended` with only `outcome` and `text`. Proposed: in `pane.js`, on `CGF.on('session-record', r => ...)`, send
   the record to the host (a `record` field on `ended`, or a new message type in `contracts/link.js`).
6. **§9.1 example.** It uses seat `"tao"`, but the warship seats are `weapons`, `sensors` and `navigation`; and
   `platform` is a string there but an object in §3. The runtime follows §9.1 (`platform: "warship"`) and the real seat ids.
7. **Seat for the G1 demo.** Hail discipline belongs to the navigation seat (`seatFocus`), but the §3 / §3.1 examples
   put `trainee_b` in the weapons seat, where the target would be weapons discipline. For G1, put `trainee_b` at navigation.
8. **Event validator.** `contracts/` has no `validateEvent` or session-record validator yet; `tests/runtime/` checks the
   §4, §7 and §9.1 shapes in the meantime.
9. **Profile `name`.** INTERFACES §5 adds `name`, but `validateProfile` still rejects unknown fields. The runtime only
   reads `competencies`, so either is fine for it.
