# Pitch deck source

13 slides, built as a Slides artifact (private, owner JL): https://claude.ai/artifact/SzeeUcQmXhaUHG6cqYtYT8

- `project/deck.json`: the index (order, sections, fonts).
- `project/slides/<id>.html`: one slide each, with speaker notes in the `<aside>`.
- `images/`: the four screenshots, taken from `main` on 2026-10-29 (`allocate`, `runtime`, `report`, `cohort`).

The slides point at uploaded copies of the images (`/_blob/<id>`); these map to the files here:

| Asset id | File |
|---|---|
| 2dc30138ed1ccd609d4b085862a9486b | `images/allocate.png` |
| 0fc2946cc04b40085540665e77e9791c | `images/runtime.png` |
| 32fc2f99ddc7dd25ac6074a7e74985be | `images/report.png` |
| 2b443c9e5d26478f93d4e97005d94b80 | `images/cohort.png` |

Theme: Eevee's `css/tokens.css` and `design/PRINCIPLES.md` (dark surfaces, violet for AI actions, status colours apart from force colours). Fonts: IBM Plex Sans and JetBrains Mono.

Open before presenting: the business-case figures are blanks (`savings-model.md`), the reasoning slide's values are illustrative, and the baseline comparison slide in `deck-outline.md` is left out until a demo seed gives enough events. Content follows `deck-outline.md` and `run-of-show.md`; if those change, update the slides.
