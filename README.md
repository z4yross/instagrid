# InstaGrid

Plan an Instagram profile grid in the browser. Lay photos out on a 3-column grid, let one photo span several posts or split it into pieces, adjust each photo inside its frame, and export every post as a numbered 1080×1350 JPEG in the order to upload.

Everything runs in the browser. No account, no server of ours, nothing stored online.

Live: [instagrid.z4yross.com](https://instagrid.z4yross.com)

## What it does

- **Grid.** 3 columns of 3:4 cells, the shape Instagram shows on a profile. Rows grow as you add photos.
- **Arrange.** Click to select, drag to move, drag a corner to make a photo span more cells. On a phone, press and hold to pick a photo up; a plain swipe scrolls.
- **Adjust.** Select a photo to zoom, rotate, flip it and pick the color of the bars where it does not reach. Double-click (or double-tap) it to move it inside its frame.
- **Split.** A photo that spans several cells becomes one piece per cell. The pieces move on their own and keep their crop.
- **Join.** Pieces of one photo merge back. Different photos are joined into one new image, which is also added to the library.
- **Symmetry.** Open a photo in the symmetry editor to mirror it across 1 to 12 lines: a plain mirror, a four-way mirror, or a kaleidoscope. Drag to choose which part is mirrored, pick the size in cells, and the pattern lands on the grid as a new image you can open and change again.
- **Color cells.** Solid-color cells for spacing. They are not exported.
- **Posting order.** Every photo cell carries its upload number. Upload `01` first, from the bottom right, and the profile ends up looking like the grid.
- **Preview.** Hides numbers and guides to show the grid as it lands on the profile. The `#` button beside the grid zoom hides just the numbers while you keep editing.
- **Export.** One 1080×1350 JPEG per cell, as a ZIP or as separate files. What exports is what the grid shows.
- **Grids.** Several named grids saved in the browser, with autosave.
- **From your phone.** A QR code on one device, scanned with a phone, lets you send photos straight to that device. They travel encrypted between your two devices; a connection service only helps them find each other.
- **Light and dark themes.** Follows the system; the switch remembers your choice.

## Keyboard

| Keys                         | Action                                       |
| ---------------------------- | -------------------------------------------- |
| `Ctrl Z` / `Ctrl Y`          | Undo / redo                                  |
| `Ctrl D`                     | Duplicate                                    |
| `Ctrl C` / `Ctrl V`          | Copy / paste blocks                          |
| `Ctrl A`                     | Select all                                   |
| `Del`                        | Delete selection                             |
| `Esc`                        | Deselect, or leave Adjust / Preview          |
| `Ctrl` click, `Shift` click  | Add to selection                             |
| Arrows                       | Move the selection one cell                  |
| `Shift` + arrows             | Resize the selected block                    |
| `Enter`                      | Select the focused block; again to adjust it |
| In Adjust: arrows, `+` / `-` | Nudge the photo, zoom                        |

## Develop

```bash
npm install
npm run dev        # local server
npm test           # unit tests
npm run typecheck
npm run lint
npm run build      # production build in dist/
```

## How it is built

React 19, TypeScript, Vite, Tailwind 4, Zustand with zundo for undo history, JSZip for the ZIP export, PeerJS and `qrcode` for the phone transfer (loaded only when used).

```
src/core/     grid rules, image geometry, split and join, posting order (pure, unit-tested)
src/store/    project state with undo, interface state, image library
src/db/       IndexedDB storage, autosave, import of data from the previous version
src/export/   canvas rendering and the export pipeline
src/ui/       canvas, panels, dialogs, desktop and mobile layouts
src/transfer/ photo transfer between two devices (WebRTC through PeerJS)
src/theme/    design tokens and theme switch
```

One function decides where a photo is drawn inside its frame. The screen and the exporter both call it, which is why an exported post matches the grid.

Project documents:

- `PRODUCT.md`: who it is for and what it must do.
- `DESIGN.md`: the visual system.
- `SPEC.md`: goals, invariants and the task list.
- `design/mockups/`: the approved mockup and the decisions made on it.

## Deploy

GitHub Pages through GitHub Actions. A push to `main` deploys.

## Data from the previous version

The first time the new version opens in a browser that used the old one, it imports the old photos, saved profiles and last layout. The old data is left untouched. Photo framing inside a cell may differ slightly, because the old version stored offsets in screen pixels without the grid size they referred to.
