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
  "aggression":            {"min": 0.6, "max": 2.0, "base": 1.0},
  "sensitivity":           {"min": 0.6, "max": 2.0, "base": 1.0},
  "reaction_delay_s":      {"min": 5,   "max": 60,  "base": 30},
  "weight.ignoredWarning": {"min": 0.5, "max": 2.5, "base": 1.0},
  "weight.cpa":            {"min": 0.5, "max": 2.0, "base": 1.0},
  "weight.proximity":      {"min": 0.5, "max": 2.0, "base": 1.0}
}
```

Validation: `min <= base <= max`, and the range sits inside the setting's hard range from the Setup tab. Settings without an envelope entry cannot be adjusted.

**Default envelope (raised 2026-10-29, JL).** `fixtures/envelope-default.js` starts at the runtime's own defaults (aggression and sensitivity base 1.0, reaction delay base 30 s) so linked CGFs are as lively as local ones and can be pushed both ways. It has an entry for every setting a competency's tactic nudges (`Adapt.TACTICS` in `js/adapt/predict.js`), because a setting without an entry can never be adjusted. `calm_down_rate` and `detection` are left out until their runtime defaults are confirmed. The example above shows six of the ten entries.

## 3. Scenario config

```json
{
  "scenario_id": "strait_transit_01",
  "scenario": "strait-transit",
  "seed": 1234,
  "mode": "adaptive",
  "duration_s": 2400,
  "eval_interval_s": 30,
  "envelope": "<envelope object from section 2>",
  "platform": {"type": "warship", "model": "formidable"},
  "crew": [
    {"seat": "weapons",    "trainee_id": "trainee_c17", "agent_profile": "trainees/strong.js"},
    {"seat": "sensors",    "trainee_id": "trainee_c08", "agent_profile": "trainees/strong.js"},
    {"seat": "navigation", "trainee_id": "trainee_b",   "agent_profile": "trainees/weak_hail_discipline.js"}
  ]
}
```

`duration_s` and `eval_interval_s` are sim seconds, not real seconds. The defaults are 2400 (40 minutes) and 30. The ownship in `strait-transit` starts about 16 nm from the red force, so its first hails come about 15 minutes in, and 1200 s gave only one or two hail events (Devin, decision B; JL chose 2400 on 2026-10-29). In the G1 demo the hail-discipline trainee sits in the navigation seat, where hail discipline belongs (`seatFocus`).

**Platform and crew (changed 2026-10-29, replaces the single `trainee` field).** The player role decides how many seats the crew has. `platform.type` is one of the platform types in section 1. `platform.model` is an id from the platform catalog (`fixtures/platforms.js`: fighters `f15e`, `fa18f`; warships `formidable`, `lcs-independence`; tanks `leopard2sg`, `m1a2sepv3`). `crew` has exactly one entry per seat of that type, in the seat order of section 1. A seat is a trainee station, not the vehicle's whole crew: a real tank has four crew and a frigate 70 or more, and the stations nobody fills are simulated. The scenario's domain must match the platform type.

Each crew entry may carry `role`: `trainee` (default) or `partner` (section 3.2).

Validation: `crew` length and `seat` ids match the type; `trainee_id` is a lower-case id; `agent_profile` is required; no trainee fills two seats; the scenario's domain matches the platform type.

### 3.1 Allocation (wrapper)

Changed 2026-10-29 (JL): one crew per run. `slots` and the pane letters are gone. **The contracts, page, host and tests still describe two panes until task J8 is done; this section is the target.**

The trainee allocation page outputs one `Allocation`. The run page reads it and derives one scenario config (section 3).

```json
{
  "allocation_id": "alloc_01",
  "created_at_session": "s_20261030_01",
  "run": {
    "scenario": "strait-transit",
    "seed": 1234,
    "mode": "adaptive",
    "duration_s": 2400,
    "eval_interval_s": 30,
    "envelope": "<envelope object from section 2>",
    "platform": {"type": "warship", "model": "formidable"}
  },
  "crew": [
    {"seat": "weapons",    "role": "partner", "trainee_id": "partner_weapons", "agent_profile": "trainees/derived.js",
     "derived_from": {"trainee_id": "trainee_c17", "session_ids": ["s_20261029_03"]},
     "agent_params": {"rates": {"hail": 0.9, "radar_response": 0.8}, "reaction_delay_s": 12, "basis": {"source": "history", "sessions": 1}}},
    {"seat": "sensors",    "role": "trainee", "trainee_id": "trainee_c08", "agent_profile": "trainees/strong.js"},
    {"seat": "navigation", "role": "trainee", "trainee_id": "trainee_b",   "agent_profile": "trainees/weak_hail_discipline.js"}
  ]
}
```

| Field | Meaning |
|---|---|
| `allocation_id` | Unique id for this run |
| `created_at_session` | Id of the most recent completed session when the allocation was made, or `null` |
| `run` | The settings of section 3 that apply to the whole run: `scenario`, `seed`, `mode`, `duration_s`, `eval_interval_s`, `envelope`, `platform` (renamed from `shared`) |
| `crew` | One entry per seat (section 3), each a trainee or a partner |

Validation:
- `crew` fills every seat of the platform type, in seat order.
- At least one seat has `role: "trainee"`. Partners may fill any other seat.
- No `trainee_id` appears twice. A partner's `derived_from.trainee_id` may equal a trainee in the crew (the trainee's earlier self); it does not count as a second appearance.
- `agent_profile` is required and non-null in every seat. A human-driven seat is out of scope for G1.
- `run` passes the section 3 checks: integer `seed`, `duration_s > 0`, `eval_interval_s < duration_s`, `mode` in the Mode enumeration, a valid envelope, a valid `platform`, and a scenario whose domain matches the platform type.

Derivation: `expandAllocation(allocation) -> ScenarioConfig` returns the one section 3 config: the `run` fields plus `crew`, with `scenario_id` equal to `allocation_id`. The function is pure and lives in `contracts/`. `validateAllocation(allocation, opts)` checks the structure first and then validates the derived config.

Handoff: the page writes the `Allocation` to `localStorage` under `cgf.allocation` (the Lead confirms the key). The URL-encoded fallback carries the same object.

### 3.2 AI partners (TENTATIVE, proposed 2026-10-29)

**TENTATIVE (JL, 2026-10-29): build only after the outstanding core items are cleared. Single crew is decided; AI partners are not.** Do not implement `role: "partner"`, `derived_from` or `agent_params` yet; all crew entries are trainees.

A `partner` seat is an AI crewmate. It lets one trainee practise with a full crew, with crewmates who behave as a person did in older runs.

| Field | Meaning |
|---|---|
| `role` | `"partner"` |
| `trainee_id` | The partner's own id in this run, such as `partner_<seat>`. It appears in events as the seat's actor |
| `derived_from` | `{trainee_id, session_ids?}`: whose older runs shape the partner. `session_ids` is optional (default: all of that trainee's sessions) |
| `agent_params` | `{rates, reaction_delay_s, basis}`. `rates` maps an event type of section 4 to a success rate from 0 to 1. `basis.source` is `history`, `profile` or `default`, and `basis.sessions` is how many session records were used. Computed by `Assess.partnerParams(derived_from)` (JL), never by the LLM |

Rules:
- Partners are not adapted to. They have no working copy and no target (section 5.1), and no adjustment may name a partner seat as its cause.
- Partners are not assessed. `Assess.update` and `History.append` skip them. The report lists them as "AI partner, based on <trainee_id>".
- Partners are deterministic: the same `agent_params` and `seed` give the same actions (invariant 3).
- Sources, in order: past session records via `History.entries(trainee_id)`; else the profile means (section 5); else a default `strong`-like set. The allocation page shows which source was used.
- Partners do not change the scenario outcome rules. Adjustments still change CGF settings only (invariant 8).

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
| `pressure_direction` | `up` below the band (the trainee is still missing the target: keep pressing), `down` above it (the trainee is meeting it: ease off), `hold` inside |

**Band direction decided 2026-10-29 (JL): remediation.** The purpose is to exercise a focus area, so the pressure stays on while the trainee is still failing it and eases once they succeed. This replaces the earlier "challenge" reading (raise the pressure when the trainee is cruising). There is one rule, not two modes, so no `band_mode` field is added to the §3 config. With fewer than 3 events for the target (Devin's `MIN_WINDOW`) there is no live evidence yet, so the seat keeps exposure up, as the runtime does today.

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

**Session record**: emitted by the runtime (Devin) when a run ends, passed by the host page to the report and the competency update. **Built 2026-10-29:** the pane sends it to the host as the `record` message (§11); the host validates it with `CGF.contracts.validateSessionRecord` plus a match against the pane's config, stores valid records under `cgf.lastRun`, calls `Report.finishSession` and shows an "Open report" link per pane. It also fires a `cgf:session-record` event on the host window (`detail: {pane, record, errors, run}`) for the competency update to hook into, and an "Export session records" button downloads the run as JSON.

```json
{
  "session_id": "s_20261030_01",
  "scenario": "strait-transit",
  "seed": 42,
  "mode": "adaptive",
  "platform": "warship",
  "crew": [
    {"seat": "weapons", "trainee_id": "trainee_c17"},
    {"seat": "sensors", "trainee_id": "trainee_c08"},
    {"seat": "navigation", "trainee_id": "trainee_b"}
  ],
  "outcome": "success",
  "duration_s": 920.0,
  "events": [],
  "adjustments": []
}
```

`events` are §4 events, and each carries a `seat`. `adjustments` are §7 records. `mode` is `adaptive` or `fixed`. `platform` is the platform **type** string (`warship`), not the `{type, model}` object of §3. `crew` has one entry per seat of that type, in seat order, with `seat`, `role` and `trainee_id` (no `agent_profile`). `pane` is `A`, `B`, or `null` for a local run.

`CGF.contracts.validateSessionRecord(record, {envelope})` checks all of this, including that every event and adjustment carries the record's `session_id`, that every event's trainee sits in the seat it names, and, when an envelope is given, that every adjusted value is inside it. It was checked against full sessions from Devin's runtime (adaptive, fixed and the earlier challenge mode): no errors.

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
| Entries for a trainee | Glenda | `History.entries(trainee_id) -> entry[]` (proposed 2026-10-29, for AI partners) |
| Partner parameters | JL | `Assess.partnerParams(derived_from) -> agent_params` (section 3.2) |
| Recent context | Glenda | `History.context(trainee_id, n) -> {weak[], strong[], sessions}` |
| Update competency | JL (`js/assess/assess.js`, built) | `Assess.update(sessionRecord, reports?) -> {trainee_id: Profile}`. One entry per crew member. Evidence is the record's events (+1 alpha per success, +1 beta per fail, per competency); the reports are accepted to fix the order and are not read. Applied once per session and trainee (`cgf.assessed`). Also `Assess.profile(id)`, `Assess.profiles()` (seeded, overridden by stored), `Assess.means(profile)` |

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
| Validate runtime output | JL (`contracts/contracts.js`) | `validateEvent(e, seats?)` (§4), `validateAdjustment(a, {envelope}?)` (§7), `validateSessionRecord(r, {envelope}?)` (§9.1). Each returns a list of error strings, empty when valid. The runtime may call them; its tests should |
| End session | Devin | `Adapt.endSession() -> SessionRecord` (§9.1). It no longer writes the profile; JL's `Assess.update` does |
| Cohort | JL (`js/assess/`) | `Assess.cohort() -> object` (trainee id to competency to mean) |

`CGF.tick(dtReal)` remains for the live UI and calls `CGF.step` in fixed sub-steps. Tests and the runner call `CGF.step` directly. The Lead defines `Snapshot` in `contracts/` at G0: unit id, force, position, heading, speed, tension, harness state.

## 11. Cross-instance messages (host page to runtime)

Changed 2026-10-29: one runtime iframe, not two. The URL marker stays `runtime.html?pane=run` and the `pane` field in messages is always `"run"`; drop both in a later cleanup (task J8).

The runtime is an iframe of `runtime.html?pane=run` (the page was `index.html` until 2026-10-29). Under `file://` the panes are cross-origin, so the host and the panes talk only through `postMessage`. As built (2026-10-29), the messages are defined and validated in `cgf-demo/contracts/link.js`, and every message is `{cgfLink: 1, type, pane, ...payload}`. Origins are opaque under `file://`, so the host accepts a message only if `event.source` is that pane's iframe window, and the pane only if it comes from `window.parent`.

