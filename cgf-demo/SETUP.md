# Run the demo

**One click, with the local LLM:** double-click `cgf-demo/run-demo.bat`. It starts Ollama if needed, serves the folder on
localhost, and opens the demo full screen. When the demo ends, it shows Ben's debrief and then the trainee data.

**By hand:**

1. Open `cgf-demo/runtime.html` in Chrome or Edge (double-click it).
2. In the **Demo** list, pick **Vision: adaptive CGF trainer (~5 min)** and press **Play demo**.

Or open `runtime.html?demo=vision` to start it straight away. Add `&loop=1` to repeat it.

**During the demo:** `Space` pauses, `Esc` stops and gives you control. Use full screen (`F11`) on a 1080p display or larger.

**If the page stays on "loading…"**, the browser is blocking local files. From the folder that contains `cgf-demo`, run:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory cgf-demo
```

Then open `http://localhost:8765/runtime.html?demo=vision`.

No install or internet is needed. The local LLM is optional: without it, prompts use the built-in keyword parser.
More detail: [RUNNING.md](RUNNING.md).
