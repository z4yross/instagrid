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
| V4 | Export numbering = left-to-right per row, bottom-to-top. Only non-empty cells (with images) numbered, starting from 1. |
| V5 | Undo/redo only covers canvas state mutations (block add/move/resize/delete, transform). Not file uploads. |
| V6 | Low-res warning shown if source image width < 1080px. Non-blocking. |
| V7 | Grid rows grow dynamically — minimum 3 rows always visible, adds rows as blocks fill bottom. |
| ~~V8~~ | ~~fillMode removed — single mode: contain with bars~~ DEPRECATED v2 |
| ~~V9~~ | ~~Single-cell export~~ DEPRECATED v2 |
| ~~V10~~ | ~~Cell-mode edits~~ DEPRECATED v2 |
| V11 | Images always render with objectFit:contain + bars color background. No zoom/cover mode. |
| V12 | Group selection: multiple blocks selected, move/transform together, no overlap with non-selected. |
| V13 | Auto-flow: on upload/move, blocks snap to first available position (top-left priority). |
| V14 | Placeholders: empty cells can hold solid color or gradient (from adjacent images). |
| V15 | localStorage: state persists on every mutation. Restore on load. |
| V16 | Arrow keys: pan image (not block position). Direction rotates with image rotation. |
| ~~V17~~ | ~~Grid zoom: viewport zoom 50%-200%, pan via drag. Does not affect export size.~~ DEPRECATED v3 |
| V18 | localStorage quota errors caught, logged to console. User warned when storage fails. |
| V19 | Group drag shows visual preview of all selected blocks, not just dragged block. |
| V20 | Grid zoom adds/removes visible rows (not CSS scale). Grid stays centered. No pan controls. |

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
| ~~T7~~ | ~~x~~ | ~~Fill mode~~ DEPRECATED v2 | ~~V8~~ |
| ~~T8~~ | ~~x~~ | ~~Block toolbar with fillMode toggle~~ DEPRECATED v2 | ~~C9~~ |
| ~~T9~~ | ~~x~~ | ~~Cell mode~~ DEPRECATED v2 | ~~V10~~ |
| T10 | x | Upload order indicator: number badge on each cell (Instagram order per V4) | V4 |
| T11 | x | Preview panel: right-side or modal, live Instagram profile simulation, shows upload numbers | V4 |
| T12 | x | Export pipeline: OffscreenCanvas renders each cell at 1080×1350, names by upload order, bundles ZIP | I.canvas,I.zip,V3,V4 |
| T13 | x | Per-cell export: right-click or button downloads single cell as JPG | V9 |
| T14 | x | Undo/redo: Ctrl+Z / Ctrl+Y wired to zundo | V5 |
| T15 | x | Sidebar: thumbnail list of uploaded images, upload button, "Export all" + "Clear canvas" actions | — |
| T16 | x | Grid guide toggle button in toolbar | V7 |
| T17 | x | Dark mode global styles, app layout (sidebar + canvas + optional preview panel) | C3 |

### v2 Tasks

| T18 | x | Remove fillMode from types/store/components — single mode: contain + bars | V11 |
| T19 | x | Remove cell mode: double-click, CellModeOverlay, cellOverrides, cellOrder | V11 |
| T20 | x | localStorage: persist/restore state on mutation (debounced 500ms) | V15 |
| T21 | x | Right sidebar toolbar: always visible, context-aware enable/disable | — |
| T22 | x | Custom color picker component for bars (replace `<input type="color">`) | — |
| T23 | x | Arrow keys pan image: ←→↑↓ modify transform.panX/panY, rotated by transform.rotation | V16 |
| T24 | x | Group selection: Shift+click blocks, render selection box, move/transform as group | V12 |
| T25 | x | Auto-flow: on upload/move, snap block to first free position (left→right, top→bottom) | V13 |
| T26 | x | Placeholder blocks: add/remove, render solid color or gradient from adjacent images | V14 |
| T27 | x | Grid zoom/pan: zoom controls (50%-200%), pan via canvas drag, preserve cell sizes | V17 |
| T28 | x | Style improvements: polish buttons, hover states, transitions | — |

### v3 Tasks (bug fixes)

| T29 | x | Redesign right toolbar as slim icon-only vertical bar (no section labels) | B5 |
| T30 | . | Group drag: custom DndKit overlay showing all selected blocks preview | V19, B6 |
| T31 | . | Group drag: smart row wrapping on border collision (not merge) | B7 |
| T32 | x | Grid zoom: replace CSS scale with visible row count adjustment, center grid | V20, B8 |
| T33 | x | localStorage: catch QuotaExceededError, log + warn user, graceful degradation | V18, B4 |
| T34 | x | Export numbering: skip empty/placeholder cells, only number cells with images | V4, B9 |
| T35 | x | Grid zoom: ensure gridRows >= visibleRows to show empty cells on zoom out | B10 |

---

## §B — Bug Log

| id | date | cause | fix |
|----|------|-------|-----|
| B1 | 2026-05-23 | Export numbering right-to-left top-to-bottom instead of left-to-right bottom-to-top | Fixed cellUploadNumber formula |
| B2 | 2026-05-23 | Cell mode edits not reflected in grid view | Cell overrides not applied in block render |
| B3 | 2026-05-23 | Bars mode in cell mode: image positioning uses relative pixels, hard to see bars color | Geometry issues with multi-cell blocks in cell mode |
| B4 | 2026-05-23 | localStorage not persisting images/grid state on page reload | Data URLs exceed localStorage quota (5-10MB), saveState fails silently → V18 |
| B5 | 2026-05-23 | Right toolbar too wide with categories, expected slim icon-only bar | RightToolbar uses 240px with section labels → T29 |
| B6 | 2026-05-23 | Group drag shows single image preview, not whole group | DndKit only shows dragged element, need custom overlay → V19, T30 |
| B7 | 2026-05-23 | Group drag border collision merges blocks instead of wrapping to adjacent row | Collision detection doesn't handle row wrapping → T31 |
| B8 | 2026-05-23 | Grid zoom should add/remove rows and center grid, not scale with pan | Current zoom uses CSS transform, should modify visible row count → V20, T32 |
| B9 | 2026-05-23 | Export numbering counts empty/placeholder cells, should only number cells with images | cellUploadNumber gives sequential numbers to all cells → V4 updated, T34 |
| B10 | 2026-05-23 | Zoom out (add rows) doesn't show empty grid cells | gridRows only expands for blocks, should show empty cells when visibleRows > gridRows → T35 |

