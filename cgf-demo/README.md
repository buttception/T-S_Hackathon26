# CGF Maritime Trainer (offline demo)

A 2D plan-view ship-handling trainer where **computer-generated forces (CGF) react to how the trainee behaves**.
The trainee commands the Blue force ship (Singapore). Red force and Black force (two unnamed states), a non-state
pirate group and neutral merchant shipping each follow a swappable **harness** — a behaviour profile — so the same
engine can run many training premises, and the instructor can change a force's attitude while the scenario is running.

It runs as a scored **Exercise**, open-ended **Freeplay**, or a hands-off **demo** with captions (see [PRESENTING.md](PRESENTING.md)).

Everything runs in the browser from local files: no server, no install, no internet. Suitable for an air-gapped network.

---

## 1. Quick start

1. Open `index.html` in Chrome or Edge (double-click it).
2. Press **Start** (or `Space`).
3. Steer BLUE-1 north to the green **Exit point** without starting a fight.

To watch instead of play, pick a demo next to **Play demo** (or open `index.html?demo=tour`, adding `&loop=1` to repeat it unattended).
`Esc` stops a demo and hands you control.

**Exercise vs Freeplay** (dropdown next to Restart):

| Mode | Behaviour |
| --- | --- |
| **Exercise** | Scored run. Reaching the exit point completes it; a force reaching its harness's failure state (for example Red "Weapons ready" or a pirate boarding) fails it. |
| **Freeplay** | Open-ended. Nothing ends the run. Objective and failure conditions are only logged, so the instructor can keep injecting events, swapping harnesses and spawning units for as long as needed. You can also switch a finished exercise to Freeplay to carry on from where it stopped. |

