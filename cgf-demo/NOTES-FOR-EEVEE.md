# Notes for Eevee: design requests done by Devin (temporary)

Delete this file once `design/requests.md` is updated. It lives outside `design/` because that folder is Eevee's lane.

## Mark these done in `design/requests.md`

| ID | Status to set | What changed |
|---|---|---|
| R3 | runtime part done (1211343) | Always-visible badge in the runtime header: `#modeBadge.modeBadge` with `mode-adaptive` ("↻ Adaptive practice"), `mode-fixed` ("■ Fixed assessment · no adjustments") or `mode-none` ("No adaptive session"). The names and classes match the allocation page. The host badge is JL's (8151ef8). |
| R8 | done (1211343) | Map labels declutter in `js/render.js`: a label that would overlap one already drawn moves a line down or up, with a thin leader back to its unit. |
| R9 | done (e6564f1) | "Why is it reacting?", the posture bar and the tension chart moved to the top of the Instructor tab. Trainee contacts show state, bearing, range and hail status only (no tension, no predicted next state). Map tension bars are drawn only in the instructor view. |
| R10 | done (1211343) | The after-action summary is grouped as `#aar.aarGroups > .aarGroup > h3 + .aar` (Run, Trainee, Neutral traffic, Instructor). Keyboard help is in a collapsed `<details class="keysRef">` with the summary "Keyboard and mouse". |
| R11 | done (1211343) | `#parserBadge.parserBadge` with `is-llm` ("Local LLM"), `is-fallback` ("Keyword parser", or "Keyword parser · model unavailable") or `is-offline` ("Local LLM unavailable"), beside `#llmStatus` on the Instructor tab. |
| R12 | done (1211343) | Each CGF log entry is `.act.src-engine`, `.act.src-instructor` or `.act.src-llm`. Instructor and LLM entries carry `<span class="srcTag">`. State changes are `<span class="state-chip">From</span> → <span class="state-chip">To</span>`. |
| R13 | done (1211343) | The harness library and the local LLM server settings sit in `<details class="advanced">` on the Setup tab. "Load (restart)" asks before discarding a running exercise. |
| R14 | done (1211343) | In an adaptive session, each enveloped slider gets `<div class="envelope muted small">` ("Instructor limits 0.6× to 2.0× · start 1.0×"). When the engine's last request was clamped, it adds `<span class="clamped">clamped: asked for …</span>`. |

R4 (glossary) is still open on Devin's side until `design/glossary.md` exists.

## New classes to style (they render as plain text until you do)

- `.modeBadge` on the runtime page. Its look is in `css/allocate-layout.css`, which `runtime.html` does not load. It needs a `mode-none` style too.
- `.parserBadge.is-llm`, `.is-fallback` and `.is-offline`
- `.act.src-engine`, `.src-instructor` and `.src-llm`; `.srcTag`; `.state-chip`
- `.aarGroups`, `.aarGroup` and `.aarGroup h3`
- `details.keysRef` and `details.advanced`, with their `summary`
- `.envelope` and `.clamped`
- The Instructor tab now starts with `#whyTitle`, `#why`, the posture row, `#postureBar` and `#chart`, above "Force harnesses".
