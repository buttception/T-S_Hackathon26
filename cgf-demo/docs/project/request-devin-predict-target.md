# Request for Devin: `Adapt.predictTarget`

**From**: JL (allocation page). **To**: Devin (`js/adapt/`). **Date**: 2026-10-29. **Status**: done 2026-10-29. Devin built `js/adapt/predict.js` (decision 14 in `js/adapt/DECISIONS.md`); `allocate.html` loads it, and `tests/allocate.html` checks that the page's built-in preview agrees with it for every seeded trainee in every seat, in both modes. The preview stays as a fallback.

## What the allocation page needs

Before a run starts, the instructor seats trainees in crews. Beside each seated trainee the page shows the engine's likely first target, for example "Likely first target: hail discipline (0.26)". The answer must be the one the live policy would give, so the instructor can trust the preview. The page calls `Adapt.predictTarget` once per seated trainee, every time the selection changes.

The page already works without it: it falls back to a preview that applies the rule in INTERFACES §5.1 and labels the result "(preview)". When your function is loaded, the page uses it and drops the label. The two must agree.

## The call

```js
Adapt.predictTarget({ profile, seat, competencies, mode }) -> Prediction
```

| Input | Meaning |
|---|---|
| `profile` | A trainee profile, INTERFACES §5 (`competencies` holds `{alpha, beta}`). A copy; do not keep a reference |
| `seat` | The seat id, for example `navigation` |
| `competencies` | The competency ids that seat exercises (INTERFACES §1.1). The page passes `seatFocus[seat]` from `fixtures/platforms.js` |
| `mode` | `adaptive` or `fixed` |

```js
Prediction = {
  competency: 'hail_discipline' | null,   // the target, or null when there is none
  mean: 0.26,                             // that competency's mean, alpha / (alpha + beta)
  evidence: 19,                           // alpha + beta
  reason: 'weakest_in_seat' | 'weakest_overall' | 'no_evidence' | 'fixed_mode',
  settings: ['weight.ignoredWarning', 'sensitivity']   // what the first adjustment would nudge, [] if unknown
}
```

`reason` values:
- `weakest_in_seat`: the weakest competency with enough evidence among `competencies`.
- `weakest_overall`: none of those has enough evidence, so the weakest with enough evidence among all competencies.
- `no_evidence`: nothing has enough evidence. `competency` is `null`.
- `fixed_mode`: `mode` is `fixed`. `competency` is `null`, and no adjustment will happen.

## Requirements

1. **Same rule as the live policy.** It must call the same code that picks the first target in `Adapt.evaluate`, not a copy. If the two can disagree, the preview is misleading.
2. **Pure.** No `localStorage`, no simulation state, no randomness, no clock, no change to its inputs. Same input, same output.
3. **Standalone.** Put it in its own file, `js/adapt/predict.js`, that defines `window.Adapt.predictTarget` and needs nothing else loaded (not `engine.js`, not the runtime). The allocation page does not load the simulator's scripts.
4. **Fast.** The page calls it a handful of times per click.
5. **Never throw.** Return `{competency: null, reason: 'no_evidence', mean: null, evidence: 0, settings: []}` for input you cannot read. The page also catches errors and falls back, but a clean answer is better.
6. **`settings` is optional but valuable.** It lets the page say "Nudges: weight.ignoredWarning, sensitivity", so the instructor sees what will change. Use the setting names of INTERFACES §2 and the tactic mapping in PLAN §7, and only settings inside the instructor's envelope would apply; the page does not pass the envelope, so list the settings the tactic uses.
7. **Tie-break.** When two competencies have the same mean, the one earlier in the `competencies` list wins. The page's preview does the same.

## Hand-off

1. Build `js/adapt/predict.js` with a test that checks it against the same cases as the page's preview (see `tests/allocate.html`, the `previewTarget` tests).
2. Tell JL when it is merged. JL adds the script tag to `allocate.html` (the page does not load it today, to avoid a missing-file error).
3. If the rule in INTERFACES §5.1 needs to change, say so first: the contract and the page's preview change together.

## Not needed now

- A prediction for the whole crew. The page asks per seat.
- Anything about steering directives or live pressure. This is the first target only.
