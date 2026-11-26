# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- The owner, planning his own Instagram feed.
- Any creator who lands on the public site. They arrive with a batch of photos and no account, on a phone or a desktop, and have never seen the tool before.

Job: decide how a set of photos will look as an Instagram profile grid before posting, then get files ready to upload in the right order.

## Product Purpose

InstaGrid is a browser-only Instagram feed planner. The user arranges images on a 3-column grid of 3:4 cells, lets one image span several cells or splits it into pieces, adjusts each image inside its frame, and exports every cell as a numbered 1080×1350 JPEG in Instagram upload order.

Success: the exported files, uploaded in number order, produce on the real profile exactly the grid the user saw in the tool.

## Positioning

Export is numbered in upload order (right to left, bottom to top) and matches the on-screen grid cell for cell, so a multi-cell composition survives the trip to Instagram. Everything runs in the browser: no account, no upload to a server, nothing stored online. Photos stay on the user's own devices; the only time they move is when the user sends them from one of their devices to another, directly and encrypted.

## Operating Context

- Used on desktop (mouse and keyboard) and on mobile (touch). Both are first-class; neither is a reduced version of the other.
- Photos come from the device: file picker, drag and drop, paste. Or from the user's phone: the device shows a QR code, the phone opens it and sends photos straight to it.
- Work persists locally in the browser (IndexedDB) as named projects.
- Output goes to the Instagram app, posted by hand in file-number order.
- Hosted as a static site on GitHub Pages at instagrid.z4yross.com.

## Capabilities and Constraints

Confirmed capabilities (v1 feature set, rebuilt, plus join and split):

- 3-column grid, 3:4 cells, rows grow with content.
- Image blocks: move, resize across cells, multi-select, copy and paste, delete.
- Per-image adjust: pan, zoom, rotate in 90° steps, flip, bars color.
- Split: an image spanning several cells becomes 1-cell pieces that move independently and keep their crop.
- Join: adjacent blocks become one larger block with one image.
- Placeholder cells with a solid color.
- Upload-order number on each image cell.
- Undo and redo.
- Named projects saved in the browser, autosave.
- Add photos from a phone by scanning a QR code: device to device, nothing stored online.
- Symmetry patterns: mirror a photo across 1 to 12 lines (mirror, four-way, kaleidoscope), choose which part is mirrored, and place the result on the grid. A pattern can be opened and changed again.
- Light and dark themes; post numbers on the grid can be hidden while editing.
- Export all cells as 1080×1350 JPEG, as a ZIP or as individual files. Low-resolution warning.

Constraints:

- No backend of our own, no auth, no cost to run. The phone-to-device transfer relies on a third-party WebRTC connection service to pair the two devices; it cannot read the photos. Owner-approved exception.
- Rebuilt from scratch on branch `remake`; v1 on `main` stays deployed until the owner approves the swap.
- Stack: React 19, TypeScript, Vite, Tailwind 4, Zustand.
- Existing v1 data in users' browsers must be migrated, never deleted.

Undecided:

- Whether grid zoom by row count (v1) stays or plain scroll replaces it.
- On join of different images, which image is kept.

## Brand Commitments

- Name: InstaGrid.
- Mark: 3×3 grid icon (`public/favicon.svg`).
- Must not read as a cluttered editor with many panels and buttons (owner's stated anti-reference). v1's piled-up toolbars, floating button and interaction modes are the concrete example to avoid.
- Chosen character reference: quiet light studio, photo at the center, thin controls at the side (Diana Larussa, "Photo Editor UI", Dribbble shot 27300066). Reference for character, not for copying.

## Evidence on Hand

- v1 source and its history: `main@2ef5b8c`, including `SPEC.md` with 103 logged bugs, most of them mobile interaction.
- Live v1 at instagrid.z4yross.com.
- No testimonials, user counts, or press exist. Do not invent any.
- No sample photo set ships with the repo; demo imagery must be sourced or authored and labeled as sample.

## Product Principles

1. The photos are the content. The interface stays out of their way and never tints how they look.
2. What you see is what you export. Screen and export come from the same geometry.
3. One obvious way to do each thing. No modes that change what a gesture means without the user asking.
4. Desktop and mobile each get the interaction that is native to them.
5. A newcomer can place, adjust and export a first grid without instructions.

## Accessibility & Inclusion

WCAG AA contrast and respect for reduced-motion settings, proposed as the default to the owner on the board and not objected to. Touch targets at least 44px. Full keyboard operation on desktop.