If your browser blocks local scripts (some locked-down builds do), serve the folder instead and open `http://localhost:8765`:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory T-S_Hackathon26/cgf-demo
```

### Trainee controls

| Input | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Order heading −/+ 5° |
| `W` / `S` or `↑` / `↓` | Order speed +/− 2 kts |
| Click the sea | Steer toward that point |
| Click a contact | Select it (shows *Why is it reacting?*) |
| `H` | Acknowledge a hail / comply (calms the force that hailed) |
| `R` | Toggle fire-control radar on the selected contact (very provocative) |
| `Space` | Pause / resume |
| Mouse wheel | Zoom |

---

## 2. The default scenario: Strait transit

| Force | Tag | Kind | Starting harness | Role |
| --- | --- | --- | --- | --- |
| **Blue force (Singapore)** | BLU | state | (trainee) | BLUE-1 (RSN) transits north through the strait |
| **Red force** | RED | state | Hostile navy | Holds the western coast and its territorial waters |
| **Black force** | BLK | state | Grey-zone militia (state coast guard and militia) | Claims the reef to the east |
| **Pirate group** | PIR | non-state | Piracy | Skiffs loitering south-east of the lanes, preying on slow ships |
| **Neutral shipping** | MER | civil | Civil shipping (SLOC) | Merchants on the northbound and southbound sea lanes |

Red and Black are deliberately unnamed states. Radio calls refer to them as "Red force" and "Black force".

**Map symbology** follows MIL-STD-2525 / APP-6 conventions. A symbol's shape and colour show its **standard identity**, not its nationality:

| Identity | Symbol | Used for |
| --- | --- | --- |
| Friend | blue circle | BLUE-1 |
| Hostile | red diamond | Red force under a hostile harness; the pirate group |
| Suspect | red diamond, dashed frame | Black force under the grey-zone harness |
| Neutral | green square | Merchants; any state force under the non-hostile harness |

The **tag** in front of each label (RED, BLK, PIR, MER) tells you which force a contact belongs to. A force's own colour is used only
for its claimed zones, the legend and the CGF log. Swapping a force's harness can change its identity: for example, Black switched
to *Non-hostile navy* turns from suspect to neutral on the map.

**Force kinds**: each force is a `state`, `non-state` or `civil` actor, and only accepts harnesses of the same kind.
Black force can be hostile, non-hostile or grey-zone, but never "piracy"; pirates use the non-state harness.

**What to expect**

- A steady transit up the middle at moderate speed stays calm.
- Cutting toward the Red headland, closing Red units, pointing your bow at them, ignoring warnings or using fire-control
  radar escalates Red: Patrol → Shadow → Warn → Harass → **Weapons ready**. Reaching Weapons ready **fails** the scenario.
- Entering Black's claimed waters makes the militia swarm, then form a line to block your path.
- **Merchants react too.** If a confrontation starts near them (an escalated Red/Black unit, or you using fire-control radar),
  they speed up, leave the lane, then flee the area at best speed. Once things calm down they return to the lane.

- The **pirate group** is the opposite of a navy: slow, predictable ships encourage it, while speed, manoeuvre and visible
  weapons deter it. Transiting near the skiffs at 22 kts or more gets you through; dawdling gets you boarded.

A second scenario, **Piracy drill** (Setup tab → Scenario), is a separate anti-piracy project in a high-risk area, built from the same engine.

---

## 3. The panel tabs

### Trainee

- **Trainee posture**: how provocative the trainee looks to the CGF (Cautious / Assertive / Provocative), plus a chart of the highest armed-CGF tension (red) against the trainee's provocation (blue).
- **Contacts**: every contact on radar, with force, state, tension (or *alarm* for merchants), bearing and range. *HAIL PENDING (H)* means a force is waiting for you to acknowledge.
- **Why is it reacting?**: for the selected CGF unit, each factor currently pushing its tension up (orange) or down (green).
- **After-action summary**: peak state per force, time in foreign waters, warnings ignored, merchants fleeing, injects and so on.
- **Event log**: everything that happened, in order.

### Instructor

- **Force harnesses (switch live)**: one dropdown per force, listing only harnesses of that force's kind. Changing it swaps that force's behaviour immediately while keeping its ships, positions and tension. Example: switch Red from *Hostile navy* to *Non-hostile navy* mid-transit to simulate a diplomatic thaw, or Black from *Grey-zone militia* to *Hostile navy* to simulate an escalation.
- **Instructor command**: type free text, for example:
  - `escalate R-21`, `calm B-31`
  - `force R-11 harass`, `force B-31 block` (any state name of that unit's harness)
  - `set red to non-hostile`, `switch black to hostile`, `make black grey-zone`
  - `spawn red`, `spawn black`, `spawn pirate`, `spawn white`
  - `freeplay`, `exercise mode`
  - `R-11 hail "Stop engines and prepare to be boarded"`
  - `fog`, `clear fog`
  - `rudder jam`, `engine failure`, `radar failure`, `comms down`, `gps drift`, `fc stuck`, `repair`

  This is a keyword parser for the demo. A local LLM (for example via Ollama) can replace `runCommand` in `js/ui.js` and call the same `CGF.inject.*` functions.
- **Contact injects**: escalate or de-escalate a unit, force it into any state, or send a custom radio demand that the trainee must acknowledge.
- **Scenario injects**: spawn a unit for any force (uses the scenario's spawn templates); fog halves CGF detection range.
- **Ownship malfunctions**: rudder jam, engine failure, radar failure, comms failure, GPS drift, fire-control radar stuck on.
  While the Instructor tab is open, the map also shows instructor-only truth: contacts hidden by radar failure, and the ship's real position under GPS drift.

### CGF log

The **important actions taken by the CGF**, newest first: escalations and stand-downs, radio calls and warnings, fire-control locks,
warnings logged as ignored, merchants diverting or fleeing, units entering the area and harness changes.

Each entry shows the unit, its force, state and tension, and **Why**: the factors that built up its tension since its previous state change.
The numbers are the cumulative push from each factor, so they can exceed the current tension when calming factors were also at work.
Filter by force, and use **Export CSV** to save the log for the debrief.

### Setup

- **Scenario**: pick one and press *Load (restart)*. *Restart* at the top keeps any harness changes you made.
- **Harness library**: read each harness's description and states, **Export selected** to JSON, edit it, and **Load harness JSON** to add it as a new harness you can assign to any force.
- **CGF parameters (live)**: global multipliers on top of each harness:

| Slider | Effect |
| --- | --- |
| Aggression | How strongly provocation raises tension |
| Sensitivity | Second multiplier on provocation (use one for "attitude", one for "difficulty") |
| Reaction delay | Seconds of sim time a unit waits before changing state |
| Calm-down rate | How fast tension decays back to the harness baseline |
| CGF detection | Range at which CGF can see the trainee |
| Time scale | Sim seconds per real second (60× by default; a full transit takes about 4 minutes) |

---

## 4. How the CGF model works

Every CGF unit has a **tension** score from 0 to 100 (for unarmed merchants it reads as *alarm*). Each sim step:

1. **Factors** score what the trainee is doing, each from 0 to 1: proximity, bow pointed at them, collision-course CPA, inside their territorial or claimed waters, fire-control radar on them, ignored warning, high or slow speed, opening range, military confrontation nearby.
2. The **harness weights** turn those into tension per minute. Positive factors are multiplied by aggression (harness × slider × the unit's temperament); negative weights calm the unit down.
3. Tension **decays** toward the harness baseline.
4. Tension crosses **state thresholds** (for example Shadow at 25, Warn at 45). The unit changes state only after the **reaction delay**, and drops back down only 5 points below the threshold, so it doesn't flicker.
5. Each state has a **behaviour** (patrol, shadow, harass, block, flee…), an optional **radio message**, an optional **warning** the trainee must acknowledge, and an optional **fire-control lock**.
6. If a harness has a `failState`, reaching it ends the scenario as a failure.

CGF can only react to the trainee within detection range. The *conflict* factor is global: merchants notice fighting even when the trainee is far away.

---

## 5. Folder structure

```
cgf-demo/
├── index.html              Layout and script tags. You rarely need to touch this.
├── config.js               The default project: which plugins, harnesses and scenarios to load
├── css/style.css
├── js/                     The engine, shared by every project
│   ├── util.js             Maths helpers (bearings, CPA, polygons…)
│   ├── engine.js           Registries, sim loop, tension model, CGF action log, injects
│   ├── behaviours.js       Built-in movement behaviours
│   ├── factors.js          Built-in provocation factors
│   ├── malfunctions.js     Built-in ownship malfunctions
│   ├── render.js           2D plan-view canvas renderer
│   ├── demo.js             Hands-off demo runner (captions, scripted steps)
│   ├── ui.js               Side panel, input, instructor command parser
│   └── main.js             Boot: loads the config and its files, starts the loop
├── demos/
│   └── demos.js            Demo scripts: tour, neutral shipping, piracy
├── plugins/
│   └── greyzone-tactics.js Example plugin adding the "block" and "swarm" behaviours
├── harnesses/              Behaviour profiles, each assignable to any force
│   ├── hostile-navy.js
│   ├── non-hostile-navy.js
│   ├── grey-zone.js
│   ├── piracy.js
│   └── civil-shipping.js
├── scenarios/
│   └── strait-transit.js   Blue (Singapore) vs Red, Black, pirates and neutral shipping
└── projects/
    └── piracy-drill/       A second, self-contained project using the same engine
        ├── config.js
        └── scenario.js
