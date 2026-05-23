# SPEC — Instagram Grid Planner

## §G — Goal

Build browser-only web app: plan Instagram feed by arranging image blocks on 3-col 3:4 grid, then export numbered 1080×1350px cells as ZIP.

---

## §C — Constraints

| id | constraint |
|----|------------|
| C1 | No backend. 100% browser. No auth. |
| C2 | Web only. No mobile-first breakpoints. |
| C3 | Dark mode default. |
| C4 | Stack: React 18 + TypeScript + Vite |
| C5 | Drag/resize: @dnd-kit |
| C6 | State + undo/redo: Zustand + zundo |
| C7 | Export: Canvas API native (no html2canvas) |
| C8 | ZIP: JSZip |
| C9 | Grid: 3 cols, cells 3:4 ratio (1080×1350px export) |
| C10 | Upload order: right-to-left, top-to-bottom (Instagram order) |

---

## §I — Interfaces

| id | surface |
|----|---------|
| I.fs | FileReader API — read JPG/PNG/WEBP from disk |
| I.canvas | OffscreenCanvas / Canvas 2D API — render + export cells |
| I.zip | JSZip — bundle exported cells as ZIP download |
| I.dnd | @dnd-kit/core + @dnd-kit/modifiers — drag blocks, snap to grid |
| I.store | Zustand store + zundo middleware — app state + undo/redo |

---

## §V — Invariants

| id | invariant |
|----|-----------|
| V1 | Blocks never overlap. Any drop/resize that causes collision rejected or snapped to nearest free zone. |
| V2 | Block position always snapped to grid cell boundary. No fractional cell positions. |
| V3 | Export cell size always exactly 1080×1350px regardless of canvas display size. |
| V4 | Export numbering = right-to-left per row, top-to-bottom. Cell (col=2,row=0) = 01, (col=1,row=0) = 02, (col=0,row=0) = 03, etc. |
| V5 | Undo/redo only covers canvas state mutations (block add/move/resize/delete, fill mode, pan/zoom). Not file uploads. |
| V6 | Low-res warning shown if source image width < 1080px. Non-blocking. |
| V7 | Grid rows grow dynamically — minimum 3 rows always visible, adds rows as blocks fill bottom. |
| V8 | Block image fill: zoom mode = cover (no empty space), bars mode = contain + solid color bars. |
| V9 | Single-cell export available per cell (right-click or per-cell button). Uses same Canvas pipeline as batch export. |
| V10 | Cell-mode edits (per-cell pan/zoom/rotate/reorder) stored per-cell, independent of block-level transforms. |

---

## §T — Tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | x | Scaffold Vite+React+TS project, install deps (@dnd-kit/core @dnd-kit/modifiers @dnd-kit/utilities zustand zundo jszip), configure Tailwind dark mode | C4,C5,C6,C8 |
| T2 | x | Zustand store: blocks[], gridRows, selectedBlockId, cellModeBlockId, showGuides, history via zundo | C6,V5 |
| T3 | x | Grid canvas component: 3-col layout, cell aspect 3:4, dynamic rows, visible guide lines toggle | C9,V7 |
| T4 | x | Image upload: drag-drop onto canvas + file picker, multi-file, JPG/PNG/WEBP, low-res warning | I.fs,V6 |
| T5 | x | Block component: renders image in assigned cells, drag via @dnd-kit, snap-to-grid on drop | C5,V1,V2 |
| T6 | x | Block resize: drag corner/edge handles, snap to cell boundary, update block span | C5,V1,V2 |
| T7 | x | Fill mode — zoom (cover + pan) and bars (contain + color picker), toggle per block, real-time | V8 |
| T8 | x | Block toolbar: pan/zoom image, rotate 90°/180°/270°, fill mode toggle, delete | C9 |
| T9 | x | Cell mode: double-click block → per-cell view, individual pan/zoom/rotate, drag reorder cells | V10 |
| T10 | x | Upload order indicator: number badge on each cell (Instagram order per V4) | V4 |
| T11 | x | Preview panel: right-side or modal, live Instagram profile simulation, shows upload numbers | V4 |
| T12 | x | Export pipeline: OffscreenCanvas renders each cell at 1080×1350, names by upload order, bundles ZIP | I.canvas,I.zip,V3,V4 |
| T13 | x | Per-cell export: right-click or button downloads single cell as JPG | V9 |
| T14 | x | Undo/redo: Ctrl+Z / Ctrl+Y wired to zundo | V5 |
| T15 | x | Sidebar: thumbnail list of uploaded images, upload button, "Export all" + "Clear canvas" actions | — |
| T16 | x | Grid guide toggle button in toolbar | V7 |
| T17 | x | Dark mode global styles, app layout (sidebar + canvas + optional preview panel) | C3 |

---

## §B — Bug Log

| id | date | cause | fix |
|----|------|-------|-----|
