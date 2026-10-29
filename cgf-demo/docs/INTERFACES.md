# Interfaces (frozen at G0)

The Lead implements each structure below as a JSDoc typedef plus a `validate*` function in `cgf-demo/contracts/`. The validators are the source of truth once written; this file and the validators must match. Changes go through the Lead only.

Everything marked **provisional** is confirmed or corrected by Sim (task S2) against what `js/engine.js` and `js/factors.js` can actually emit, before G0.

## 1. Enumerations

| Name | Values |
|---|---|
| Competency (catalog of 9; by seat in section 1.1) | `hail_discipline`, `collision_avoidance`, `territorial_awareness`, `weapons_discipline`, `speed_management`, `threat_evaluation`, `contact_detection`, `picture_reporting`, `escalation_control` |
| Mode | `adaptive`, `fixed` |
| Platform type | `fighter`, `warship`, `tank` |
| Seats per platform type (trainee stations, in this order) | `fighter`: `pilot`, `weapon`. `warship`: `weapons`, `sensors`, `navigation`. `tank`: `commander`, `driver` |
| Scenario domain of a platform type | `fighter`: `air`. `warship`: `sea`. `tank`: `land`. A scenario with no `domain` field is `sea`, as in the engine |
| Adjustment source | `engine`, `instructor_steer` |
| Directive intensity | `low`, `medium`, `high` |
| Policy | `rules_v1`, `bandit_v2` |

### 1.1 Competencies by seat (decided 2026-10-29)

The competencies a seat exercises depend on its role. Each seat has 3. Competency ids are global, so a trainee's profile follows them between seats and platforms. The source of truth in code is `seatFocus` in `fixtures/platforms.js`; the roles come from the sourced seat descriptions there.

| Platform | Seat | Competencies |
|---|---|---|
| Warship | `weapons` (Tactical Action Officer) | `weapons_discipline`, `threat_evaluation`, `escalation_control` |
| Warship | `sensors` (Operations specialist) | `contact_detection`, `picture_reporting`, `threat_evaluation` |
| Warship | `navigation` (Officer of the Deck) | `collision_avoidance`, `territorial_awareness`, `hail_discipline` |
| Fighter | `pilot` | `collision_avoidance`, `territorial_awareness`, `speed_management` |
| Fighter | `weapon` (Weapon systems officer) | `weapons_discipline`, `contact_detection`, `threat_evaluation` |
| Tank | `commander` | `threat_evaluation`, `weapons_discipline`, `hail_discipline` |
| Tank | `driver` | `collision_avoidance`, `territorial_awareness`, `speed_management` |

`piracy_response` became `speed_management`, because the competency applies to any platform that has to manage its speed, not only at sea. Measurable now (section 4): `hail_discipline`, `collision_avoidance`, `territorial_awareness`, `weapons_discipline` and `speed_management`. The other four are not measured yet.

## 2. CGF settings and envelope

An adjustment changes one **setting** of one CGF force. Two kinds:

| Kind | Examples (provisional) | Meaning |
|---|---|---|
| `param` | `aggression`, `sensitivity`, `reaction_delay_s`, `calm_down_rate`, `detection` | The repo's existing Setup sliders |
| `weight` | `weight.ignoredWarning`, `weight.cpa`, `weight.territorial`, `weight.contiguous`, `weight.fcRadar` | A multiplier on a factor weight in `js/factors.js`, default 1.0 |

The instructor sets an envelope per setting:

```json
{
  "aggression":           {"min": 0.2, "max": 0.8, "base": 0.4},
  "sensitivity":          {"min": 0.3, "max": 0.9, "base": 0.5},
  "reaction_delay_s":     {"min": 2,   "max": 20,  "base": 8},
  "weight.ignoredWarning": {"min": 0.5, "max": 2.0, "base": 1.0},
  "weight.cpa":           {"min": 0.5, "max": 2.0, "base": 1.0}
}
```

Validation: `min <= base <= max`, and the range sits inside the setting's hard range from the Setup tab. Settings without an envelope entry cannot be adjusted.

## 3. Scenario config

```json
{
  "scenario_id": "strait_transit_01",
  "scenario": "strait-transit",
  "seed": 1234,
  "mode": "adaptive",
  "duration_s": 1200,
  "eval_interval_s": 30,
  "envelope": "<envelope object from section 2>",
  "platform": {"type": "warship", "model": "formidable"},
  "crew": [
    {"seat": "weapons",    "trainee_id": "trainee_b",   "agent_profile": "trainees/weak_hail_discipline.js"},
    {"seat": "sensors",    "trainee_id": "trainee_c03", "agent_profile": "trainees/strong.js"},
    {"seat": "navigation", "trainee_id": "trainee_c04", "agent_profile": "trainees/strong.js"}
  ]
}
```

