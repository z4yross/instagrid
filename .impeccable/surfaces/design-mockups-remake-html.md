---
version: 1
slug: 'design-mockups-remake-html'
primary_target: 'design/mockups/remake.html'
related_targets: []
---

# Surface brief: editor mockup (remake)

Scope: the InstaGrid editor, redesigned from scratch. Static mockup at `design/mockups/remake.html`. Visitor mode: Operate. Build path: code-led.

Audience and job: the owner and any creator arriving with a batch of photos and no account, on desktop or phone. They arrange photos on a 3-column grid of 3:4 cells, adjust each one in its frame, and export numbered 1080x1350 JPEGs to post in order.

Constraints: desktop and mobile are equal first-class layouts. Panels never cover the canvas on desktop. Touch targets at least 44px, nothing in OS edge-gesture zones. Only two canvas states, Arrange and Adjust. No floating action button, no mode toggles. No invented claims; sample photos are labeled as sample.

Anti-references: "Editor recargado — Mil paneles y botones tipo Canva o Photoshop." Also v1 itself: pure black, floating action button, drag-lock and resize-mode toggles.

## Direction contract

THESIS: A quiet light studio where the grid of photos is the only colored thing on screen. It refuses the crowded-editor arrangement of stacked toolbars, floating buttons and gesture modes: one canvas, one thin inspector, two states.

OWN-WORLD: Achromatic neutral grays (zero chroma, so the surround never tints a photo): canvas ground, a lighter panel layer, white controls, near-black ink. One accent, a safelight vermilion, reserved for selection, handles and focus. One sans family with tabular figures. Hairline borders, 6px radii, no decorative shadow. Signature move: the upload-order frame number, the same two-digit chip on every image cell, in the inspector, and as the filmstrip and file names in export.

STORY: The visitor sees their feed as it will look, understands that numbers are the posting order, trusts that export matches the screen, and exports.

FIRST VIEWPORT: Desktop 1440: 48px top bar (mark, project name, saved state, undo/redo, file count, Export at far right, the primary action); 232px photo library left; centered 3-column grid on the gray ground with a 2x2 block selected; 280px inspector right showing that selection. Mobile 390: top bar with Export, grid across the width with a 16px gutter, contextual action bar at the bottom when a block is selected, library as a bottom sheet otherwise.

FORM: seed: none (pinned) "Estudio claro — Gris neutro claro, la foto al centro y un panel fino de controles a la derecha. Callado, tipo herramienta de fotógrafo." Character reference: Diana Larussa, "Photo Editor UI, Minimal Web App Design" (Dribbble shot 27300066), for character only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Whether grid zoom by row count stays or plain scroll replaces it (mockup shows plain scroll).
- On join of different images, which image is kept.
- Finish review and DESIGN.md are deferred until the owner converges in the live session.
