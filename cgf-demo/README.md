# CGF Trainer: sea, land and air (offline demo)

A 2D plan-view trainer where **computer-generated forces (CGF) react to how the trainee behaves**.
The trainee commands a Blue force (Singapore) unit: a warship, a ground patrol or a fighter. Every other side follows
a swappable **harness**, a behaviour profile such as *Hostile state*, *Non-hostile state*, *Grey-zone*, *Raiders* or *Civil traffic*.

The key idea is that **the same harness files drive every domain.** Red warships, Red armoured vehicles and Red fighters all
run `hostile-state.js`. Merchant ships, civilian vehicles and airliners all run `civil-traffic.js`. Each scenario only
supplies a map, the units and a domain scale. Instructors steer the run in **plain English through a local LLM**
(*"make the red jets more aggressive and have the black drone block BLUE-1"*). The model runs on-prem; its commands are checked
against the scenario and previewed before they apply, and a keyword parser takes over if no model is available.
Instructors can also swap a force's harness while the run is in progress.

Everything runs in the browser from local files, with no server, install or internet, so it suits air-gapped networks.
Other guides: [PRESENTING.md](PRESENTING.md) (how to demo it) and [PROMPTING.md](PROMPTING.md) (instructor prompts and setting up the local LLM).

---

## 1. Quick start

Full setup, tests and troubleshooting: [RUNNING.md](RUNNING.md).

1. Open `runtime.html` in Chrome or Edge (double-click it).
2. Press **Start** (or `Space`) and steer to the green objective without starting a fight.
3. Or pick a demo next to **Play demo** and watch. `Esc` hands you control. `runtime.html?demo=harness&loop=1` runs unattended.

