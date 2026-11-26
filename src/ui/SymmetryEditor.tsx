import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  clampRecipe,
  constrainRecipe,
  defaultRecipe,
  MAX_AXES,
  MAX_COLS,
  MAX_ROWS,
  MAX_SYMMETRY_ZOOM,
  MIN_AXES,
  MIN_SYMMETRY_ZOOM,
  patternName,
  toRadians,
  wedgeAngle,
} from '@/core/symmetry'
import type { SymmetryRecipe } from '@/core/symmetry'
import type { Size } from '@/core/types'
import { addSymmetryImage, updateSymmetryImage } from '@/db/session'
import { drawSymmetry, renderSymmetry, symmetryOutputSize } from '@/export/renderSymmetry'
import { imageById, useLibrary } from '@/store/library'
import type { LibraryImage } from '@/store/library'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { cx, ICON } from './classes'
import { Button, IconButton } from './kit'
import { toast, useOverlays } from './overlays'

const QUICK_AXES = [1, 2, 3, 4, 6, 8]
/** Longest side of the copy of the photo used for the live preview. */
const PREVIEW_SOURCE_MAX = 1600

const toSlider = (zoom: number) => Math.round(Math.log(zoom) * 1000)
const fromSlider = (value: number) => Math.exp(value / 1000)

/** Full-screen host: mounts the editor only while a photo is open in it. */
export function SymmetryEditor() {
  const target = useOverlays((s) => s.symmetry)
  const close = useOverlays((s) => s.closeSymmetry)
  const images = useLibrary((s) => s.images)
  const ref = useRef<HTMLDialogElement>(null)

  const source = imageById(images, target?.sourceImageId)
  const editing = imageById(images, target?.editImageId)
  const open = Boolean(target && source)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label="Symmetry"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClose={close}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ground p-0 text-ink backdrop:bg-scrim"
    >
      {open && source && (
        <Editor
          key={`${source.id}:${editing?.id ?? 'new'}`}
          source={source}
          editing={editing}
          onClose={close}
        />
      )}
    </dialog>
  )
}

interface EditorProps {
  source: LibraryImage
  /** The pattern being changed, when re-opening one. */
  editing: LibraryImage | undefined
  onClose: () => void
}

