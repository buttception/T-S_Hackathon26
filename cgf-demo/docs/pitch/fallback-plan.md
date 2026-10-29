# Fallback plan: every beat one click away

**Owner**: JL. **Written**: 2026-10-29. **Status**: a spec. Nothing in it is recorded yet.

| Item | What | How | Done |
|---|---|---|---|
| Video | One screen recording of the whole flow, allocate to cohort, with captions, under 5 minutes, saved as a local file and a second copy on a USB stick | Record the rehearsed run in `run-of-show.md` | No |
| Saved runs | A fixed baseline and an adaptive run on the demo seed | `Runs.save` keeps the last ten runs in the browser; export the records from the host page ("Export session records") and keep the JSON next to the deck | No |
| Saved report | `report.html` for the saved adaptive run | Open it from the report link the host gives; keep the session id in the notes | No |
| Screenshots | One per beat in the deck's backup slides | Take them from the rehearsed run | No |
| Rule | If a live beat fails, say so, switch to its fallback in one click, and carry on. Never debug on stage | | |

**Session replay** (listed as a next idea in the repo README) would let a saved run play back live. It is not planned for the event; the video and saved pages are the fallback.
