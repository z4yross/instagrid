import { FlipHorizontal2, FlipVertical2, Pipette, RotateCcw, RotateCw } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { fitZoom, frameSize } from '@/core/geometry'
import { MAX_ZOOM, MIN_ZOOM } from '@/core/types'
import type { Block, Size } from '@/core/types'
import { useProject } from '@/store/project'
import {
  beginAdjustGesture,
  commitAdjustGesture,
  fillFrame,
  fitFrame,
  flip,
  liveAdjust,
  resetAdjust,
  rotateBy,
} from './adjust'
import { cx, ICON } from './classes'
import { Button } from './kit'

const SWATCHES = ['#000000', '#ffffff', '#1f1f1f', '#8a8a8a', '#c8b8a4', '#e9e2d6'] as const

// The slider works on a log scale so each step feels the same at any zoom.
const toSlider = (zoom: number) => Math.round(Math.log(zoom) * 1000)
const fromSlider = (value: number) => Math.exp(value / 1000)

const close = (a: number, b: number) => Math.abs(a - b) < 0.005

interface SwatchesProps {
  value: string
  onChange: (color: string) => void
  label: string
  /** Keep the swatches on one scrolling row instead of wrapping. */
  singleRow?: boolean
}

/** Color choices plus a custom color; used for bars and for color cells. */
export function Swatches({ value, onChange, label, singleRow }: SwatchesProps) {
  const custom = !SWATCHES.includes(value.toLowerCase() as (typeof SWATCHES)[number])
  const size = 'size-7 flex-none pointer-coarse:size-11'
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        'flex gap-2 pointer-coarse:gap-1.5',
        // Room for the selection ring, which sits outside each swatch.
        singleRow ? '-m-1 overflow-x-auto p-1' : 'flex-wrap'
      )}
    >
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value.toLowerCase() === color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={cx(
            size,
            'rounded-full border border-swatch-line aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-ink'
          )}
        />
      ))}
      <label
        className={cx(
          size,
          'relative grid cursor-pointer place-items-center rounded-full border border-swatch-line text-ink-2',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink',
          custom && 'outline-2 outline-offset-2 outline-ink'
        )}
        style={{ backgroundColor: custom ? value : 'var(--raised)' }}
        title="Custom color"
      >
        {!custom && <Pipette aria-hidden className="size-3.5" strokeWidth={1.6} />}
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

interface AdjustControlsProps {
  block: Block
  image: Size
  /** Mobile bar: no captions, one row per control, as short as it can be. */
  compact?: boolean
}

/** Zoom, fit, rotate, flip and bars color for the photo being adjusted (SPEC V21). */
export function AdjustControls({ block, image, compact }: AdjustControlsProps) {
  const setColor = useProject((s) => s.setColor)
  const zoomId = useId()
  const { zoom, rotation } = block.transform
  const fit = fitZoom(frameSize(block, { width: 3, height: 4 }), image, rotation)
  const filled = close(zoom, 1)
  const fitted = close(zoom, fit) && !filled

  const zoomRow = (
    <div className="flex min-h-6 items-center gap-2 pointer-coarse:min-h-11">
      <input
        id={zoomId}
        type="range"
        aria-label={compact ? 'Zoom' : undefined}
        min={toSlider(MIN_ZOOM)}
        max={toSlider(MAX_ZOOM)}
        step={10}
        value={toSlider(zoom)}
        onPointerDown={beginAdjustGesture}
        onPointerUp={commitAdjustGesture}
        onKeyDown={beginAdjustGesture}
        onKeyUp={commitAdjustGesture}
        onBlur={commitAdjustGesture}
        onChange={(event) => liveAdjust({ zoom: fromSlider(Number(event.target.value)) })}
        className="slider min-w-0 flex-1"
      />
      <output htmlFor={zoomId} className="min-w-10 text-right text-ink-2">
        {Math.round(zoom * 100)}%
      </output>
    </div>
  )

  const fitRow = (
    <div
      role="group"
      aria-label="Fit"
      className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-control bg-track p-0.5"
    >
      <SegButton pressed={filled} onClick={fillFrame} title="Fill the frame edge to edge">
        Fill
      </SegButton>
      <SegButton pressed={fitted} onClick={fitFrame} title="Show the whole photo, with bars">
        Fit whole
      </SegButton>
    </div>
  )

  const turnRow = (
    <div className="grid grid-cols-4 gap-2">
      <Button
        aria-label="Rotate left"
        title="Rotate left"
        className="px-0"
        onClick={() => rotateBy(-90)}
      >
        <RotateCcw {...ICON} />
      </Button>
      <Button
        aria-label="Rotate right"
        title="Rotate right"
        className="px-0"
        onClick={() => rotateBy(90)}
      >
        <RotateCw {...ICON} />
      </Button>
      <Button
        aria-label="Flip horizontally"
        title="Flip horizontally"
        className="px-0"
        pressed={block.transform.flipX}
        onClick={() => flip('x')}
      >
        <FlipHorizontal2 {...ICON} />
      </Button>
      <Button
        aria-label="Flip vertically"
        title="Flip vertically"
        className="px-0"
        pressed={block.transform.flipY}
        onClick={() => flip('y')}
      >
        <FlipVertical2 {...ICON} />
      </Button>
    </div>
  )

  const colors = (
    <Swatches
      label="Bars color"
      value={block.color}
      singleRow={compact}
      onChange={(color) => setColor([block.id], color)}
    />
  )

  if (compact) {
    return (
      <div className="grid gap-2">
        {zoomRow}
        {turnRow}
        {fitRow}
        {colors}
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <label htmlFor={zoomId} className="text-sm text-ink-3">
          Zoom
        </label>
        {zoomRow}
      </div>
      {fitRow}
      {turnRow}
      <div className="grid gap-1.5">
        <span className="text-sm text-ink-3">Bars color</span>
        {colors}
        <p className="text-sm text-ink-3">Shows where the photo does not reach the frame.</p>
      </div>
      <Button variant="ghost" className="justify-self-start px-2" onClick={resetAdjust}>
        Reset photo
      </Button>
    </div>
  )
}

function SegButton({
  pressed,
  onClick,
  title,
  children,
}: {
  pressed: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className="h-7 rounded-chip font-medium text-ink-2 transition-colors duration-150 ease-out hover:text-ink aria-pressed:bg-raised aria-pressed:text-ink aria-pressed:shadow-thumb pointer-coarse:h-11"
    >
      {children}
    </button>
  )
}
