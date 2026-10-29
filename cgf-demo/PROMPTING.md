# Instructor prompting

Instructors drive the scenario by typing plain-language prompts into **Instructor → Instructor command** and pressing Enter.
One prompt can hold several commands separated by `;` or `then`. Each command calls the same inject functions as the buttons
(`CGF.inject.*`), and every prompt is written to the event log and counted in the after-action summary.

## Prompt examples

| Prompt | What happens |
| --- | --- |
| `escalate R-21` | R-21's tension +25. It may jump a state and make a radio call |
| `calm B-31` | B-31's tension −25 |
| `force R-11 harass` | Puts R-11 straight into its harness's "Harass" state (any state name works) |
| `force B-31 close block; force B-41 close block` | Two militia units close in to block the trainee's path |
| `set red to non-hostile` | Swaps Red force's harness live; ships and aircraft keep their positions and tension |
| `switch black to hostile` | Turns Black from grey-zone into a hostile state |
| `make black grey-zone` | And back again |
| `spawn red` · `spawn bandit` · `spawn civair` | Brings in a new unit from that force's spawn template |
| `R-11 hail "Stop engines and prepare to be boarded"` | Custom radio demand; the trainee must acknowledge with `H` |
| `fog` · `clear fog` | CGF detection ranges halved / restored |
| `rudder jam` · `engine failure` · `radar failure` · `comms down` · `gps drift` · `fc stuck` · `repair` | Ownship malfunctions |
| `freeplay` · `exercise mode` | Switch run mode |
| `restart` | Reload the scenario, keeping the harness choices |
| `load land` · `load air` · `load sea and air` · `load sea` | Switch scenario |

Forces can be named by key, tag or label (`red`, `blk`, `black force`, `civ`). Units are named exactly as on the map (`R-F1`, `BND-2`, `AL 215`).

### A training-session script, written as prompts

```
load sea and air
spawn red; force R-F1 harass                 # a Red fighter comes out to harass BLUE-1
R-11 hail "Turn back, you are entering our waters"
gps drift                                    # navigation fault while under pressure
repair; set red to non-hostile               # diplomatic thaw mid-incident
spawn civair; calm R-21
```

## How a local LLM would plug in (next step)

The keyword parser in `js/ui.js` (`runCommand`) is a stand-in for an air-gapped LLM, such as a small instruct model on Ollama.
The LLM never touches the simulation directly. It turns free text into the **same structured commands**, the instructor sees a
preview and clicks Apply, and only then are the `CGF.inject.*` calls made.

Example system prompt for the local model:

```text
You convert a training instructor's request into JSON commands for a simulator.
Reply with JSON only: {"commands":[...]} where each command is one of:
  {"op":"escalate","unit":"<name>","amount":25}
  {"op":"calm","unit":"<name>","amount":25}
  {"op":"force","unit":"<name>","state":"<state name>"}
  {"op":"set_harness","force":"<force key>","harness":"<harness id>"}
  {"op":"spawn","force":"<force key>"}
  {"op":"radio","unit":"<name>","text":"<message>"}
  {"op":"malfunction","id":"rudder|engine|radar|comms|gps|fc","on":true}
  {"op":"fog","on":true}
  {"op":"restart"} | {"op":"load","scenario":"<scenario id>"}
Only use units, forces, states and harnesses from this context:
<CONTEXT: units with force and current state; forces with allowed harness ids; scenario ids>
If the request is unclear or not possible, return {"commands":[],"question":"<what to ask the instructor>"}.
```

Example:

```text
Instructor: "make the red jets a bit more aggressive and have the black drone get in BLUE-1's way"
Model:      {"commands":[{"op":"escalate","unit":"R-F1","amount":25},
                          {"op":"escalate","unit":"R-F2","amount":25},
                          {"op":"force","unit":"B-U1","state":"Block"}]}
```

The context block is generated from the live simulation (`CGF.sim.units`, `CGF.scenario.forces`, `CGF.harnessesFor(force)`), so the model
can only refer to things that exist. Every applied command still shows up in the event log and the CGF log, exactly as typed prompts do.
