# Instructor prompting (local LLM)

Instructors drive the scenario by typing into **Instructor → Instructor prompt** and pressing Enter. There are two prompt modes:

| Mode | What you type | Needs |
| --- | --- | --- |
| **Local LLM** (default) | Plain English: *"make the red jets a bit more aggressive and have the black drone get in BLUE-1's way"* | A model server on this machine or the local network (Ollama, llama.cpp server, LM Studio, vLLM) |
| **Keyword parser** | Fixed command words: `escalate R-F1; escalate R-F2; force B-U1 block` | Nothing |

If the model server can't be reached, or it returns nothing usable, the page **falls back to the keyword parser automatically**
(this can be switched off in Setup). Everything stays on-prem: the page only talks to the model server URL you configure.

## How the LLM path works

```
instructor text ──► context (live units, forces, allowed harnesses, states, scenarios)
                ──► local model ──► JSON commands
                ──► validated against the live scenario (unknown units, wrong harness kinds, missing states are refused)
                ──► preview card: ✓ / ✗ per command ──► instructor clicks Apply (or Discard)
                ──► the same CGF.inject calls as the buttons ──► event log + CGF log
```

- The model **never acts on the simulation directly**: it can only propose commands from a fixed list, and only for things that exist.
- **Preview before applying** is on by default (Instructor tab checkbox). Hands-off demos apply automatically and still show the preview card.
- If the request is unclear, the model can ask a question instead, and the question appears in the preview card.
- Code: `js/llm.js` (prompt, schema, model call, validation) and `submitPrompt` in `js/ui.js` (preview, apply, fallback).

## Setting up the model (air-gapped)

**Recommended: Ollama** (Windows, Linux or macOS).

1. On a machine with internet access, install Ollama and pull a small instruct model:
   ```bash
   ollama pull qwen2.5:3b
   ```
   `qwen2.5:3b` (about 2 GB) runs well on a 4 GB laptop GPU. `qwen2.5:7b` or `llama3.1:8b` follow instructions more reliably but need more memory.
2. Carry the Ollama installer and the model files (the `.ollama/models` folder in the user's home directory) into the air-gapped network through your approved media-transfer process, and install them on the training machine.
3. Start Ollama (it serves on `http://localhost:11434`).
4. In the trainer: **Setup → Local LLM**, choose *Ollama*, URL `http://localhost:11434`, model `qwen2.5:3b`, then **Test connection**.

**Alternative: llama.cpp server or LM Studio** (OpenAI-compatible API). Choose *OpenAI-compatible*, set the URL (llama.cpp's default is
`http://localhost:8080`), and type the model name the server reports.

**If Test connection fails with "cannot reach"** while the server is running, the browser is probably blocking the request because of
the page's origin (opening `runtime.html` from disk uses a `file://` origin). Either:
- allow the origin on the model server (for Ollama, set the `OLLAMA_ORIGINS` environment variable, for example `OLLAMA_ORIGINS=*` on an isolated training machine, then restart Ollama), or
- serve the trainer folder locally and open `http://localhost:8765`:
  ```bash
  python -m http.server 8765 --bind 127.0.0.1 --directory T-S_Hackathon26/cgf-demo
  ```

Settings are remembered in this browser only.

## Example prompts

**Plain English (Local LLM mode)**

| Prompt | Typical result |
| --- | --- |
| Make the Red jets a bit more aggressive, and have the Black drone get in BLUE-1's way. | Escalate R-F1 and R-F2; force B-U1 to Block |
| Give the trainee a navigation problem, and have R-11 radio a warning telling them to leave Red waters. | GPS drift malfunction; R-11 radio demand |
| Things are getting out of hand. Fix the ship, make Red non-hostile and calm the Black drone down. | Repair; Red harness → Non-hostile state; calm B-U1 |
| Have all the Black militia vehicles block the road in front of BLUE-1. | Force every Black unit to Block |
| Bring in another Red fighter and switch to freeplay. | Spawn Red; mode Freeplay |
| Switch to the land border patrol scenario. | Load border-patrol |

Put a `load` or `restart` request at the end of a prompt, or in a separate prompt, because later commands in the same prompt still refer to the old scenario's units.

**Keyword parser** (also what the LLM falls back to). Several commands can be joined with `;` or `then`:

| Prompt | What happens |
| --- | --- |
| `escalate R-21` / `calm B-31` | Tension +25 / −25 |
| `force R-11 harass` | Put a unit straight into one of its harness's states |
| `set red to non-hostile` · `switch black to hostile` · `make black grey-zone` | Swap a force's harness live |
| `spawn red` · `spawn bandit` · `spawn civair` | New unit from the force's spawn template |
| `R-11 hail "Stop engines and prepare to be boarded"` | Custom radio demand (trainee answers with `H`) |
| `fog` · `clear fog` | CGF detection halved / restored |
| `rudder jam` · `engine failure` · `radar failure` · `comms down` · `gps drift` · `fc stuck` · `repair` | Ownship malfunctions |
| `freeplay` · `exercise mode` · `restart` · `load land` · `load air` · `load sea and air` · `load sea` | Mode and scenario |

## The model's instructions

The system prompt is built in `js/llm.js` (`systemPrompt`). The model must reply with JSON matching this schema:

```json
{"commands":[{"op":"escalate|calm|force|set_harness|spawn|radio|malfunction|repair|fog|restart|load|mode",
              "unit":"…","force":"…","state":"…","harness":"…","amount":25,"text":"…","id":"…","on":true,"scenario":"…","mode":"…"}],
 "question":"optional: what to ask the instructor if the request is unclear"}
```

With Ollama the schema is enforced through structured output (`format`); OpenAI-compatible servers get JSON mode.
Each request also carries a live context block, generated from the running simulation, for example:

```text
Scenario: sea-air (SEA + AIR · Strait transit with air activity). Domain: sea. Trainee: BLUE-1 (RSN). Mode: freeplay.
Forces:
- red (tag RED, "Red force", state): current harness hostile-state; allowed harnesses: hostile-state, non-hostile-state, grey-zone; can spawn
Units:
- R-F1: Fighter, force red, air, state "Patrol" (tension 20); states: Patrol > Shadow > Warn > Harass > Weapons ready
```

To see exactly what the model receives, run `CGF.llm.buildContext()` and `CGF.llm.systemPrompt()` in the browser console.

## Demo

**Local LLM prompting, plain English (~3 min)** in the Demo dropdown types natural-language prompts, sends them to the model,
shows the preview and applies them. Each step also has a keyword fallback, so the demo still runs on a machine with no model.
