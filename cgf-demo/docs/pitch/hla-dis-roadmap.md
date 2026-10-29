# HLA/DIS roadmap slide (content)

**Owner**: JL. **Written**: 2026-10-29. Roadmap only: **nothing in steps 3 and 4 is built**. Label the slide "Not built".

**What to say**: the engine changes CGF settings (aggression, sensitivity, reaction delay, calm-down rate, detection, factor weights) inside the instructor's envelope. That is a small, explicit interface, so it can map onto an existing simulator's CGF controls instead of replacing the simulator.

| Step | What it means | Status |
|---|---|---|
| 1. Settings as a contract | Adjustments are records with a setting, old and new value and a reason (INTERFACES §7); the envelope clamps every one | Built |
| 2. Events as a contract | The simulator reports trainee actions as typed events (INTERFACES §4); competencies are computed from them | Built for this simulator |
| 3. Adapter to a real simulator | Map events in and adjustments out over HLA (federation object and interaction classes) or DIS (PDUs) | Not built; needs the target simulator's object model |
| 4. Trial with real cohorts | Measure sessions to proficiency with and without adaptation | Not started; needs division data |

Do not claim compatibility with any named simulator or standard version.