function Editor({ source, editing, onClose }: EditorProps) {
  const [recipe, setRecipe] = useState<SymmetryRecipe>(() =>
    editing?.symmetry ? clampRecipe(editing.symmetry) : defaultRecipe(source.id)
  )
  const [showLines, setShowLines] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ bitmap: CanvasImageSource; size: Size } | null>(null)
  const [box, setBox] = useState<Size>({ width: 600, height: 400 })

  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ recipe: SymmetryRecipe; cx: number; cy: number; spread: number } | null>(
    null
  )
  const ids = { zoom: useId(), turn: useId(), angle: useId() }

  // Every change is kept only as far as the photo still covers its wedge (SPEC V54).
  const constrain = (current: SymmetryRecipe, next: SymmetryRecipe) =>
    constrainRecipe(current, clampRecipe(next), symmetryOutputSize, source)
  const update = (patch: Partial<SymmetryRecipe>) =>
    setRecipe((current) => constrain(current, { ...current, ...patch }))

  // A scaled-down copy of the photo keeps the live preview smooth with large files.
  useEffect(() => {
    let cancelled = false
    let made: ImageBitmap | null = null
    const img = new Image()
    img.src = source.url
    img
      .decode()
      .then(async () => {
        const full = { width: img.naturalWidth, height: img.naturalHeight }
        const scale = Math.min(1, PREVIEW_SOURCE_MAX / Math.max(full.width, full.height))
        if (scale < 1 && typeof createImageBitmap === 'function') {
          made = await createImageBitmap(img, {
            resizeWidth: Math.round(full.width * scale),
            resizeHeight: Math.round(full.height * scale),
            resizeQuality: 'high',
          })
          if (cancelled) made.close()
          else setPreview({ bitmap: made, size: { width: made.width, height: made.height } })
        } else if (!cancelled) {
          setPreview({ bitmap: img, size: full })
        }
      })
      .catch(() => {
        if (!cancelled) toast('That photo could not be opened.', 'error')
      })
    return () => {
      cancelled = true
      made?.close()
    }
  }, [source.url])

  // Fit the result's shape inside the stage.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const output = symmetryOutputSize(recipe)
  const fit = Math.min(box.width / output.width, box.height / output.height)
  const shown = {
    width: Math.max(1, Math.floor(output.width * fit)),
    height: Math.max(1, Math.floor(output.height * fit)),
  }

  useEffect(() => {
    const el = canvas.current
    if (!el || !preview) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const width = Math.round(shown.width * ratio)
    const height = Math.round(shown.height * ratio)
    if (el.width !== width) el.width = width
    if (el.height !== height) el.height = height
    const ctx = el.getContext('2d')
    if (!ctx) return
    const frame = requestAnimationFrame(() => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      drawSymmetry(ctx, preview.bitmap, preview.size, recipe, { width, height })
    })
    return () => cancelAnimationFrame(frame)
  }, [preview, recipe, shown.width, shown.height])

  /* ---------- Moving the photo under the mirror lines ---------- */

  const points = () => [...pointers.current.values()]
  const centerOf = (list: { x: number; y: number }[]) => ({
    x: list.reduce((sum, p) => sum + p.x, 0) / list.length,
    y: list.reduce((sum, p) => sum + p.y, 0) / list.length,
  })
  const spreadOf = (list: { x: number; y: number }[]) =>
    list.length < 2 ? 0 : Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)

  const rebase = (current: SymmetryRecipe) => {
    const list = points()
    if (list.length === 0) {
      gesture.current = null
      return
    }
    const c = centerOf(list)
    gesture.current = { recipe: current, cx: c.x, cy: c.y, spread: spreadOf(list) }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    rebase(recipe)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const start = gesture.current
    const list = points()
    const c = centerOf(list)
    const scale = start.spread > 0 ? spreadOf(list) / start.spread : 1
    update({
      panX: start.recipe.panX + (c.x - start.cx) / shown.width,
      panY: start.recipe.panY + (c.y - start.cy) / shown.height,
      zoom: start.recipe.zoom * scale,
    })
  }

  const onPointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId)
    rebase(recipe)
  }

  // The wheel zooms the photo; it must not scroll the page behind.
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setRecipe((current) =>
        constrainRecipe(
          current,
          clampRecipe({ ...current, zoom: current.zoom * Math.exp(-event.deltaY * 0.0015) }),
          symmetryOutputSize,
          source
        )
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [source])

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 0.05 : 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (event.key in moves) {
      event.preventDefault()
      const [dx, dy] = moves[event.key]
      update({ panX: recipe.panX + dx, panY: recipe.panY + dy })
    } else if (event.key === '+' || event.key === '=') update({ zoom: recipe.zoom * 1.1 })
    else if (event.key === '-') update({ zoom: recipe.zoom / 1.1 })
  }

  /* ---------- Saving ---------- */

  const save = async () => {
    setSaving(true)
    try {
      const { blob, size } = await renderSymmetry(recipe, source.url)
      if (editing) {
        const updated = await updateSymmetryImage(editing.id, blob, size, recipe)
        if (!updated) throw new Error('The pattern no longer exists')
        toast('Pattern updated everywhere it is used.')
      } else {
        const base = source.name.replace(/\.[^.]+$/, '')
        const image = await addSymmetryImage(
          blob,
          size,
          `${patternName(recipe.axes)} of ${base}`,
          recipe
        )
        const blockId = useProject.getState().addImageSpanning(image.id, recipe.cols, recipe.rows)
        useUi.getState().select([blockId])
      }
      onClose()
    } catch (error) {
      console.error('Saving the pattern failed', error)
      toast('The pattern could not be saved. Nothing was changed.', 'error')
      setSaving(false)
    }
  }

  // Mirror lines, drawn over the preview only. They are not part of the result.
  const lines = Array.from({ length: recipe.axes }, (_, i) => {
    const angle = toRadians(recipe.axisAngle) + i * wedgeAngle(recipe.axes)
    const reach = Math.hypot(shown.width, shown.height)
    return {
      x1: shown.width / 2 - Math.cos(angle) * reach,
      y1: shown.height / 2 - Math.sin(angle) * reach,
      x2: shown.width / 2 + Math.cos(angle) * reach,
      y2: shown.height / 2 + Math.sin(angle) * reach,
    }
  })

  const turn = recipe.rotation > 180 ? recipe.rotation - 360 : recipe.rotation

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] desk:grid-cols-[minmax(0,1fr)_300px] desk:grid-rows-[auto_minmax(0,1fr)]">
      <header className="col-span-full flex h-(--topbar-h) items-center gap-2 border-b border-line bg-panel pr-2 pl-4">
        <h2 className="min-w-0 truncate text-md font-semibold">
          {editing ? 'Edit symmetry pattern' : 'Symmetry'}
          <span className="ml-2 hidden font-normal text-ink-3 desk:inline">{source.name}</span>
        </h2>
        <span className="flex-1" />
        <Button className="hidden desk:inline-flex" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={saving || !preview} onClick={() => void save()}>
          {saving ? 'Saving' : editing ? 'Save changes' : 'Add to grid'}
        </Button>
        <IconButton label="Close without saving" className="desk:hidden" onClick={onClose}>
          <X {...ICON} />
        </IconButton>
      </header>

      <div ref={stage} className="relative m-4 min-h-0 min-w-0 desk:m-8">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-cell-empty"
          style={{ width: shown.width, height: shown.height }}
        >
          <canvas
            ref={canvas}
            tabIndex={0}
            role="img"
            aria-label={`Preview of the pattern. Drag to move the photo under the mirror ${recipe.axes === 1 ? 'line' : 'lines'}; arrow keys nudge it.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            className="block size-full cursor-grab touch-none active:cursor-grabbing"
          />
          {showLines && (
            <svg
              aria-hidden
              viewBox={`0 0 ${shown.width} ${shown.height}`}
              className="pointer-events-none absolute inset-0 size-full"
            >
              {lines.map((line, i) => (
                <g key={i}>
                  <line {...line} stroke="white" strokeOpacity="0.7" strokeWidth="3" />
                  <line {...line} stroke="black" strokeOpacity="0.85" strokeWidth="1" />
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      <aside
        aria-label="Pattern settings"
        className="max-h-[46dvh] overflow-y-auto border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] desk:max-h-none desk:border-t-0 desk:border-l"
      >
        <Group title="Mirror lines">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AXES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={recipe.axes === n}
                aria-label={`${n} mirror ${n === 1 ? 'line' : 'lines'}`}
                onClick={() => update({ axes: n })}
                className="h-(--control-h) min-w-(--control-h) rounded-control border border-line bg-raised px-2 font-medium transition-colors duration-150 ease-out hover:border-line-strong aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink"
              >
                {n}
              </button>
            ))}
          </div>
          <Stepper
            label="Mirror lines"
            value={recipe.axes}
            min={MIN_AXES}
            max={MAX_AXES}
            onChange={(axes) => update({ axes })}
            format={(n) =>
              n === 1 ? '1 line: mirror' : n === 2 ? '2 lines: four-way' : `${n} lines`
            }
          />
          <Slider
            id={ids.angle}
            label="Line angle"
            min={0}
            max={359}
            value={Math.round(recipe.axisAngle)}
            onChange={(axisAngle) => update({ axisAngle })}
            onNudge={(by) => update({ axisAngle: recipe.axisAngle + by })}
            readout={`${Math.round(recipe.axisAngle)}°`}
          />
          <label className="flex min-h-6 items-center gap-2 text-ink-2 pointer-coarse:min-h-11">
            <input
              type="checkbox"
              checked={showLines}
              onChange={(event) => setShowLines(event.target.checked)}
              className="size-4 accent-(--ink)"
            />
            Show the lines while editing
          </label>
        </Group>

        <Group title="Photo">
          <p className="text-sm text-pretty text-ink-3">
            Drag the preview to choose which part of the photo is mirrored.
          </p>
          <Slider
            id={ids.zoom}
            label="Zoom"
            min={toSlider(MIN_SYMMETRY_ZOOM)}
            max={toSlider(MAX_SYMMETRY_ZOOM)}
            step={10}
            value={toSlider(recipe.zoom)}
            onChange={(value) => update({ zoom: fromSlider(value) })}
            readout={`${Math.round(recipe.zoom * 100)}%`}
          />
          <Slider
            id={ids.turn}
            label="Turn"
            min={-180}
            max={180}
            value={Math.round(turn)}
            onChange={(value) => update({ rotation: value })}
            onNudge={(by) => update({ rotation: recipe.rotation + by })}
            readout={`${Math.round(turn)}°`}
          />
          <Button
            variant="ghost"
            className="-ml-2 justify-self-start px-2"
            onClick={() => update({ panX: 0, panY: 0, zoom: 1, rotation: 0 })}
          >
            <RotateCcw {...ICON} />
            Reset photo
          </Button>
        </Group>

        <Group title="Result size">
          <Stepper
            label="Columns"
            value={recipe.cols}
            min={1}
            max={MAX_COLS}
            onChange={(cols) => update({ cols })}
            format={(n) => `${n} ${n === 1 ? 'column' : 'columns'}`}
          />
          <Stepper
            label="Rows"
            value={recipe.rows}
            min={1}
            max={MAX_ROWS}
            onChange={(rows) => update({ rows })}
            format={(n) => `${n} ${n === 1 ? 'row' : 'rows'}`}
          />
          <p className="text-sm text-pretty text-ink-3">
            {recipe.cols * recipe.rows} {recipe.cols * recipe.rows === 1 ? 'post' : 'posts'} on the
            grid, {output.width} × {output.height} px.
            {editing ? ' Blocks that already show this pattern keep their size.' : ''}
          </p>
        </Group>
      </aside>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-line-soft p-4 last:border-b-0">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Slider({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  onNudge,
  readout,
}: {
  id: string
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  /** Adds one-degree buttons beside the slider, for angles (SPEC V56). */
  onNudge?: (by: 1 | -1) => void
  readout: string
}) {
  const nudge =
    'grid size-(--control-h) flex-none place-items-center rounded-control border border-line bg-raised transition-colors duration-150 ease-out hover:border-line-strong'
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm text-ink-3">
        {label}
      </label>
      <div className="flex min-h-6 items-center gap-2 pointer-coarse:min-h-11">
        {onNudge && (
          <button
            type="button"
            aria-label={`${label}: one degree less`}
            onClick={() => onNudge(-1)}
            className={nudge}
          >
            <Minus aria-hidden className="size-4" strokeWidth={1.8} />
          </button>
        )}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="slider min-w-0 flex-1"
        />
        {onNudge && (
          <button
            type="button"
            aria-label={`${label}: one degree more`}
            onClick={() => onNudge(1)}
            className={nudge}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
          </button>
        )}
        <output htmlFor={id} className="min-w-11 text-right text-ink-2">
          {readout}
        </output>
      </div>
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  format: (value: number) => string
}) {
  const button =
    'grid size-(--control-h) flex-none place-items-center rounded-control border border-line bg-raised transition-colors duration-150 ease-out enabled:hover:border-line-strong disabled:text-disabled'
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Fewer: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        <Minus aria-hidden className="size-4" strokeWidth={1.8} />
      </button>
      <output className={cx('min-w-0 flex-1 text-center font-medium')}>{format(value)}</output>
      <button
        type="button"
        aria-label={`More: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        <Plus aria-hidden className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  )
}
