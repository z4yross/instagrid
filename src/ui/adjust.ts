import { clampTransform, fitZoom, frameSize } from '@/core/geometry'
import { IDENTITY_TRANSFORM } from '@/core/types'
import type { Block, Rotation, Size, Transform } from '@/core/types'
import { imageById, useLibrary } from '@/store/library'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'

/* Changes to the photo being adjusted (SPEC V21). */

const UNIT_CELL = { width: 3, height: 4 }

export function adjustTarget(): { block: Block; image: Size } | null {
  const { blocks } = useProject.getState()
  const { adjustId, selection } = useUi.getState()
  // The photo being adjusted, or else the one selected photo.
  const selected = selection.length === 1 ? selection[0] : null
  const block = blocks.find((b) => b.id === (adjustId ?? selected))
  const image = imageById(useLibrary.getState().images, block?.imageId)
  return block && image ? { block, image } : null
}

const next = (target: { block: Block; image: Size }, patch: Partial<Transform>) =>
  clampTransform(frameSize(target.block, UNIT_CELL), target.image, {
    ...target.block.transform,
    ...patch,
  })

/** Apply a change as one undo step. */
export function setAdjust(patch: Partial<Transform>) {
  const target = adjustTarget()
  if (target) useProject.getState().setTransform(target.block.id, next(target, patch))
}

/** Apply a change inside a running gesture (slider drag): no undo step until it commits. */
export function liveAdjust(patch: Partial<Transform>) {
  const target = adjustTarget()
  if (!target) return
  const transform = next(target, patch)
  const project = useProject.getState()
  project.updateGesture(
    project.blocks.map((b) => (b.id === target.block.id ? { ...b, transform } : b))
  )
}

export const beginAdjustGesture = () => useProject.getState().beginGesture()
export const commitAdjustGesture = () => useProject.getState().commitGesture()

export function rotateBy(degrees: 90 | -90) {
  const target = adjustTarget()
  if (!target) return
  const rotation = ((target.block.transform.rotation + degrees + 360) % 360) as Rotation
  setAdjust({ rotation })
}

export function flip(axis: 'x' | 'y') {
  const target = adjustTarget()
  if (!target) return
  const { flipX, flipY } = target.block.transform
  setAdjust(axis === 'x' ? { flipX: !flipX } : { flipY: !flipY })
}

/** Fill the frame edge to edge. */
export const fillFrame = () => setAdjust({ zoom: 1, panX: 0, panY: 0 })

/** Show the whole photo, with bars where it does not reach. */
export function fitFrame() {
  const target = adjustTarget()
  if (!target) return
  const frame = frameSize(target.block, UNIT_CELL)
  setAdjust({
    zoom: fitZoom(frame, target.image, target.block.transform.rotation),
    panX: 0,
    panY: 0,
  })
}

export const resetAdjust = () => setAdjust({ ...IDENTITY_TRANSFORM })

/** Nudge the photo with the arrow keys; `step` is a fraction of the frame. */
export function nudge(dx: number, dy: number, step = 0.02) {
  const target = adjustTarget()
  if (!target) return
  const { panX, panY } = target.block.transform
  setAdjust({ panX: panX + dx * step, panY: panY + dy * step })
}

export function zoomBy(factor: number) {
  const target = adjustTarget()
  if (target) setAdjust({ zoom: target.block.transform.zoom * factor })
}