`duration_s` and `eval_interval_s` are sim seconds, not real seconds. Defaults are placeholders until Sim has measured how long a run takes at time scale 60.

**Platform and crew (changed 2026-10-29, replaces the single `trainee` field).** The player role decides how many trainees a pane has. `platform.type` is one of the platform types in section 1. `platform.model` is an id from the platform catalog (`fixtures/platforms.js`: fighters `f15e`, `fa18f`; warships `formidable`, `lcs-independence`; tanks `leopard2sg`, `m1a2sepv3`). `crew` has exactly one entry per seat of that type, in the seat order of section 1. A seat is a trainee station, not the vehicle's whole crew: a real tank has four crew and a frigate 70 or more, and the stations nobody fills are simulated. The scenario's domain must match the platform type.

Validation: `crew` length and `seat` ids match the type; `trainee_id` is a lower-case id; `agent_profile` is required; no trainee fills two seats; the scenario's domain matches the platform type.

### 3.1 Allocation (wrapper)

The trainee allocation page outputs one `Allocation`. It pairs the two panes of a side-by-side run and holds the settings they share once. The run page reads the `Allocation`, then derives one scenario config (section 3) per slot.

```json
{
  "allocation_id": "alloc_01",
  "created_at_session": "s_20261030_01",
  "shared": {
    "scenario": "strait-transit",
    "seed": 1234,
    "mode": "adaptive",
    "duration_s": 1200,
    "eval_interval_s": 30,
    "envelope": "<envelope object from section 2>",
    "platform": {"type": "warship", "model": "formidable"}
  },
  "slots": [
    {"pane": "A", "crew": [
      {"seat": "weapons",    "trainee_id": "trainee_a",   "agent_profile": "trainees/strong.js"},
      {"seat": "sensors",    "trainee_id": "trainee_c01", "agent_profile": "trainees/strong.js"},
      {"seat": "navigation", "trainee_id": "trainee_c02", "agent_profile": "trainees/strong.js"}
    ]},
    {"pane": "B", "crew": [
      {"seat": "weapons",    "trainee_id": "trainee_b",   "agent_profile": "trainees/weak_hail_discipline.js"},
      {"seat": "sensors",    "trainee_id": "trainee_c03", "agent_profile": "trainees/strong.js"},
      {"seat": "navigation", "trainee_id": "trainee_c04", "agent_profile": "trainees/strong.js"}
    ]}
  ]
}
```

| Field | Meaning |
|---|---|
| `allocation_id` | Unique id for this pairing |
| `created_at_session` | Id of the most recent completed session when the allocation was made, or `null` if there is none |
| `shared` | Fields both panes must have in common: `scenario`, `seed`, `mode`, `duration_s`, `eval_interval_s`, `envelope` and `platform`, with the meanings of section 3. Both panes play the same platform, so the comparison is like for like |
| `slots` | One entry per pane, each holding that pane's `crew` (section 3) |

Validation:
- `slots` has exactly 2 entries, with `pane` values `A` and `B` in that order.
- Each `crew` fills every seat of the platform type, in seat order.
- No trainee appears twice: not in two seats of one crew, and not in both panes.
- `agent_profile` is required and non-null in every seat. A human-driven seat is out of scope for G1.
- `shared` passes the same checks as section 3: integer `seed`, `duration_s > 0`, `eval_interval_s < duration_s`, `mode` in the Mode enumeration, a valid envelope, a valid `platform`, and a scenario whose domain matches the platform type.

Derivation: `expandAllocation(allocation) -> ScenarioConfig[]` returns the two section 3 configs in pane order. Each takes `shared`, sets `crew` from its slot, and sets `scenario_id` to `<allocation_id>_<pane>`. The function is pure and lives in `contracts/`, so the page, the runner and the tests all use the same one. The derived configs always pass the section 3 validator. As built, `validateAllocation(allocation, opts)` checks the structure first and then validates every derived config, so both functions are in `cgf-demo/contracts/contracts.js`.

Handoff: the page writes the `Allocation` to `localStorage` under `cgf.allocation` (the Lead confirms the key). The URL-encoded fallback carries the same object.

