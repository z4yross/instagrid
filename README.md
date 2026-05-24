# InstaGrid

Browser-based Instagram feed planner. Arrange images on a 3-column grid, then export numbered cells ready for upload.

🤖 **100% vibecodeado** with Claude Code

## Features

- **Visual grid planning** — Drag, resize, arrange images on 3×4 Instagram grid
- **Smart transforms** — Pan, zoom, rotate, flip images per cell
- **Export ready** — 1080×1350px cells numbered in Instagram upload order (right-to-left, bottom-to-top)
- **Zero backend** — 100% browser, no server, no auth
- **Persistent state** — IndexedDB for images, localStorage for layout
- **Undo/redo** — Full history with Ctrl+Z / Ctrl+Y
- **Custom colors** — Change letterbox bar colors per image
- **Profiles** — Save and switch between multiple grid layouts
- **Keyboard shortcuts** — Arrow keys pan, +/- zoom (context-aware)

## Tech Stack

- **React 18** + TypeScript
- **Vite** — Fast build tooling
- **Zustand** + zundo — State management with time travel
- **@dnd-kit** — Drag and drop
- **IndexedDB** — Client-side image storage
- **Canvas API** — High-quality export rendering
- **JSZip** — Batch export as ZIP

## Usage

1. Upload images (drag-drop or file picker)
2. Arrange on grid — drag to move, resize corners
3. Transform images — pan/zoom/rotate per cell
4. Export — download numbered cells as ZIP
5. Upload to Instagram in order (1, 2, 3...)

## Keyboard Shortcuts

- `Ctrl+Z` / `Ctrl+Y` — Undo / Redo
- `Arrow keys` — Pan selected image (rotates with image)
- `+` / `-` — Zoom image (if selected) or zoom grid (if nothing selected)
- `Delete` / `Backspace` — Remove selected blocks
- `Escape` — Deselect all
- `Ctrl+Click` — Toggle selection
- `Shift+Click` — Range selection

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed to GitHub Pages via GitHub Actions. Auto-deploys on push to `main`.

Live at: **[instagrid.z4yross.com](https://instagrid.z4yross.com)**

---

Built with 🎨 and ✨ by AI