| Message | Direction | Payload |
|---|---|---|
| `hello` | pane to host | `api: {ok, missing[]}`. Sent once, when the runtime has booted. `missing` lists runtime calls the link needs and cannot find |
| `init` | host to pane | `config`: the pane's scenario config (section 3, expanded from the Allocation). The pane answers `ready`, or `error` if the config is invalid, the scenario is not loaded, or its domain does not match the platform |
| `ready` | pane to host | `scenario`, `domain`, `platform`, `crew` |
| `start`, `pause`, `restart` | host to pane | none. `restart` reloads the scenario from the same config |
| `status` | pane to host | `t`, `running`, `outcome`, `stats` (warnings, ignored, acks, maxTension). Sent when something changes |
| `ended` | pane to host | `outcome` (`success` or `fail`), `text` |
| `record` | pane to host | `record`: the §9.1 session record, sent once when an adaptive run ends. Devin's runtime emits it as the `session-record` event and `link/pane.js` forwards it. The host checks it (`hostLink.checkRecord`: valid under §9.1, adjusted values inside the allocation's envelope, and the same pane, scenario, seed, mode, platform and crew as the config the pane was given), keeps only valid records under `localStorage` `cgf.lastRun` as `{allocation_id, records: {A, B}}`, and calls Glenda's `Report.finishSession` to build the reports, append the history entries and get the report page URL |
| `error` | pane to host | `message` |
| `events` | pane to host | Event array. **Reserved** for the adaptation loop, not sent yet |
| `apply` | host to pane | Adjustment array. **Reserved**, not sent yet |
| `snapshot` | pane to host | Snapshot. **Reserved**, not sent yet |

The pane does not change `CGF.params` or any harness on `init`. It records the allocation's envelope on `CGF.sim.link.envelope` and fires a `link-init` event; the adaptation code subscribes to that event.

The Engine runs in the host page. With crews there is one working profile per trainee seat, not per pane, and none for partner seats. Targets are chosen per seat (section 5.1).

Ownership and the runtime API the link depends on: `cgf-demo/link/README.md` in the repo.

## 12. Timing

The runner calls `Adapt.evaluate` every `eval_interval_s` of sim time with all events since the previous call. Adjustments apply on the next step.