## 4. Simulation event (sim to engine)

```json
{
  "event_id": "e_000187",
  "t": 642.0,
  "session_id": "s_20261030_01",
  "trainee_id": "trainee_b",
  "seat": "navigation",
  "type": "hail_ignored",
  "competency": "hail_discipline",
  "outcome": "fail",
  "unit_id": "ship_2",
  "detail": {"warning_level": 2}
}
```

| `type` (provisional) | `competency` | `outcome` | Source in the repo |
|---|---|---|---|
| `hail_acknowledged` | `hail_discipline` | success | acks in `sim.stats` |
| `hail_ignored` | `hail_discipline` | fail | `ignoredWarning` factor |
| `safe_passage` | `collision_avoidance` | success | CPA above a threshold when passing |
| `close_quarters` | `collision_avoidance` | fail | `cpa` factor |
| `left_territorial` | `territorial_awareness` | success | territorial zone exit |
| `territorial_incursion` | `territorial_awareness` | fail | time in territorial or contiguous zone |
| `fc_restraint` | `weapons_discipline` | success | no fire-control radar on a non-hostile |
| `fc_radar_lock` | `weapons_discipline` | fail | `fcRadar` factor |
| `pirate_speed_response` | `speed_management` | success | speed raised when approached by raiders |
| `pirate_slow_response` | `speed_management` | fail | `slowSpeed` factor |
| `tension_peak` | none | none | unit tension crossing a threshold; feeds the live signal |
| `exercise_failed` | none | none | `failState` reached |

Events with `competency: null` do not update the profile. They feed the live signal.

**Not yet measured (2026-10-29).** No event exists yet for `threat_evaluation`, `contact_detection`, `picture_reporting` or `escalation_control`. Until Devin adds events for them they stay at the prior (no evidence), the policy never targets them, and the allocation page shows "no evidence". Devin decides which of the four can be measured honestly from the simulator and tells JL; any that cannot is dropped from the catalog and from `seatFocus`.

**`seat` (added 2026-10-29, per-seat adaptation).** Every event that updates a competency names the seat that caused it, and `trainee_id` is the crew member in that seat. The runtime decides the seat from who controls the thing the event is about; Devin maps each event type to a seat (for example hail events to the seat that answers hails). `seat` is `null` for events that belong to the whole crew (`tension_peak`, `exercise_failed`). A competency event with `seat: null` is invalid.

## 5. Trainee profile (JL owned, `js/assess/`; Devin's policy reads it)

Seeded profiles ship as `fixtures/profiles/*.js` (assigning to `window.CGF_FIXTURES`), because `fetch` fails on `file://`. Live profiles persist in `localStorage` under `cgf.profile.<trainee_id>`.

```json
{
  "trainee_id": "trainee_b",
  "name": "Trainee B",
  "sessions_completed": 6,
  "competencies": {
    "hail_discipline":     {"alpha": 5.0,  "beta": 14.0},
    "collision_avoidance": {"alpha": 18.0, "beta": 6.0},
    "territorial_awareness": {"alpha": 11.0, "beta": 9.0}
  },
  "updated_at_session": "s_20261030_01"
}
```

`name` is the trainee's display name, a synthetic sample name (1 to 40 characters, optional). `trainee_id` stays the key everywhere. **Instructor notes** are separate from the profile: a plain string in `localStorage` under `cgf.notes.<trainee_id>`, written by the allocation page. The report may read it; nothing else does.

Mean is `alpha / (alpha + beta)`. Prior for a new competency is `alpha = 1, beta = 1`. A competency counts as having enough evidence once `alpha + beta >= 8`.

The profile is the **prior**. During a session the engine keeps a working copy that each event updates, so the target can change within the session. The stored profile changes only at `end_session`.

### 5.1 Per-seat adaptation (decided 2026-10-29)

Adaptation runs per seat. The profile stays per trainee, so a trainee's history follows them between seats and platforms.

- **Working copy:** one per seat of a pane, started from the profile of the trainee in that seat and updated only by events with that `seat`.
- **Target:** for each seat, the weakest competency with enough evidence among that seat's competencies (section 1.1; `seatFocus` in `fixtures/platforms.js`). If none of them has enough evidence, the weakest competency with enough evidence overall.
- **Combining seats:** all of a pane's seats can have a target at once. For each setting the pane's CGFs receive, the engine applies the single largest requested change among the seats and ignores the others for that cycle. Changes are never summed. The adjustment record says which seat it served.
- **Live signal:** the window and the challenge band (section 6) are kept per seat. A pane's overall pressure follows its seats: any seat `up` raises the pane only if no seat is `down`; any seat `down` wins.
- **Fixed mode** gives no adjustments for any seat.
- **Reports and the profile strip** show results per seat and per trainee.

