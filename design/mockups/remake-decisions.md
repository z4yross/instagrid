# Remake mockup: owner decisions

Decisions the owner makes about `design/mockups/remake.html`, in his own words, each with a one-line English gloss. Newest at the bottom.

## Before the live session (pinned in the brief)

- "Estudio claro — Gris neutro claro, la foto al centro y un panel fino de controles a la derecha. Callado, tipo herramienta de fotógrafo."
  Gloss: direction is a quiet light studio; neutral light gray, photo centered, one thin control panel on the right.
- Anti-reference: "Editor recargado — Mil paneles y botones tipo Canva o Photoshop."
  Gloss: must not read as a crowded editor with many panels and buttons.

## Live session

- "ok pero le hace falta como algo interesante y tampoco vi la version mobile"
  Gloss: the first mockup is acceptable but reads flat, it needs something interesting; and he never saw the mobile version.
  Response in the mockup (second pass, awaiting his reaction):
  - Mobile gets its own view (`#mobile`, "Mobile" tab): the same file rendered at 390 × 844 inside a phone frame, with buttons for its states.
  - The accent now has one job, posting order. Number chips are vermilion everywhere (grid, inspector, export strip); selection and focus moved to ink.
  - First run plays the posting order (01 to 06 count in from the bottom right) instead of only describing it.
  - Split shows the cut lines opening into real gaps; the same button joins the pieces back.
  - Proposal, not yet a confirmed capability: a "Preview" toggle in the top bar that hides every overlay to show the grid as it lands on the profile.
- (Action in the live overlay, no words.) Discarded both number alternatives, session `c55a5d43`.
  Gloss: the vermilion number chips stay as the number treatment; frame numerals and ink chips are rejected.
- "ok flata cambiaar tema claro y oscuro"
  Gloss: the product needs a light theme and a dark theme with a switch between them.
  Response in the mockup: one OKLCH token set with light and dark values; neutral dark gray ground, never pure black; vermilion keeps its posting-order job. Toggle in the top bar on desktop and mobile. Default follows the OS, the toggle persists, `?theme=dark` or `?theme=light` forces it.
  - Two alternatives for the number treatment were staged as live variants on the grid (frame numerals with no chip; quiet ink chips with only the next post in the accent). Discarding both keeps the vermilion chips.

## Approval (board ticket i1, 2026-11-26)

- "Aprobado, a construir"
  Gloss: the mockup design is approved; next is DESIGN.md and the new SPEC for his OK, then code on `remake`.
- Preview button: "Sí, entra"
  Gloss: the Preview toggle (hide overlays, show the grid as it lands on the profile) is in scope. It was not in v1.

## Product decisions before build (board ticket i1, 2026-11-26)

- Grid + / − buttons: "Dejarlos"
  Gloss: keep the grid zoom that changes how many rows fit on screen. The approved mockup does not show it yet; the app adds it at the canvas edge.
- Joining two different photos: "no seria como una nueva?" then chose "Una imagen nueva con las dos"
  Gloss: join fuses the selected photos, as they look on the grid, into one new image that also appears in the library. Originals stay in the library.
- Commits: "Sí, commit y push"
  Gloss: one commit per spec task on `remake`, pushed to origin. Never `main`.

## First hands-on test of the built app (board ticket i1, 2026-11-26)

- "no puedo rotar ni hacer pan a la foto ni zoom"
  Gloss: he could not find how to rotate, pan or zoom a photo. The controls existed behind double-click; they now show in the inspector as soon as a photo is selected, with a button to move the photo in its frame.
- "deberia haber aguna forma de esconder los numero en la vista de la grid"
  Gloss: the post numbers must be hideable while editing. Added a toggle beside the grid zoom.
- "seriaa interesante subir las fotos desde mi telefono y verlas en el pc"
  Gloss: an idea, not yet a decision: add photos on the phone and see them on the PC. Conflicts with the no-backend choice; options put to him on the board.
