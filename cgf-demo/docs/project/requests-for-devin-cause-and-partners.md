# Requests for Devin: adjustment cause and AI partners

**From**: JL (contracts, allocation, assess). **To**: Devin (`js/adapt/`, `js/sim/`, `js/ui-reasoning.js`). **Date**: 2026-10-29. **Status**: open. The contract side is built and tested (`contracts/contracts.js`); the runtime side is yours.

Two items. Neither breaks your current records: the contract change is optional until you adopt it.

## 1. `cause` on every adjustment (LANES D7)

**What**: add `cause` to each adjustment record (INTERFACES §7). It says which of the three signals caused it:

| `cause` | Use it when |
|---|---|
| `live` | the adjustment came from the live success rate in the rolling window (the trainee's current behaviour) |
| `history` | the seat's target and first step came from the stored profile or saved sessions, before enough live evidence existed (your "probe" phase) |
| `team` | the adjustment came from CGFs cooperating (D6) |

`source: "instructor_steer"` adjustments may leave `cause` out: a steer is the instructor's, not one of the three signals.

**Contract**: `cause` is **optional** in `CGF.contracts.validateAdjustment` today, so your records keep passing. When it is present it must be one of the three values. Once you emit it on every engine adjustment, tell me and I make it required (one line in `contracts.js`, plus the tests).

**In the panel**: show it as a tag on each entry (design/PRINCIPLES.md: AI actions are visible and distinct). Eevee's request R12 asks for a source class per entry; `cause` can use the same pattern.

## 2. AI partner seats (LANES D8)

**What the allocation now produces** (INTERFACES §3.2): a crew entry for a partner seat is

```json
{ "seat": "weapons", "trainee_id": "partner_weapons", "role": "partner",
  "derived_from": {"trainee_id": "trainee_b"},
  "agent_params": {
    "rates": {"hail_acknowledged": 0.36, "safe_passage": 0.9, "left_territorial": 0.71, "fc_restraint": 0.78, "pirate_speed_response": 0.6},
    "reaction_delay_s": 20,
    "basis": {"source": "history", "sessions": 4, "by_competency": {"hail_discipline": "history"}} } }
```

It has no `agent_profile`. `CGF.contracts.validateScenarioConfig` accepts it. At least one seat in a crew is always a trainee.

**What the runtime must do**:

1. **Play the seat.** `js/sim/crew-agent.js` plays a partner seat from `agent_params`. `rates` is keyed by the **success** event type of a measured competency: at each opportunity of that competency, the partner takes the success action with that probability and the failure action otherwise. Use the seeded generator, so the same params and seed give the same actions (invariant 3). `reaction_delay_s` is how long it waits before acting on a hail.
2. **Emit events for it** with `seat` and `trainee_id: "partner_<seat>"`, like any seat.
3. **Do not adapt to it.** No working copy, no target, no adjustment caused by a partner seat's events, and no adjustment with `seat` set to a partner seat (`validateSessionRecord` rejects that).
4. **Record it.** In the session record, the crew entry of a partner has `role: "partner"` and `derived_from` (a trainee has `{seat, trainee_id}`, with `role: "trainee"` optional). The host compares that with the config and rejects a mismatch.
5. **Fail clearly, not strangely, until this is built.** If `begin` receives a partner seat and cannot play it, return an error list ("AI partner seats are not supported yet") instead of starting.

**Until D8 lands** the allocation page lets the instructor build and save a partner allocation but disables Start, with a message. When you tell me D8 works, I flip `PARTNERS_RUN` in `js/ui-allocate.js` and update its test.

## Tests

`tests/allocate.html` has the contract tests for partner entries, partner records and `cause`. A session-record fixture with a partner would help both of us: if you add one under `tests/runtime/`, I will run the same record through `validateSessionRecord`.