### 5.2 Crew view (planned, not G1)

Team-based training is the wider use, so the per-seat data is kept in a form a crew view can roll up: every event has a `seat`, and a session record lists the crew. Not built for the hackathon: team competencies (coordination, communication), a crew-level target, and a crew-level report. Adding them needs new event types, a crew aggregate over the per-seat working copies, and one more row in the report; none of it changes sections 3 to 5.

## 6. Live signal (engine internal, shown in the console)

For the target competency the engine keeps a rolling window of its last `N` events (default 10).

| Field | Meaning |
|---|---|
| `window_success_rate` | Successes in the window divided by events in the window |
| `challenge_band` | Default 0.4 to 0.7 |
| `pressure_direction` | `up` above the band (trainee is cruising), `down` below it (overwhelmed), `hold` inside |

The policy raises settings toward the envelope maximum on `up`, moves them back toward base on `down`, and leaves them on `hold`.

## 7. Adjustment record (engine to runner, sim and console)

```json
{
  "adjustment_id": "a_0009",
  "t": 660.0,
  "session_id": "s_20261030_01",
  "force": "hostile-state",
  "setting": "weight.ignoredWarning",
  "old": 1.0,
  "new": 1.25,
  "requested": 1.25,
  "clamped": false,
  "target_competency": "hail_discipline",
  "seat": "navigation",
  "pressure_direction": "up",
  "source": "engine",
  "policy": "rules_v1",
  "evidence_event_ids": ["e_000143", "e_000187"],
  "explanation": null
}
```

`requested` is the value before clamping; `new` is the value after. `force` of `"all"` applies to every force. The instructor reasoning panel (Devin, `js/ui-reasoning.js`) fills `explanation` from a template; the adaptation policy always leaves it `null`. `pressure_direction` `up` is a rise in difficulty or hostility, and `down` is a fall. The panel shows the direction, the setting change, the evidence events and the reason for every adjustment.

## 8. Steering directive (console to engine)

```json
{
  "raw_text": "test trainee B's collision avoidance",
  "trainee_id": "trainee_b",
  "competency": "collision_avoidance",
  "intensity": "medium",
  "duration_s": 300
}
```

The console rejects any parser or LLM output that fails this schema and never forwards it.

## 9. Report

```json
{
  "trainee_id": "trainee_b",
  "session_id": "s_20261030_01",
  "facts": {
    "competency_means_start": {"hail_discipline": 0.26},
    "competency_means_end":   {"hail_discipline": 0.33},
    "events_by_competency":   {"hail_discipline": {"success": 4, "fail": 7}},
    "adjustments_count": 9,
    "top_target": "hail_discipline"
  },
  "narrative": "..."
}
```

Code computes `facts`. The LLM writes `narrative` from `facts` only. The validator rejects a narrative that contains any number absent from `facts`.

Owner: Glenda (report lane). The report is built from the session record (§9.1). `competency_means_start` comes from the profile at session start. `competency_means_end` is not known when the report is built, because JL's competency update runs after the report; it is added to the history entry by the update (§9.1).

### 9.1 Session record and history entry (proposed 2026-10-29, to confirm with Devin and Glenda)

**Session record**: emitted by the runtime (Devin) when a run ends, passed by the host page to the report and the competency update.

```json
{
  "session_id": "s_20261030_01",
  "pane": "B",
  "scenario": "strait-transit",
  "seed": 42,
  "mode": "adaptive",
  "platform": "warship",
  "crew": [{"seat": "tao", "trainee_id": "trainee_b"}],
  "outcome": "success",
  "duration_s": 920.0,
  "events": [],
  "adjustments": []
}
```

`events` are §4 events, and each carries a `seat`. `adjustments` are §7 records. `mode` is `adaptive` or `fixed`.

**History entry**: one per trainee per session, appended by Glenda's history store under `localStorage` key `cgf.history.<trainee_id>` (an array, newest last). Seeded history ships as `fixtures/history/*.js`.

```json
{
  "session_id": "s_20261030_01",
  "trainee_id": "trainee_b",
  "scenario": "strait-transit",
  "mode": "adaptive",
  "outcome": "success",
  "report": {},
  "top_target": "hail_discipline",
  "competency_means_end": null
}
```

