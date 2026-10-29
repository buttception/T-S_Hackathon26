# Presenting the CGF Trainer

A short guide for showing the demo to judges or management. There are two versions: a **5-minute pitch** using the long
harness demo, or a **2-minute pitch** using the sea + air demo.

## Before you start (2 minutes)

- Open `runtime.html` in Chrome or Edge on the presenting laptop and make the window full screen (`F11`).
- Choose **Harness reuse and prompting: sea, land, air** in the Demo dropdown, but don't press Play yet.
- Turn off notifications. Unplug the network cable or switch on airplane mode: running offline is part of the pitch.
- Backup: have `runtime.html?demo=harness&loop=1` open in a second tab. It plays by itself, so you can talk over it if anything goes wrong.

## 5-minute talk track (long demo)

**1. The problem (30 s, before pressing Play)**
> "Today, opposing and civilian forces in our trainers follow fixed scripts, and every new premise or domain means new scripting.
> We built computer-generated forces that react to what the trainee does, with behaviour packaged as harnesses that we reuse
> across sea, land and air, and that the instructor drives with plain-language prompts."

**2. Press Play (about 4 min, hands off).** The captions tell the story. Point at the screen at these moments:

| Part | When the caption says… | Point at… |
| --- | --- | --- |
| 1 · Sea | "The instructor drives the scenario by prompt" | The prompt being typed into the command box: `escalate R-21` |
| 1 · Sea | "Under the Hostile harness…" | R-21 going Warn → Harass → Weapons ready, and the red fire-control line |
| 1 · Sea | "Restart, and change ONLY the harness" | The prompt `restart; set red to non-hostile` |
| 1 · Sea | "…the same manoeuvre" | **The key moment:** same prompt, same manoeuvre, but now R-21 queries and escorts. The behaviour comes from the harness, not the script |
| 1 · Sea | "One prompt can hold several injects" | `spawn black; force B-31 block; force B-41 block; fog` |
| 2 · Land | "A new scenario file, but the SAME harness files" | Land symbols (friend rectangle), roads, and the legend: same harness names |
| 2 · Land | "roadblock" / "Civilian vehicles…" | The grey-zone militia blocking the road, and civilian vehicles fleeing, just as the merchant ships did at sea |
| 3 · Air | "Fighters, drones and airliners" | Air symbols (domes, tents), airways, ranges now in tens of nautical miles |
| 3 · Air | "Prompt the swap mid-intercept" | Red fighters switching from threatening to escorting |
| 4 · Sea + air | "Red ships and Red fighters share ONE harness" | Both the ships and the jets reacting together, with merchants below and airliners above fleeing |
| 4 · Sea + air | "The CGF log" | Every decision with its reasons, exportable to CSV for the debrief |

**3. Why it matters (45 s)**
> "Write a behaviour once and use it everywhere. Hostile, non-hostile, grey-zone, raiders and civil traffic are five files that
> drive ships, vehicles and aircraft. A new premise is a new harness; a new area is a new scenario file; neither needs a new simulator.
> Instructors control it in plain language, and every CGF decision is explainable and logged. It runs from a folder, fully offline."

**4. Plain-English prompting with a local LLM (2–3 min, optional)**

Play **Local LLM prompting, plain English**, or type a request yourself on the Instructor tab, for example
*"Make the Red jets a bit more aggressive, and have the Black drone get in BLUE-1's way."* Point at the preview card:
> "A language model running on this laptop turns the instructor's words into simulator commands. It can only propose
> commands that exist and refer to units that are really there; everything is checked and previewed, then logged.
> If the model is down, the keyword parser takes over."

Before presenting, start the model server and press **Setup → Local LLM → Test connection** (see PROMPTING.md for setup).
Without a model the demo still runs, using its keyword fallbacks, so say "keyword mode" instead of "the model".

**5. Next steps (15 s)**
> "Next: locally generated radio chatter in each force's voice, inject timelines, and replay for the debrief."

## 2-minute version

Play **Sea and air together**. Say the problem line, let it run, then give the "why it matters" line.

## If someone wants to try it

Press `Esc` to take control. Choose **Freeplay** so nothing ends the run, then let them steer (`A`/`D`, `W`/`S`, click the map)
or type a prompt such as *"bring in another Red fighter"*, `set red to hostile` or `load land`.

## Likely questions

- **Is it AI?** The forces are rule-based and explainable: every reaction comes from weighted factors shown in the log.
  That is deliberate for training and accreditation. The local LLM only interprets the instructor's prompts into checked, previewed commands; it never controls the forces.
- **Which model, and where does it run?** A small open-weight model (e.g. Qwen2.5 3B) on Ollama or llama.cpp on the training machine or local network. No cloud.
- **How hard is a new domain or scenario?** One scenario file (map, forces, units, domain scale). The harnesses are reused as they are.
- **Does it need the internet?** No. Everything is local files.
- **Can it drive our real simulators?** The CGF logic (factors → tension → states → behaviours) is independent of the display,
  and could drive entities in an existing simulator through its interface.
