---
name: InstaGrid
description: A quiet studio for planning an Instagram grid; the photos are the only color on screen.
colors:
  ground: 'oklch(0.917 0 0)'
  ground-dark: 'oklch(0.225 0 0)'
  panel: 'oklch(0.961 0 0)'
  panel-dark: 'oklch(0.265 0 0)'
  raised: 'oklch(1 0 0)'
  raised-dark: 'oklch(0.315 0 0)'
  cell-empty: 'oklch(0.946 0 0)'
  cell-empty-dark: 'oklch(0.275 0 0)'
  line: 'oklch(0.868 0 0)'
  line-dark: 'oklch(0.38 0 0)'
  line-strong: 'oklch(0.77 0 0)'
  line-strong-dark: 'oklch(0.5 0 0)'
  ink: 'oklch(0.2 0 0)'
  ink-dark: 'oklch(0.95 0 0)'
  ink-2: 'oklch(0.41 0 0)'
  ink-2-dark: 'oklch(0.82 0 0)'
  ink-3: 'oklch(0.49 0 0)'
  ink-3-dark: 'oklch(0.7 0 0)'
  on-ink: 'oklch(1 0 0)'
  on-ink-dark: 'oklch(0.18 0 0)'
  disabled: 'oklch(0.7 0 0)'
  disabled-dark: 'oklch(0.52 0 0)'
  accent: 'oklch(0.56 0.2 36)'
  accent-ink: 'oklch(0.5 0.18 36)'
  accent-ink-dark: 'oklch(0.74 0.16 40)'
  warn-bg: 'oklch(0.96 0.035 90)'
  warn-bg-dark: 'oklch(0.31 0.045 85)'
  warn-line: 'oklch(0.83 0.1 90)'
  warn-line-dark: 'oklch(0.5 0.085 85)'
  warn-ink: 'oklch(0.42 0.09 80)'
  warn-ink-dark: 'oklch(0.91 0.08 90)'
typography:
  title:
    fontFamily: 'Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
  subtitle:
    fontFamily: 'Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: 'Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.35
  number:
    fontFamily: 'Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 700
    lineHeight: 1
    fontFeature: 'tnum'
rounded:
  control: '6px'
  chip: '4px'
spacing:
  grid-gap: '3px'
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
components:
  button:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.on-ink}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  icon-button:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    rounded: '{rounded.control}'
    size: '32px'
  order-chip:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.raised}'
    typography: '{typography.number}'
    rounded: '{rounded.chip}'
  warning-note:
    backgroundColor: '{colors.warn-bg}'
    textColor: '{colors.warn-ink}'
    rounded: '{rounded.control}'
    padding: '12px'
---

# Design System: InstaGrid

Source of these tokens: the approved mockup `design/mockups/remake.html` (owner approval on board ticket i1, 2026-11-26), checked against the built app (`src/theme/tokens.css`, `src/index.css`) after the finish review of 2026-11-26.

## Overview

**Creative North Star: "The Light Table"**

A photographer's light table: a neutral, evenly lit surface where prints are laid out, compared and numbered before they go anywhere. The interface is the table and the grease pencil. It carries no hue of its own, so nothing on screen changes how a photo reads. The one mark it makes is the posting-order number, in vermilion, the way a contact sheet gets marked up.

The tool is dense where the work is (the grid) and sparse everywhere else. One canvas, one library, one inspector. Two canvas states, Arrange and Adjust. Controls are small, flat and exact on desktop, and grow to touch size on mobile without changing character.

Rejected, confirmed by the owner: the cluttered editor with many panels and buttons, and v1's pure black with a floating button and interaction-mode toggles.

**Key Characteristics:**

- Achromatic neutrals in both themes; photos are the only color besides the order numbers.
- One accent with one job: posting order.
- Flat surfaces, hairline borders, small radii.
- One sans family with tabular figures.
- Light and dark themes from one token set; dark is neutral dark gray, never pure black.

## Colors

Zero-chroma grays for every surface and all text, one vermilion, and an amber reserved for the low-resolution warning.

### Primary

- **Safelight Vermilion** (`accent`): the upload-order number chip on every image cell, the same numbers in the inspector, and the export strip and file names. `accent-ink` is the text-weight variant for vermilion on a neutral surface.

### Neutral

- **Table Ground** (`ground`): the canvas behind the grid.
- **Panel** (`panel`): library and inspector surfaces, one step off the ground.
- **Raised** (`raised`): buttons, inputs, dialogs, sheets.
- **Empty Cell** (`cell-empty`): grid cells with nothing in them.
- **Hairline** (`line`, `line-strong`): borders and dividers; `line-strong` on hover and for the grid's cut lines.
- **Ink** (`ink`, `ink-2`, `ink-3`): text in three steps; `ink` is also the selection outline, the focus ring and the primary button fill.
- **On Ink** (`on-ink`): text and icons on an ink fill.
- **Amber Warning** (`warn-bg`, `warn-line`, `warn-ink`): low-resolution notice only.

Every token has a `-dark` sibling; the two are bound with `light-dark()` so one custom property serves both themes.

### Named Rules

**The No Tint Rule.** Neutrals have chroma 0 in both themes. A surround with any hue shifts how a photo's color is judged.

**The One Job Rule.** Vermilion marks posting order and nothing else. Selection, focus and primary actions use ink.

**The Not Black Rule.** The dark theme's deepest surface is `oklch(0.225 0 0)`. Pure black is v1.

## Typography

