import { inGridOrder } from '@/core/grid'
import { canSplit, planJoin } from '@/core/joinSplit'
import type { Block } from '@/core/types'
import { addCompositeImage, importFiles } from '@/db/session'
import { renderComposite } from '@/export/render'
import { imageById, useLibrary } from '@/store/library'
import { redo, undo, useProject } from '@/store/project'
import { liveSelection, useUi } from '@/store/ui'

/*
 * User actions shared by the desktop shell, the mobile shell and the keyboard.
 * Each one reads the current selection, so callers only say what to do.
 */

const project = () => useProject.getState()
const ui = () => useUi.getState()

const FLASH_MS = 400
let flashTimer: ReturnType<typeof setTimeout> | null = null

/** Mark blocks as just split or joined, long enough for their transition to play. */
function flash(ids: string[], kind: 'split' | 'join') {
  if (flashTimer) clearTimeout(flashTimer)
  ui().setFlash({ ids, kind })
  flashTimer = setTimeout(() => ui().setFlash(null), FLASH_MS)
}

export function selectedBlocks(): Block[] {
  const { blocks } = project()
  const ids = liveSelection(ui().selection, blocks)
  return blocks.filter((b) => ids.includes(b.id))
}

/** Add files to the library and place each on the first free cell. */
export async function addFiles(files: readonly File[]) {
  const result = await importFiles(files)
  if (result.added.length) {
    const ids = project().addImages(result.added.map((i) => i.id))
    ui().select(ids)
  }
  return result
}

/** Put library images on the grid (again). */
export function placeImages(imageIds: readonly string[]) {
  const ids = project().addImages(imageIds)
  if (ids.length) ui().select(ids)
  return ids
}

export function addColorCell() {
  ui().select([project().addColorCell()])
}

export function deleteSelection() {
  const ids = selectedBlocks().map((b) => b.id)
  if (!ids.length) return
  project().remove(ids)
  ui().clearSelection()
  ui().exitAdjust()
}

export function duplicateSelection() {
  const ids = project().insertCopies(inGridOrder(selectedBlocks()))
  if (ids.length) ui().select(ids)
}

export function copySelection() {
  const blocks = inGridOrder(selectedBlocks())
  if (blocks.length) ui().setClipboard(blocks)
}

export function paste() {
  const ids = project().insertCopies(ui().clipboard)
  if (ids.length) ui().select(ids)
}

/** Why an action is unavailable, in words for the interface (SPEC V25). null = available. */
export function splitBlocker(selection: readonly Block[]): string | null {
  if (selection.length !== 1) return 'Select one block that spans several cells'
  const check = canSplit(selection[0])
  return check.ok ? null : 'This block is a single cell'
}

export function joinBlocker(blocks: readonly Block[], selection: readonly Block[]): string | null {
  const plan = planJoin(
    blocks,
    selection.map((b) => b.id)
  )
  if (plan.ok) return null
  if (plan.reason === 'too-few') return 'Select two or more adjacent blocks'
  return 'The selection must form a full rectangle'
}

export function splitSelection() {
  const selection = selectedBlocks()
  if (splitBlocker(selection)) return
  const result = project().split(selection[0].id)
  if (result.ok) {
    ui().select(result.value)
    flash(result.value, 'split')
  }
}

export type JoinOutcome = 'joined' | 'unavailable' | 'failed'

/**
 * Join the selection (SPEC V7). Pieces of one image merge back; different
 * photos are rendered into one new image that also joins the library.
 */
export async function joinSelection(): Promise<JoinOutcome> {
  const ids = selectedBlocks().map((b) => b.id)
  const result = project().join(ids)
  if (!result.ok) return 'unavailable'
  if ('blockId' in result.value) {
    ui().select([result.value.blockId])
    flash([result.value.blockId], 'join')
    return 'joined'
  }

  const { sources, rect } = result.value.composite
  try {
    const library = useLibrary.getState().images
    const { blob, size } = await renderComposite(sources, rect, (block) =>
      imageById(library, block.imageId)
    )
    const count = library.filter((i) => i.origin === 'composite').length + 1
    const image = await addCompositeImage(blob, size, `Joined ${count}`)
    // The layout may have changed while rendering; join only if it still applies.
    const again = planJoin(project().blocks, ids)
    if (!again.ok || again.value.kind !== 'composite') return 'unavailable'
    const joinedId = project().completeComposite(ids, rect, image.id)
    ui().select([joinedId])
    flash([joinedId], 'join')
    return 'joined'
  } catch (error) {
    console.error('Joining the photos failed', error)
    return 'failed'
  }
}

export function enterAdjust() {
  const selection = selectedBlocks()
  if (selection.length === 1 && selection[0].kind === 'image') ui().enterAdjust(selection[0].id)
}

export { undo, redo }
