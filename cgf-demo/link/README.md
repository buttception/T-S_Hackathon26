# Link: allocation, host page and runtime

How the allocation page, the host page and the runtime connect, and how to change one side without breaking the other.

```
allocate.html  --Allocation-->  host.html  --postMessage-->  runtime.html?pane=A     (iframe)
(pick trainees, partners)       (one runtime)

Since 2026-10-29 there is one crew and one runtime; the code still builds two panes until task J8 (docs/LANES.md).
```

The runtime does not know the allocation exists. The only thing that connects it is `link/pane.js`, loaded by one `<script>` tag at the end of `runtime.html`. The tag does nothing unless the page is an iframe opened with `?pane=<letter>`, so `runtime.html` on its own behaves exactly as before.

## Who owns what

| Owner | Files |
|---|---|
| **Runtime (Devin)** | `runtime.html` (except the one link tag), `config.js`, `css/style.css`, everything in `js/` except `js/ui-allocate.js`, `harnesses/`, `scenarios/`, `plugins/`, `projects/`, `demos/`, `README.md`, `PRESENTING.md`, `PROMPTING.md` |
| **Allocation and link (JL)** | `allocate.html`, `css/allocate.css`, `js/ui-allocate.js`, `host.html`, `link/`, `contracts/`, `fixtures/`, `tests/` |

Each side can add, rename and delete files in its own area without telling the other. The two touch points are listed below.

## Touch points

1. **One tag in `runtime.html`**: `<script src="link/pane.js"></script>`, right after `js/main.js`. Leave it in place. If you restructure the page, keep a `link/pane.js` tag after the scripts that define `window.CGF`.
2. **The runtime API that `link/pane.js` uses.** If you need to rename or remove any of these, tell JL first, or update `link/pane.js` in the same commit:

   | Call | Used for |
   |---|---|
   | `CGF.loadScenario(id)` | Starting the allocation's scenario |
   | `CGF.scenarios` | Checking the scenario is loaded; reading its `domain` |
   | `CGF.scenario` (`id`, `domain`) | Reporting what loaded |
   | `CGF.sim` (`running`, `outcome`, `t`, `stats`) | Status sent to the host |
   | `CGF.actions.toggleRun()` | Start and pause |
   | `CGF.on(event, fn)`, `CGF.emit(event, ...)` | `reset`, `outcome`, and the new `link-init` event |
   | `CGF.params` | Present (the link does not change it yet) |
   | `CGF.util.loadScript(src)`, `CGF.util.esc` | Loading the contracts; the overlay text |

   `link/pane.js` checks all of these when the page loads and reports any that are missing in its `hello` message. The host page shows a warning, and `tests/link.html` fails.

## What the link adds to the runtime

- A small overlay at the bottom left of a linked pane: pane letter, platform and the crew.
- `CGF.sim.link = { pane, config, seed, adaptation, envelope }` on the live sim object, set after every scenario load.
- A `link-init` event, fired with the pane's scenario config each time the link loads a scenario. Adaptation code subscribes to it instead of editing `link/pane.js`.

The link does not change `CGF.params` or any harness. The allocation's envelope is recorded on `CGF.sim.link.envelope` only: its default values (aggression 0.4, reaction 8 s) are on a different scale from the runtime's own (1 and 30 s), and using them is an adaptation-lane decision.

## Protocol

Defined and validated in `contracts/link.js`. Every message is `{ cgfLink: 1, type, pane, ...payload }`. Under `file://` origins are opaque, so each side checks the sender window (`event.source`) instead.

| Direction | Type | Payload |
|---|---|---|
| pane to host | `hello` | `api: { ok, missing[] }`, sent once, when the runtime has booted |
| host to pane | `init` | `config`: a scenario config (INTERFACES §3) |
| pane to host | `ready` | `scenario`, `domain`, `platform`, `crew` |
| host to pane | `start`, `pause`, `restart` | none |
| pane to host | `status` | `t`, `running`, `outcome`, `stats`; sent when something changes |
| pane to host | `ended` | `outcome`, `text` |
| pane to host | `record` | `record`: the INTERFACES §9.1 session record, once when an adaptive run ends |
| pane to host | `error` | `message` |
| reserved | `events` (pane to host), `apply` (host to pane) | for the adaptation loop; not sent yet |

## Session records

When an adaptive run reaches its duration, Devin's runtime emits the `session-record` event (`CGF.on('session-record', fn)`). `link/pane.js` forwards it as a `record` message and does not look inside it. The host (`link/host.js`):

1. checks it with `hostLink.checkRecord(record, config, pane)`: valid under `CGF.contracts.validateSessionRecord` (with every adjusted value inside the allocation's envelope) and the same pane, scenario, seed, mode, platform type and crew as the config the pane was given;
2. keeps only valid records, in `localStorage` under `cgf.lastRun` as `{ allocation_id, records: { A, B } }` (`hostLink.mergeRun`), and shows invalid ones with their first errors and "not saved";
3. calls Glenda's `Report.finishSession(record)`, which builds each crew member's report, appends the history entries and returns the report page URL, shown as "Open report for pane A";
4. fires `cgf:session-record` on the host window (`detail: { pane, record, errors, run }`) for anything that wants to react, such as the competency update;
5. offers "Export session records" to download the run as JSON.

A restart clears a pane's record on the page. The stored run is replaced when the next valid record for that pane arrives.

## Tests

Open `tests/link.html` in Chrome or Edge, from the folder, with no server. It runs the protocol checks and the host's record checks, then loads the real `runtime.html?pane=T` in an iframe and walks the whole handshake (hello, init, ready, start, pause, restart, bad inputs). It then runs two short sessions to their end, one adaptive and one fixed, and checks the record that arrives. It also checks that `runtime.html` with no `?pane=` sends nothing. Wait until the summary reads `34 / 34 passed`. It takes about 60 seconds.

`tests/allocate.html` covers the allocation page and the contract validators.

## Working at the same time

Both of you push to `main`. Run `git pull --rebase` before every push. Because the files above are split by owner, a rebase should only ever conflict on `runtime.html`, and only if you both edit the lines next to the link tag.
