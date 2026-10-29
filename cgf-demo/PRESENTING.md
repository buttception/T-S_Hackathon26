# Presenting the CGF Maritime Trainer

A short guide for showing the demo to judges or management. Total time: about 5 minutes.

## Before you start (2 minutes)

- Open `index.html` in Chrome or Edge on the presenting laptop and make the window full screen (`F11`).
- Choose **Full capability tour** in the Demo dropdown, but don't press Play yet.
- Turn off notifications. Unplug the network cable or switch on airplane mode: running offline is part of the pitch.
- Backup: have `index.html?demo=tour&loop=1` open in a second tab. It plays by itself, so you can talk over it if anything goes wrong.

## Talk track

**1. The problem (30 s, before pressing Play)**
> "Today, opposing and neutral forces in our ship trainers follow fixed scripts, so an instructor has to drive them by hand.
> We built computer-generated forces that react to how the trainee actually behaves, on a fully air-gapped laptop."

**2. Play the tour (about 2 min, hands off)**

Press **Play demo**. The captions carry the story, so you only need to point at the screen:

| When the caption says… | Point at… |
| --- | --- |
| Red reacts and shadows | The tension bar under the Red contact and the **Why is it reacting?** panel. The reasons are explicit, not a black box. |
| Black closes to block | The Instructor tab: one click, or one typed command, injects an incident. |
| Merchants divert | The green squares leaving the sea lane: neutral shipping reacts to conflict too. |
| Live harness swap | The Black symbols changing from dashed red diamonds (suspect) to green squares (neutral): same ships, new attitude. |
| GPS drift | The faded "true position" that only the instructor sees. |
| CGF log | Every CGF decision with its reason, exportable to CSV for the debrief. |

Symbols follow MIL-STD-2525 / APP-6 identity conventions, and the RED / BLK / PIR / MER label tags show which force each contact belongs to.

**3. Hand it to the audience (1 min, optional)**

Press `Esc` to take control. Then choose **Freeplay** from the mode dropdown, so nothing ends the run, and let someone steer
(`A`/`D` to turn, `W`/`S` for speed, click the sea to steer) or type an inject such as `escalate R-21` or `spawn pirate`.

**4. Why it matters (45 s)**
> "One engine and many premises. Each force gets a harness file (hostile state, non-hostile state, grey-zone, piracy, civil shipping),
> and the instructor can swap it mid-run. A new training premise is a new file, not a new simulator.
> It runs from a folder: no install and no network, so it can be fielded in air-gapped training centres."

**5. Next steps (15 s)**
> "Next: a local LLM so instructors can type injects in plain English, generated radio chatter, and replay for the debrief."

## Other demos

| Demo | Length | Use it to show |
| --- | --- | --- |
| Full capability tour | ~2 min | Everything, in one story |
| Neutral shipping reacts | ~1 min | Second-order effects: merchants fleeing the trainee's fire-control radar |
| Piracy: speed deters | ~1.5 min | The same engine running a different project with inverted logic: speed calms pirates but would anger a navy |

## Likely questions

- **Is it AI?** The forces are rule-based and explainable: every reaction comes from weighted factors you can read in the log.
  That is deliberate for training and accreditation. An LLM is planned only for instructor input and radio chatter, running locally.
- **How hard is a new scenario?** A scenario is one file (map, forces, units) and a behaviour is one harness file. See `README.md`.
- **Does it need the internet?** No. Everything is local files.
- **Can it scale to our real simulators?** The CGF logic (factors → tension → states → behaviours) is independent of the display
  and could drive entities in an existing simulator through its interface.
