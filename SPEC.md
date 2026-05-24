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
| C11 | Git commits: conventional format (type: description), < 100 chars total |

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
| V4 | Export numbering = right-to-left per row, bottom-to-top (Instagram upload order). Only non-empty cells (with images) numbered, starting from 1. |
| V5 | Undo/redo only covers canvas state mutations (block add/move/resize/delete, transform). Not file uploads. |
| V6 | Low-res warning shown if source image width < 1080px. Non-blocking. |
| V7 | Grid rows grow dynamically — minimum 3 rows always visible, adds rows as blocks fill bottom. |
| ~~V8~~ | ~~fillMode removed — single mode: contain with bars~~ DEPRECATED v2 |
| ~~V9~~ | ~~Single-cell export~~ DEPRECATED v2 |
| ~~V10~~ | ~~Cell-mode edits~~ DEPRECATED v2 |
| V11 | Images always render with objectFit:contain + bars color background. No zoom/cover mode. |
| V12 | Group selection: Ctrl+click toggles individual, Shift+click selects range. Move/transform together, no overlap with non-selected. |
| V13 | Auto-flow: on upload/move, blocks snap to first available position (top-left priority). |
| V14 | Placeholders: empty cells can hold solid color or gradient (from adjacent images). |
| V15 | localStorage: state persists on every mutation. Restore on load. |
| V16 | Arrow keys: pan image (not block position). Direction rotates with image rotation. |
| ~~V17~~ | ~~Grid zoom: viewport zoom 50%-200%, pan via drag. Does not affect export size.~~ DEPRECATED v3 |
| V18 | localStorage quota errors caught, logged to console. User warned when storage fails. |
| V19 | Group drag shows visual preview of all selected blocks, not just dragged block. |
| V20 | Grid zoom adds/removes visible rows (not CSS scale). Grid stays centered. No pan controls. |
| V21 | Grid rows shrink when zooming in. If trailing rows empty, gridRows reduced to match highest block + 1 row min. |
| V22 | IndexedDB: images persist via IndexedDB (not localStorage). Blocks/gridRows in localStorage. No quota issues. |
| V23 | Loading state: skeleton placeholders in sidebar thumbnails + grid blocks during IDB restore. No fullscreen overlay. Skeleton count matches actual image count from IDB. |
| V24 | Export crops visible image portion per cell with transforms applied. Not contain full image. Each 1080×1350 shows only what's visible in that grid cell (like Instagram carousel: 1010px crop + 35px bars each side). |
| V25 | UI components fit containers. Width/height calculations include padding + gaps. No overflow. |
| V26 | Save profile button: if current profile exists update it directly. Prompt for name only if unsaved/new profile. |
| V27 | Autosave: profiles save automatically on state change (debounced 2s). Manual save available. |

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
| T30 | x | Group drag: custom DndKit overlay showing all selected blocks preview | V19, B6 |
| T31 | x | Group drag: smart row wrapping on border collision (not merge) | B7 |
| T32 | x | Grid zoom: replace CSS scale with visible row count adjustment, center grid | V20, B8 |
| T33 | x | localStorage: catch QuotaExceededError, log + warn user, graceful degradation | V18, B4 |
| T34 | x | Export numbering: skip empty/placeholder cells, only number cells with images | V4, B9 |
| T35 | x | Grid zoom: ensure gridRows >= visibleRows to show empty cells on zoom out | B10 |
| T36 | x | Reduce grid gradient opacity, make subtle (0.04 → 0.015 alpha) | B11 |
| T37 | x | Increase app contrast: lighter surfaces, accent borders, visual hierarchy | B12 |
| T38 | x | Remove preview feed panel (PreviewPanel, onPreview button) | — |
| T39 | x | Zoom in removes trailing empty rows: shrink gridRows to content when reducing visibleRows | V21, B13 |
| T40 | x | Design-focused color scheme: refined palette, stronger visual identity | B14 |
| T41 | x | IndexedDB for image persistence: store images in IDB, blocks/gridRows in localStorage | V22, B15 |
| T42 | x | Loading state during IndexedDB restore: show spinner/skeleton until images loaded | V23, B16 |
| T43 | x | Fix batch upload overlap: track blocks locally in handleFiles loop, findFreeCell uses updated array | V13, B17 |
| T44 | x | Fix export numbering: right-to-left scan in cellUploadNumber (reverse col loop) | V4, B18 |
| T45 | x | Ctrl+click toggle selection, Shift+click range selection (Windows-style multi-select) | V12, B19 |
| T46 | x | Replace fullscreen loading with skeleton placeholders in sidebar + grid | V23, B20 |
| T47 | x | Click sidebar thumbnail to add image back to grid (after remove/clear) | B21 |
| T48 | x | Add "Clear images" button to sidebar - clears images from memory + IDB | B22 |
| T49 | x | Add grid skeletons + IDB image count query for precise skeleton rendering | V23, B23 |
| T50 | x | Fix batch upload stacking - debug T43, verify local blocks tracking works | B24 |
| T51 | x | Fix drag duplicate visual - check DragOverlay, ensure single block rendered | B25 |
| T52 | x | Delete single image from thumbnail: X button on hover, remove image from IDB + all blocks using that imageId | V22 |
| T53 | x | Fix DragOverlay cursor offset: track initial grab position, apply offset to DragOverlay transform | B26 |
| T54 | x | Fix Shift+click range selection: sort blocks by grid position (row*COLS+col) before slicing range | V12, B27 |
| T55 | x | Fix export: crop visible image portion per cell (not contain). Apply transforms, slice by cell bounds, render 1010px crop + 35px bars each side = 1080px | V3, V24, B28 |
| T56 | x | Verify export resolution: check if images exported at full 1080x1350 or scaled down | V3, B29 |
| T57 | x | Copy/paste block: Ctrl+C selected block, Ctrl+V paste at first free cell | — |
| T58 | x | Mirror vertical/horizontal: add flip-x and flip-y transform controls to toolbar | — |
| T59 | x | Fix color picker position: open to left not right to avoid viewport overflow | B30 |
| T60 | x | Debug export: verify transform application, crop bounds, cell offset calculations | B31 |
| T61 | x | Save/load profiles: store multiple named profiles in IDB (blocks + gridRows + timestamp). Switch between profiles via UI | V15, V22 |
| T62 | x | Export bars from image content: extend/blur edge pixels instead of solid barsColor. Match IG carousel style | V24 |
| T63 | x | Fix save profile: debug IDB transaction, ensure profiles persist correctly | B32 |
| T64 | x | Add "New profile" button: clears canvas to start fresh (same as clear canvas) | — |
| T65 | x | Fix export to match grid exactly: verify transform math, coordinate systems, scaling factors | V24, B33 |
| T66 | x | Export bars: extend image naturally (not blur). Draw image scaled to full 1080px, crop center 1010px. Black bars if image smaller than full width | V24, B34 |
| T67 | x | Fix profiles store creation: delete old DB, force v2 creation on init | B35 |
| T68 | x | Replace browser dialogs (alert/confirm/prompt) with custom modal components | — |
| T69 | x | Fix export crop to exactly match grid display: pass actual grid cell size to export or store transforms as percentages | V24, B36 |
| T70 | x | Fix export cell X offset: use EXPORT_W (1080) not CROP_W (1010) for cellOffsetX | V24, B37 |
| T71 | x | Fix export for multi-row blocks: verify Y offset and image scaling use correct dimensions (crop vs full canvas) | V24, B38 |
| T72 | x | Design refresh: black/white color scheme with orange accents (remove purple), remove keyboard hint labels from sidebar | — |
| T73 | x | Increase B/W contrast: use pure black (#000) and pure white (#fff) for dramatic contrast, remove all blue/purple gradients, replace with black/white/orange gradients | — |
| T74 | x | Add white backgrounds to strategic UI elements (buttons, panels, modals) for true B/W contrast, not just black everywhere | — |
| T75 | x | Context-aware +/- zoom: if block selected zoom image (transform.zoom), else zoom grid (visibleRows) | V16,V20,V5 |
| T76 | x | ColorPicker: reduce preset grid to 10 columns (fits 220px container exactly) | V25 |
| T77 | x | Smart save: update existing profile without prompt, prompt only for new profile | V26, V15, V22 |
| T78 | x | Autosave profiles: debounced 2s on blocks/gridRows change, track currentProfileId in store | V27, V15, V22 |
| T79 | x | Update drag overlay styling to match black/white theme (remove purple gradients) | — |
| T80 | x | Add custom favicon (grid icon matching app logo) | — |

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
| B11 | 2026-05-23 | Grid gradient too obvious, visible oval looks weird | GridCanvas radial-gradient too opaque (0.04 alpha) → T36 |
| B12 | 2026-05-23 | App too dark, lacks contrast (only upload button has contrast) | Color scheme needs more visual hierarchy, accent highlights → T37 |
| B13 | 2026-05-23 | Zoom in doesn't remove trailing empty rows, keeps large gridRows | setVisibleRows only expands gridRows, never shrinks. Inverse of B10 → V21, T39 |
| B14 | 2026-05-23 | Color scheme after T37 still not design-focused enough | Need palette with stronger design identity, refined visual language → T40 |
| B15 | 2026-05-23 | Images still lost on reload despite T33 fix | localStorage quota (5-10MB) insufficient for image data URLs. V18 warns but doesn't solve persistence → V22, T41 |
| B16 | 2026-05-23 | No loading indicator on page reload, images pop in after IndexedDB delay | T41 async IDB load lacks visual feedback. User sees empty grid then sudden image load → V23, T42 |
| B17 | 2026-05-23 | Multiple images uploaded together overlap at same position | findFreeCell reads stale blocks state. Loop doesn't track newly added blocks, all find same position → V13, T43 |
| B18 | 2026-05-23 | Export numbering left-to-right, should be right-to-left for Instagram upload order | cellUploadNumber scans left-to-right but IG displays first upload on right. V4 wrong → V4 updated, T44 |
| B19 | 2026-05-23 | Group selection only Shift+click, missing Ctrl+click for Windows-style toggle | Block.tsx only checks shiftKey. Need ctrlKey/metaKey for individual add/remove, shiftKey for range → V12 updated, T45 |
| B20 | 2026-05-23 | Loading state fullscreen overlay blocks entire UI | T42 shows fullscreen spinner. Should be skeleton placeholders in sidebar + grid only → V23 updated, T46 |
| B21 | 2026-05-23 | After clear canvas, can't re-add images from sidebar (drag blocked) | clearCanvas clears blocks but images in sidebar can't be dragged to grid again → T47 |
| B22 | 2026-05-23 | No button to clear images from memory/IDB | Images persist forever. Need "Clear images" button separate from "Clear canvas" → T48 |
| B23 | 2026-05-23 | Grid skeletons missing, only sidebar has loading placeholders | T46 added sidebar skeletons but grid still empty during load → V23 updated, T49 |
| B24 | 2026-05-23 | Batch upload still stacks all images in first cell | T43 supposedly fixed but user reports images still overlap. handleFiles broken? → T50 |
| B25 | 2026-05-23 | Drag shows duplicate block visual (but places correctly) | DragOverlay or block rendering issue creates visual duplicate during drag → T51 |
| B26 | 2026-05-23 | DragOverlay offset down-right from cursor during drag | DragOverlay doesn't account for initial grab offset. Positions from top-left of block not cursor → T53 |
| B27 | 2026-05-23 | Shift+click range selection skips intermediate blocks | Range selection uses blocks array order (creation order) not visual grid order. Need sort by row*COLS+col → T54 |
| B28 | 2026-05-23 | Export not applying image transforms, crops wrong | renderCell uses contain (full image per cell) not crop (visible portion per cell). Should slice image by cell bounds like IG carousel: 1010px crop + 35px bars → V24, T55 |
| B29 | 2026-05-23 | Exported images low resolution | Export quality or scaling issue? Need verify actual resolution vs expected → T56 |
| B30 | 2026-05-23 | Color picker opens to right, overflows viewport | Picker should open to left for better positioning → T59 |
| B31 | 2026-05-23 | Exported images still incorrect after T55 | Need debug actual export output vs expected. Transform application or crop logic issue → T60 |
| B32 | 2026-05-23 | Save profile doesn't work | Need debug why saveProfile not persisting. Check IDB transaction or version upgrade → T63 |
| B33 | 2026-05-23 | Export still doesn't match grid display | Transform order fix (T60) not sufficient. Need verify exact pixel-perfect match with grid → T65 |
| B34 | 2026-05-23 | Export bars should extend image not blur | T62 uses blur. Should extend image edges naturally. Black bars only if no image extension possible → T66 |
| B35 | 2026-05-23 | Profile save broken after reload - profiles store missing | DB upgrade from v1→v2 not creating profiles store. Need force recreate or check existing connections → T67 |
| B36 | 2026-05-23 | Export crop shows wrong portion of image compared to grid display | T65/T66 used hardcoded 400px reference for pan scaling. Actual grid cell size varies by viewport. Need pass real cell size or store transforms as viewport-independent values → T69 |
| B37 | 2026-05-23 | Export multi-cell X offset wrong (zoom/panY correct, panX offset wrong) | cellOffsetX uses CROP_W (1010) but each export cell is EXPORT_W (1080) wide. Cells overlap/gap incorrectly → T70 |
| B38 | 2026-05-23 | Multi-row block export: panY misaligned | When block spans multiple rows, Y offset breaks. May need image scaling to use crop area dimensions not full canvas. T70 fix for X may have revealed Y coordinate system inconsistency → T71 |
| B39 | 2026-05-23 | ColorPicker preset grid overflow: 11 cols * (16px + 4px gap) + 24px padding = 240px, container only 220px | V25, T76 |