```

---

## 6. Using it for multiple projects

The engine (`js/`) never changes between projects. A **project** is just a config file listing which plugins, harnesses and scenarios to load.

- Default project: `index.html` loads `config.js`.
- Any other project: `index.html?config=projects/piracy-drill/config.js`

To start a new project:

1. Create `projects/<your-project>/config.js` (copy the piracy-drill one).
2. Add your scenario file(s) and any new harnesses or plugins, and list them in the config. Paths are relative to `index.html`.
3. Open `index.html?config=projects/<your-project>/config.js`.

Harness and scenario files are plain JavaScript that call `CGF.registerHarness({...})` or `CGF.registerScenario({...})`.
They are loaded with ordinary `<script>` tags, which is why the app works from local files without a server.

### Writing a harness

```js
CGF.registerHarness({
  id: 'my-harness',              // unique id
  name: 'My harness',            // shown in dropdowns
  description: 'One line for the instructor.',
  kind: 'state',                 // state | non-state | civil: which forces may use it
  affiliation: 'hostile',        // standard identity on the map: hostile | suspect | neutral | unknown
  armed: true,                   // false = unarmed (merchants): counts as "alarm", never a threat
  baseTension: 20,               // where tension settles when nothing is happening
  aggression: 1.3,               // multiplier on provocation
  decayPerMin: 3,                // calm-down speed toward baseTension
  ackRelief: 8,                  // tension removed when the trainee acknowledges a hail (H)
  warnRepeatSec: 240,            // how often a warning state repeats its radio call
  ignoreAfterSec: 180,           // unanswered warning counts as "ignored" after this
  reactionMult: 1,               // optional: scales the reaction-delay slider for this harness
  failState: 'Weapons ready',    // optional: reaching this state fails the scenario
  weights: {                     // tension per minute when a factor is fully true; negative calms
    proximity: 8, bowOn: 5, cpa: 8, contiguous: 6, territorial: 16,
    fcRadar: 40, ignoredWarning: 10, highSpeed: 3, opening: -6
  },
  ranges: { close: 12, cpa: 2, highSpeedKts: 24, slowSpeedKts: 10, conflictNm: 20 },
  states: [                      // ordered by "min" tension
    { name: 'Patrol', min: 0,  behaviour: 'patrol', standDown: 'Returned to patrol' },
    { name: 'Warn',   min: 45, behaviour: 'shadow', range: 3.5, warn: true,
      action: 'Closed in and issued warning',
      msg: '{unit} to warship on course {hdg}: you are approaching {force} waters.' },
    { name: 'Weapons ready', min: 85, behaviour: 'posture', range: 4, fcRadar: true,
      action: 'Took weapons-ready posture', msg: '{unit}: Weapons ready.' }
  ]
});
```

**State fields**

| Field | Meaning |
| --- | --- |
| `name`, `min` | State name and the tension at which it starts |
| `behaviour` | Movement behaviour (table below) |
| `range` | Distance in nm used by the behaviour (station distance, hold range…) |
| `speedMult` | Speed multiplier for `lane`, `patrol` and `flee` |
| `msg` | Radio call made when escalating into this state. Placeholders: `{unit}` `{force}` `{hdg}` `{own}` |
| `warn` | The trainee must acknowledge (`H`); otherwise the "ignored warning" factor kicks in |
| `fcRadar` | Unit locks fire-control radar on the ownship |
| `action`, `standDown` | Text written to the CGF action log when entering this state going up or down |

**Built-in behaviours**: `hold`, `transit`, `lane` (follow a sea-lane route), `patrol`, `shadow`, `escort`, `harass` (cross the bow),
`posture` (hold range, bow on), `approach` (close and hold at range), `flee` (run from the nearest confrontation).
The plugin adds `block` (line across the ownship's path) and `swarm` (circle the ownship).

**Built-in factors**: `proximity`, `bowOn`, `cpa`, `territorial`, `contiguous`, `fcRadar`, `ignoredWarning`, `highSpeed`, `slowSpeed`,
`opening`, `conflict` (global: escalated armed units or the trainee's fire-control radar nearby). `territorial` and `contiguous` only count
zones owned by the unit's own force.

### Writing a scenario

See `scenarios/strait-transit.js`. The main parts:

| Field | Meaning |
| --- | --- |
| `forces` | `{ key: { label, tag, kind, color, harness? } }`. `kind` is `state`, `non-state` or `civil`; `tag` prefixes map labels; `color` is used for zones, the legend and the log. The ownship's force has no harness; every other force's `harness` is its starting behaviour. A force without a harness just sails its route. |
| `ownShip` | Name, force, start position, heading, speed, max speed, turn rate |
| `objective` | Exit point; reaching it within 1.5 nm completes the scenario |
| `land`, `zones` | Polygons in nm. Zones have `kind` (`territorial` or `contiguous`) and an `owner` force |
| `lanes` | Sea lanes to draw; merchants use the same points as their `route` |
| `units` | Each with `name`, `type`, `force`, position, speeds, `turnRate`, `temperament` and either `patrol` waypoints or a `route` |
| `spawn` | Optional per-force templates for the instructor's *Spawn unit* inject |

Coordinates are nautical miles from the map centre, with x east and y north. Headings are degrees from north.

### Writing a plugin

A plugin is a script listed under `plugins` in the config. It can add any of:

```js
CGF.registerBehaviour('zigzag', (u, st, own, sim) => ({ desired: u.hdg + 30 * Math.sin(sim.t / 60), spd: u.maxSpd }));
CGF.registerFactor('nightTime', { label: 'Operating at night', global: true, fn: ctx => ctx.sim.night ? 1 : 0 });
CGF.registerMalfunction({ id: 'sonar', label: 'Sonar failure', desc: 'no sub contacts', mods: { radarRangeNm: 8 } });
```

Then use the new names in a harness (`behaviour: 'zigzag'`, `weights: { nightTime: 5 }`).

---

## 7. More harness ideas

Any of these can be built as a harness file (plus a plugin for any new behaviour), and assigned to a force of the matching kind:

| Harness | How it behaves | New behaviour or factor needed |
| --- | --- | --- |
| **Allied navy (exercise partner)** | Expects check-in calls and formation keeping; "tension" is coordination friction | `formation` behaviour, `missedCheckIn` factor |
| **Shadowing intelligence ship** | Never threatens; follows at 5–10 nm and records. Escalates only to closer surveillance | Uses `shadow`; low weights |
| **Submarine threat** | Hidden until close; reacts to the trainee's speed (noise) and pinging | `submerged` visibility flag, `noise` factor |
| **Fishing fleet (genuine)** | Ignores the trainee; nets make some areas no-go | `drift` behaviour, `fishingGear` zones |
| **Sanctions runner / smuggler** | Avoids warships, goes dark (AIS off) and runs when approached | `evade` behaviour (`flee` works as a start) |
| **Boarding / VBSS target** | Complies or resists depending on hail wording and approach speed | `comply` behaviour, `hailTone` factor |
| **Search and rescue (SAR)** | Life raft and stricken vessel; distress calls, time pressure | Static units, timed `msg` |
| **Drone / USV swarm** | Many small fast units probing from several bearings at once | Uses `swarm` and `approach`; many units |
| **Mine threat** | Static hazards in a channel; one unit lays more if provoked | `minefield` zone, `mineContact` malfunction |
| **Escort convoy** | The trainee protects merchants; CGF attacks the weakest one, not the ownship | Behaviours targeting merchants instead of the ownship |
| **Political escalation ladder** | A non-hostile navy that turns hostile when an inject fires | Two harnesses plus a live swap, already supported |
| **Coast guard law enforcement** | Polices fishing and pollution, not warships; escalates on loitering | `loiter` factor (slow speed inside a zone) |
| **Environmental / weather** | Not a force: sea state and visibility change detection and speed | Scenario-level modifiers like fog |

---

## 8. Ideas for next steps

- **Local LLM instructor assistant**: replace the keyword parser with an air-gapped model that turns free text into `CGF.inject.*` calls, shows a preview, and applies them only when the instructor clicks Apply.
- **LLM-generated radio chatter** in each force's tone, generated locally.
- **Inject timelines**: scripted events ("at T+10 min, spawn black", "if the trainee enters Red waters, Red fire-control locks") saved per scenario.
- **More demo scripts**: write your own in `demos/demos.js` (each step: caption, action, wait condition). See `js/demo.js` for the step format.
- **Replay**: record the sim each second and scrub through it in the debrief alongside the CGF action log.
- **Separate instructor screen**: a second browser window synced through a small local server.

---

## 9. Notes

- Tested in Chrome and Edge. The tuning numbers are a starting point: adjust them in the harness files or with the sliders.
- All countries other than Blue are fictional and unnamed. Behaviour is illustrative and is not doctrine.
- Symbology is a simplified, MIL-STD-2525 / APP-6-style frame and colour scheme, not a full implementation (no modifiers or echelon amplifiers).