**Body Font:** Hanken Grotesk (with system-ui, -apple-system, Segoe UI, sans-serif). Self-hosted variable woff2, weights 400 to 700.

**Character:** One workhorse grotesque at small sizes. It stays out of the way like the surfaces do; hierarchy comes from weight and the three ink steps, not from size jumps.

### Hierarchy

- **Title** (600, 1.25rem, 1.25): dialog titles and the first-run headline.
- **Subtitle** (600, 0.9375rem, 1.3): panel headings, selected file name.
- **Body** (400, 0.8125rem, 1.4): everything else. 500 for control labels.
- **Label** (500, 0.75rem, 1.35): secondary metadata, hints, keyboard shortcuts.
- **Number** (700, 0.6875rem, tabular): order chips. Always two digits, zero-padded.

### Named Rules

**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on the body. Numbers never shift width.

## Layout

Desktop (821px and wider): a three-column shell, 232px library, flexible canvas, 280px inspector, under a 48px top bar. Panels sit beside the canvas and never cover it. Between 821px and 1100px the side columns narrow before anything is hidden.

Mobile (820px and narrower): the canvas runs the full width with a 16px gutter under a 56px top bar. The top bar holds the grid name, undo, redo, preview and export; the theme switch moves into the grids dialog so the name has room. The library is a bottom sheet (peek or open). When a block is selected a contextual action bar replaces the sheet's peek. Every touch control is at least 44px.

The grid zoom control (rows in view) is never drawn over photos: on desktop it is pinned in the free gutter at the canvas corner; on mobile it sits under the grid inside the scroll area and hides while something is selected.

The grid is always 3 columns of 3:4 cells with a 3px gap, centered, scrolling vertically. Spacing steps are 4, 8, 12, 16 and 24px.

## Elevation & Depth

Flat. Depth is tonal: ground, panel, raised. Shadows exist only on things that float above the page.

### Shadow Vocabulary

- **Dialog** (`box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.12)`): export dialog and other modal surfaces, over a scrim.
- **Segment thumb** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12)`): the active option in a segmented control.
- **Handle ring** (`box-shadow: 0 0 0 1px` in `on-ink`): keeps selection handles and outlines legible over any photo.

### Named Rules

**The Flat Table Rule.** Nothing that is part of the page casts a shadow. Only overlays do.

## Shapes

Small, consistent corners: 6px on controls, notes, dialogs and sheets; 4px on order chips. Grid cells and photos are square-cornered, because that is how they post. Borders are 1px hairlines. Selection is a 2px ink outline with square white handles at the corners.

## Components

### Buttons

- **Shape:** gently rounded (6px), 32px tall on desktop, 44px on mobile.
- **Default:** raised fill, hairline border, ink label at weight 500. Hover darkens the border; press darkens the fill.
- **Primary:** ink fill, on-ink label. One per view (Export).
- **Ghost:** no border or fill until hover.
- **Icon button:** 32px square, `ink-2` icon, hover fill only. Icons are 18px line icons, 1.6 stroke.
- **Pressed toggle:** ink fill, as primary (Preview while on).
- **Focus:** 2px ink outline, 2px offset, on every interactive element.
- **Motion:** 160ms background and border transitions on `cubic-bezier(0.16, 1, 0.3, 1)`.

### Order chip (signature)

Two-digit vermilion chip, white numeral, top-left of every image cell. The same chip appears in the inspector's "Posts" row and in the export strip. A multi-cell block shows one chip per cell.

### Inspector actions

A vertical list of rows: icon, label, and a right-aligned shortcut or hint in `ink-3`. Unavailable actions stay in place, dimmed, with the reason on a second line.

### Warning note

Amber fill and border, amber ink, warning icon. Used for the low-resolution notice in the inspector and as a small badge on the cell.

### Library

Two-column thumbnail grid. A placed photo carries a small check badge. "Add color cell" sits at the foot.

### Dialog

Raised surface, 6px radius, dialog shadow, scrim behind. Format choices are bordered option cards; the checked one gets an ink border.

### Mobile action bar and sheet

Action bar: five icon-over-label actions, 44px targets, above a one-line summary of the selection with a close button. Sheet: raised surface with a drag handle.

### Canvas states

- **Arrange:** selection outline and handles; Split draws the block's internal cut lines and opens them into real gaps.
- **Adjust:** the other blocks recede to a faint wash with no chips or badges, the photo shows its full extent beyond the frame at 30% and fades out before the top bar, and controls for zoom, fill or fit, rotate, flip and bars color appear in the inspector (desktop) or the bar (mobile).
- **Preview:** every overlay hides; the grid alone, as it lands on the profile.

Motion respects `prefers-reduced-motion`: transitions and the first-run count-in drop to instant.

## Do's and Don'ts

### Do:

- **Do** keep every neutral at chroma 0, in both themes.
- **Do** use vermilion only for posting order.
- **Do** use ink for selection, focus and the single primary action.
- **Do** keep panels beside the canvas on desktop, never over it.
- **Do** size touch targets at 44px or more on mobile and keep them out of screen-edge gesture zones.
- **Do** bind both themes to one token set with `light-dark()`; default to the system theme, let the toggle override and persist.

### Don't:

- **Don't** add panels, toolbars or floating buttons to fit a feature; the owner's anti-reference is the cluttered editor.
- **Don't** use pure black surfaces, gradients, glass or decorative shadows.
- **Don't** add a second accent color.
- **Don't** introduce interaction modes beyond Arrange and Adjust.
- **Don't** round or pad photos inside grid cells.