If a locked-down browser blocks local scripts, serve the folder instead and open `http://localhost:8765`:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory T-S_Hackathon26/cgf-demo
```

| Input | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Order heading −/+ 5° |
| `W` / `S` or `↑` / `↓` | Order speed up / down |
| Click the map | Steer toward that point |
| Click a contact | Select it (shows *Why is it reacting?*) |
| `H` | Acknowledge a hail / comply |
| `R` | Toggle fire-control radar on the selected contact (very provocative) |
| `Space` / `Esc` | Pause or resume / stop a demo |
| Mouse wheel | Zoom |

**Modes** (dropdown next to Restart):
- **Exercise**: a scored run. Reaching the objective completes it; a force reaching its harness's failure state fails it.
- **Freeplay**: open-ended. Nothing ends the run; objective and failure conditions are only logged, and the instructor keeps injecting events.

---

## 2. Scenarios

| Scenario | Domain | Blue (trainee) | Red force | Black force | Others |
| --- | --- | --- | --- | --- | --- |
| **Strait transit** | Sea | BLUE-1 (RSN) frigate | Frigate, patrol boats | Coast guard, militia boats | Pirate skiffs; merchant ships on the sea lanes |
| **Border road patrol** | Land | BLUE-1 (SAF) patrol vehicle | APC, recon vehicles | Militia technicals and pickups | Bandits in the forest; buses, trucks, cars on the roads |
| **Airspace patrol** | Air | BLUE-1 (RSAF) fighter | Fighters on CAP | Drones, patrol aircraft | Airliners on the airways |
| **Sea + air** | Both | BLUE-1 (RSN) frigate, BLUE-2 (RSAF) patrol aircraft overhead | Ships **and** fighters | Militia boats **and** a drone | Merchant ships below, airliners above |
| **Piracy drill** | Sea | BLUE-1 (RSN) | none | none | Pirate group; merchant ships |

Red and Black are unnamed states, a pirate or bandit group is a non-state actor, and civil traffic is neutral.

### Harness reuse across domains

| Harness | Kind | Sea | Land | Air |
| --- | --- | --- | --- | --- |
| Hostile state | state | Red warships shadow, warn, cross the bow, lock radar | Red armour shadows, warns, cuts across, takes aim | Red fighters intercept, shadow, warn, lock radar |
| Non-hostile state | state | Coast guard queries, escorts, protests | Border police query, escort, protest | Air policing queries, escorts, protests |
| Grey-zone (state-backed) | state | Militia boats swarm and block the lane | Militia trucks swarm and set up a roadblock | Drones crowd and block the corridor |
| Raiders / piracy | non-state | Pirates prey on slow ships | Bandits ambush slow patrols | (not used) |
| Civil traffic | civil | Merchants divert and flee | Vehicles pull off and flee | Airliners leave the airway |

A scenario's **domain** scales the harness so the same numbers make sense everywhere:

| Domain | Distance unit | Range scale | Speed scale | So "shadow at 6" means… |
| --- | --- | --- | --- | --- |
| Sea | nm, kts | ×1 | ×1 | 6 nm |
| Land | km, km/h | ×1 | ×2 | 6 km |
| Air | nm, kts | ×6 | ×20 | 36 nm, and "high speed" 480 kts |

A scenario can override `scale`, `terms` (the words used in radio calls, e.g. `{area}` = waters / territory / airspace)
and `view` (zoom, grid, range rings). Aircraft have a `minSpd`, so they orbit instead of hovering.

### Map symbology

Simplified MIL-STD-2525 / APP-6: shape and colour show **standard identity**, and the frame family shows the **domain**.

| Identity | Sea surface | Land | Air |
| --- | --- | --- | --- |
| Friend (blue) | circle | rectangle | dome (open bottom) |
| Hostile (red) | diamond | diamond | peaked "tent" |
| Suspect (red, dashed) | dashed diamond | dashed diamond | dashed tent |
| Neutral (green) | square | square | open-bottom square |

Each label's tag (RED, BLK, PIR, BND, MER, CIV) shows which force the contact belongs to. Swapping a harness can change
identity: Black under *Non-hostile state* turns from suspect to neutral.

**Force kinds**: each force is `state`, `non-state` or `civil`, and only accepts harnesses of the same kind. Black can never become *Raiders*.

---

## 3. The panel tabs

- **Trainee**: posture meter and tension chart, contacts, *Why is it reacting?* (each factor pushing the selected unit's tension up or down), after-action summary, event log.
- **Instructor**:
  - **Force harnesses (switch live)**: one dropdown per force.
  - **Instructor prompt**: plain English through the local LLM (with an Apply / Discard preview), or keyword commands; see [PROMPTING.md](PROMPTING.md). The model server is configured under **Setup → Local LLM**.
  - Contact injects: escalate / de-escalate, force a state, custom radio demand.
  - Scenario injects: spawn a unit for a force, fog.
  - Ownship malfunctions: rudder jam, engine failure, radar failure, comms failure, GPS drift, fire-control radar stuck on.
  - While this tab is open the map also shows instructor-only truth: hidden contacts and the real position under GPS drift.
- **CGF log**: every important CGF action (escalations, stand-downs, radio calls, radar locks, fleeing, harness changes) with the factors behind it. Filter by force; **Export CSV** for the debrief.
- **Setup**: pick a scenario; browse, export and import harnesses as JSON; live sliders (aggression, sensitivity, reaction delay, calm-down rate, detection range, time scale).

---

## 4. Demos (hands-off, captioned)

| Demo | Length | What it shows |
| --- | --- | --- |
| **Vision: adaptive CGF trainer** | ~4.5 min, debrief and trainee data included | The whole idea in one run: history picks the target, the live signal sets the pressure, CGFs work as a team, elite harness, plain-English steering, session record, fixed mode, neutral shipping reacting, and the same harness files swapped on land and in the air. Setup and presenting notes: [RUNNING.md](RUNNING.md) |
| **Harness reuse and prompting: sea, land, air** | ~4 min | Typed prompts; the same prompt and manoeuvre under *Hostile* then (after a restart) *Non-hostile*; then the same harness files on land and in the air; ends with sea and air together |
| **Local LLM prompting, plain English** | ~3 min | Natural-language prompts turned into commands by the local model, with preview; falls back to keywords when there is no model |
| **Sea and air together** | ~1.5 min | Red ships and fighters under one harness; merchants and airliners under another; one prompt flips Red |
| Full capability tour, sea | ~2 min | Escalation, injects, merchants fleeing, live swap, GPS drift, CGF log |
| Neutral shipping reacts | ~1 min | Merchants fleeing the trainee's fire-control radar |
| Piracy: speed deters | ~1.5 min | Inverted logic: speed calms pirates |

Demos with prompts type them into the Instructor command box on screen, then run them. Write your own in
`demos/demos.js`; each step has a `caption`, an optional `do`, an optional `prompt`, and `until` / `hold` / `timeout` timing.

---

## 5. How the CGF model works

Each CGF unit has a **tension** score from 0 to 100 (shown as *alarm* for civil traffic). Every sim step:

1. **Factors** score the trainee's behaviour from 0 to 1. Proximity counts only while the trainee is closing in. The others are: pointing at them, collision course, being in their territorial or claimed zone, fire-control radar on them, an ignored warning, high or slow speed, opening range, and confrontation nearby (global).
2. **Harness weights** turn factors into tension per minute. Provocation is multiplied by aggression (harness × slider × unit temperament); negative weights calm the unit.
3. Tension **decays** toward the harness baseline.
4. Crossing a **state threshold** changes state after the reaction delay, with hysteresis on the way down.
5. Each state sets a **behaviour** (patrol, shadow, escort, harass, posture, approach, flee, lane, plus block and swarm from the plugin), an optional **radio call**, an optional **warning** to acknowledge, and an optional **fire-control lock**.
6. A harness `failState` ends an Exercise run.

---

## 6. Folder structure

```
cgf-demo/
├── runtime.html, config.js, css/style.css
├── js/                     Shared engine
│   ├── util.js             Maths helpers
│   ├── engine.js           Registries, domains and scaling, sim loop, tension model, CGF log, injects, modes
│   ├── behaviours.js       Built-in movement behaviours (domain-scaled)
│   ├── factors.js          Built-in provocation factors
│   ├── malfunctions.js     Ownship malfunctions
│   ├── render.js           Canvas renderer, per-domain symbology
│   ├── demo.js             Demo runner (captions, typed prompts)
│   ├── llm.js              Local LLM prompting: context, JSON schema, model call, validation
│   ├── ui.js               Panel, input, instructor prompt parser
│   └── main.js             Boot
├── plugins/greyzone-tactics.js   Adds "block" and "swarm"
├── harnesses/              Domain-neutral behaviour profiles
│   ├── hostile-state.js  non-hostile-state.js  grey-zone.js  raiders.js  civil-traffic.js
├── scenarios/
│   ├── strait-transit.js   Sea
│   ├── border-patrol.js    Land
│   ├── airspace-patrol.js  Air
│   └── sea-air.js          Sea and air together
├── demos/demos.js          Hands-off demo scripts
└── projects/piracy-drill/  A second, self-contained project (own config) using the same engine
```

---

## 7. Extending it

- **New project**: create `projects/<name>/config.js` listing plugins, harnesses, scenarios and demos (copy piracy-drill), then open `runtime.html?config=projects/<name>/config.js`.
- **New harness**: copy any file in `harnesses/`. The fields are `id`, `name`, `kind`, `affiliation`, `armed`, `baseTension`, `aggression`, `decayPerMin`, `ackRelief`, `warnRepeatSec`, `ignoreAfterSec`, `failState`, `weights`, `ranges` and `states`. Each state has `name`, `min`, `behaviour`, `range`, `speedMult`, `msg` (placeholders `{unit}` `{force}` `{hdg}` `{own}` `{area}` `{ownType}`), `warn`, `fcRadar`, `action` and `standDown`.
- **New scenario**: copy a file in `scenarios/`. The fields are `domain`, optional `scale`, `terms` and `view`, plus `forces` (`label`, `tag`, `kind`, `color`, `harness`), `ownShip`, `objective`, `land` (terrain), `zones` (`territorial` / `contiguous` with an `owner`), `lanes` (routes, with `style` `air` for airways), `units` (optional per-unit `domain`, `minSpd`, `patrol` or `route`) and `spawn` templates.
- **Plugin**: `CGF.registerBehaviour`, `CGF.registerFactor` or `CGF.registerMalfunction` in a script listed under `plugins`.

### More harness ideas

| Harness | How it behaves | Needs |
| --- | --- | --- |
| Allied exercise partner | Expects check-ins and formation keeping; "tension" is coordination friction | `formation` behaviour, `missedCheckIn` factor |
| Intelligence collector | Shadows at long range and never threatens | `shadow`, low weights |
| Submarine / stealth threat | Hidden until close; reacts to noise and active sonar or radar | visibility flag, `noise` factor |
| Sanctions runner / smuggler | Goes dark and evades warships | `evade` behaviour |
| VBSS / checkpoint compliance | Complies or resists depending on hail wording and approach | `comply` behaviour, `hailTone` factor |
| SAR / humanitarian | Distress calls and time pressure | static units, timed messages |
| Drone / USV swarm | Many small units probing from several bearings | `swarm`, `approach` |
| Mine or IED threat | Static hazards along a route | hazard zones |
| Escort convoy attackers | Target the weakest civil unit, not the trainee | behaviours that target civil units |

---

## 8. Notes

- Tested in Chrome and Edge. Tuning numbers are starting points; adjust them in the harness files or with the sliders.
- Countries other than Blue are fictional and unnamed. Behaviour is illustrative and is not doctrine.
- Symbology is a simplified MIL-STD-2525 / APP-6-style scheme (no modifiers, echelons or altitude data blocks).