`report` is the §9 report. `competency_means_end` is `null` until JL's update fills it by calling `History.attachAssessment(trainee_id, session_id, means)`.

| Call | Owner | Signature |
|---|---|---|
| Build report | Glenda | `Report.build(sessionRecord, trainee_id) -> Report` |
| Append history | Glenda | `History.append(entry) -> void` |
| Attach assessment | Glenda | `History.attachAssessment(trainee_id, session_id, means) -> void` |
| Recent context | Glenda | `History.context(trainee_id, n) -> {weak[], strong[], sessions}` |
| Update competency | JL | `Assess.update(sessionRecord, report) -> Profile` |

## 10. Module calls

| Call | Owner | Signature |
|---|---|---|
| Advance simulation | Sim | `CGF.step(dt) -> Event[]` |
| Apply adjustments | Sim | `CGF.apply(adjustments) -> void` |
| Snapshot for console | Sim | `CGF.snapshot() -> Snapshot` |
| Evaluate | Devin (`js/adapt/`) | `Adapt.evaluate(events, now) -> Adjustment[]` |
| Steer | Devin | `Adapt.steer(directive) -> void` |
| Live state for the reasoning panel | Devin | `Adapt.liveState() -> {target, windowSuccessRate, pressureDirection, workingProfile}` |
| Predict a seat's first target (allocation page) | Devin (`js/adapt/predict.js`, standalone) | `Adapt.predictTarget({profile, seat, competencies, mode}) -> {competency, mean, evidence, reason, settings}`. Pure; the same rule as the live policy (§5.1). Full request: `docs/project/request-devin-predict-target.md` |
| End session | Devin | `Adapt.endSession() -> SessionRecord` (§9.1). It no longer writes the profile; JL's `Assess.update` does |
| Cohort | JL (`js/assess/`) | `Assess.cohort() -> object` (trainee id to competency to mean) |

`CGF.tick(dtReal)` remains for the live UI and calls `CGF.step` in fixed sub-steps. Tests and the runner call `CGF.step` directly. The Lead defines `Snapshot` in `contracts/` at G0: unit id, force, position, heading, speed, tension, harness state.

## 11. Cross-instance messages (host page to pane)

Each pane is an iframe of `runtime.html?pane=<letter>` (the page was `index.html` until 2026-10-29). Under `file://` the panes are cross-origin, so the host and the panes talk only through `postMessage`. As built (2026-10-29), the messages are defined and validated in `cgf-demo/contracts/link.js`, and every message is `{cgfLink: 1, type, pane, ...payload}`. Origins are opaque under `file://`, so the host accepts a message only if `event.source` is that pane's iframe window, and the pane only if it comes from `window.parent`.

| Message | Direction | Payload |
|---|---|---|
| `hello` | pane to host | `api: {ok, missing[]}`. Sent once, when the runtime has booted. `missing` lists runtime calls the link needs and cannot find |
| `init` | host to pane | `config`: the pane's scenario config (section 3, expanded from the Allocation). The pane answers `ready`, or `error` if the config is invalid, the scenario is not loaded, or its domain does not match the platform |
| `ready` | pane to host | `scenario`, `domain`, `platform`, `crew` |
| `start`, `pause`, `restart` | host to pane | none. `restart` reloads the scenario from the same config |
| `status` | pane to host | `t`, `running`, `outcome`, `stats` (warnings, ignored, acks, maxTension). Sent when something changes |
| `ended` | pane to host | `outcome` (`success` or `fail`), `text` |
| `error` | pane to host | `message` |
| `events` | pane to host | Event array. **Reserved** for the adaptation loop, not sent yet |
| `apply` | host to pane | Adjustment array. **Reserved**, not sent yet |
| `snapshot` | pane to host | Snapshot. **Reserved**, not sent yet |

The pane does not change `CGF.params` or any harness on `init`. It records the allocation's envelope on `CGF.sim.link.envelope` and fires a `link-init` event; the adaptation code subscribes to that event.

The Engine runs in the host page. With crews there is one working profile per seat, not per pane. Targets are chosen per seat (section 5.1).

Ownership and the runtime API the link depends on: `cgf-demo/link/README.md` in the repo.

## 12. Timing

The runner calls `Adapt.evaluate` every `eval_interval_s` of sim time with all events since the previous call. Adjustments apply on the next step.
