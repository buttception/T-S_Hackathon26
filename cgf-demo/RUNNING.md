# Running the CGF trainer

How to set up, run, test and present the trainer, start to finish. Nothing needs installing to run it: it is a folder of
HTML and JavaScript files.

---

## 1. What you need

| Need | For | Notes |
| --- | --- | --- |
| Chrome or Edge | Everything | Any recent version. Firefox works too, but the test runner uses Edge or Chrome. |
| This folder (`cgf-demo/`) | Everything | Copy it anywhere: a laptop, a USB drive, a shared drive. |
| Python 3 | Optional: only if the browser blocks pages opened from disk | Used only as a local file server. |
| Node.js 18+ | Optional: the runtime tests (`tests/runtime/`) | No `npm install`. Uses Node's built-in test runner. |
| Ollama and a small model | Optional: plain-English prompts through a local LLM | Everything has a keyword fallback, so the demo runs without it. |

---

## 2. Run it

1. Open `runtime.html` in Chrome or Edge (double-click it, or drag it into the browser).
2. Press **Start**, or pick a demo next to **Play demo**.

If the page stays on "loading…", the browser is blocking scripts on pages opened from disk. Serve the folder instead:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory cgf-demo
```

Then open `http://localhost:8765/runtime.html`.

### Links worth bookmarking

| Link | What it does |
| --- | --- |
| `runtime.html?demo=vision` | Plays the 5-minute vision demo as soon as the page loads |
| `runtime.html?demo=vision&loop=1` | The same, on a loop (for a stand) |
| `allocate.html` | Instructor allocation: pick the crew and the envelope |
| `host.html` | Runs allocated crews side by side and collects session records |
| `report.html` | End-of-training report from a session record |

---

## 3. The 5-minute vision demo

Pick **Vision: adaptive CGF trainer (~5 min)** in the Demo list and press **Play demo**, or open
`runtime.html?demo=vision`. It runs hands-off with a short caption for each moment:

1. The problem: every trainee faces the same scripted enemy.
2. Ben (trainee_b) is weak at answering radio warnings, according to his history, so the enemy tests that first (tag *history*).
3. An enemy boat warns him and he does not answer.
4. The enemy works as a team: the other boats join in.
5. Fast-forward: Ben starts answering the warnings, so the enemy pushes harder (tag *live*). A trainee who keeps struggling gets the opposite: the enemy eases off.
6. The instructor switches the enemy to an elite force, and the trainer matches the enemy's teamwork to the crew's skill (tag *team*).
7. A plain-English instruction steers the trainer onto collision avoidance.
8. The session is saved for the report and Ben's history.
9. Fixed mode keeps the enemy the same for everyone (exams).
10. Neutral merchant ships react to the trainee: when he locks weapons radar, they flee, then return when it is switched off.
11. Each force's behaviour is a swappable file (a harness): the same files drive tanks, militia and civilian cars on land, with a live swap that turns the militia non-hostile, and fighters and airliners in the air.

The simulation speeds up through quiet stretches and slows down at each moment that matters.

**Before presenting:**
- Use a 1920×1080 screen or larger, with the browser full screen (`F11`).
- Play it through once before the audience arrives.
- `Space` pauses the demo (the captions wait too). `Esc` stops it and gives you control.
- You do not need the local LLM. Without it, the steering box uses the keyword parser and says so.

The other demos (sea, land and air harness reuse, LLM prompting, piracy and others) are in the same list. See `README.md` section 4.

---

## 4. Controls

| Input | Action |
| --- | --- |
| Drag the map | Pan |
| Mouse wheel | Zoom in or out at the pointer |
| `C` / `O` | Follow the ownship / show the whole map |
| `+` / `-` or the ×15…×480 list at the top | Simulation faster / slower |
| `A` `D` / `←` `→` | Order heading −/+ 5° |
| `W` `S` / `↑` `↓` | Order speed up / down |
| Click the map / a contact | Steer toward that point / select that contact |
| `H` | Answer a radio warning |
| `R` | Fire-control radar on the selected contact (provocative) |
| `Space` / `Esc` | Pause or resume / stop a demo |

### Teamwork and harnesses (Instructor tab)

- **Force harnesses:** switch any force's behaviour live. *Hostile state (elite)* is the elite force: closer teamwork and faster reactions.
- **Teamwork slider** per armed force: overrides the harness's teamwork (0 means each unit acts alone). The harness value comes back when the scenario reloads.
- In an adaptive session the trainer also adjusts the enemy's teamwork to the crew's measured skill. These changes are tagged *team* on the Reasoning tab.

### An adaptive session by hand (Reasoning tab)

1. Choose the trainee and a scripted behaviour (strong, or weak at answering warnings), the mode (Adaptive or Fixed) and the length in sim seconds.
2. Press **Start**. Use the speed list (×240 or ×480) to get through quiet stretches.
3. Watch **Seats** (each seat's target and live signal), **Opposition teamwork** and **Adjustments and why**. Each adjustment is tagged *history*, *live*, *team* or *instructor*.
4. Type an instruction under **Steer the AI**, press **Parse**, check the parsed directive, then **Apply**.
5. At the end, **Export session record (JSON)** saves the record that `report.html` reads.

---

## 5. Local LLM (optional)

The air-gapped way: install Ollama and pull a model on a connected machine, then carry the installer and the model folder
across through your approved transfer process.

```bash
ollama pull qwen2.5:3b
```

1. Start Ollama on the training machine. It serves on `http://localhost:11434`.
2. If the page is opened from disk, allow its origin: set the environment variable `OLLAMA_ORIGINS=*` and restart Ollama.
3. In the trainer: **Setup → Local LLM**, Ollama, URL `http://localhost:11434`, model `qwen2.5:3b`, then **Test connection**.

The model only turns instructor text into commands, and every command is checked before it is used. The model never
supplies a number. Full details are in `PROMPTING.md`.

---

## 6. Tests

Run these before every push.

**Runtime tests (Node):** from `cgf-demo/`:

```bash
node --test tests/runtime/
```

Expect every test to pass (45 at the time of writing). They cover the envelope clamp, fixed mode, determinism, cause tags,
teamwork, AI partner seats and session-record validation.

**Browser test pages (no Node needed):** open `tests/link.html`, `tests/allocate.html`, `tests/assess.html`, `tests/g1.html`
and `tests/report/` pages in the browser, or run them all headless from PowerShell:

```bash
powershell -ExecutionPolicy Bypass -File runner/run-tests.ps1
```

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Page stuck on "loading…" | Serve the folder with the Python command in section 2. |
| Map is empty or zoomed far out | Press `C` to follow the ownship, or `O` for the whole map. |
| Steering says "model unavailable" | Expected without Ollama: the keyword parser is used instead. |
| LLM test fails from a `file://` page | Set `OLLAMA_ORIGINS=*` and restart Ollama, or serve the folder over `http://localhost`. |
| Nothing happens in a demo | The demo may be paused: press `Space`. |
| A demo looks wrong after editing | Reload the page with `Ctrl+F5` to clear cached scripts. |
| The profile panel shows old values | The live profile is kept in the browser's local storage. Clear the site data to go back to the seeded profiles. |
