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
