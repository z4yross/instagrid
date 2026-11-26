import { temporal } from 'zundo'
import { create } from 'zustand'
import { clampTransform, frameSize } from '@/core/geometry'
import { firstFreeCell, hasCollision, moveBlocks, placeBlock, resizeBlock } from '@/core/grid'
import type { GridError } from '@/core/grid'
import { applyJoin, compositeBlock, planJoin, split } from '@/core/joinSplit'
import type { JoinError, JoinPlan, SplitError } from '@/core/joinSplit'
import { IDENTITY_TRANSFORM, ok } from '@/core/types'
import type { Block, Rect, Result, Size, Transform } from '@/core/types'
import { newId } from './id'

export const DEFAULT_BARS_COLOR = '#000000'
export const DEFAULT_CELL_COLOR = '#c8b8a4'
const HISTORY_LIMIT = 100

export interface ProjectData {
  id: string
  name: string
  blocks: Block[]
}

interface ProjectState extends ProjectData {
  /** Replace the open project and forget its history. */
  load: (project: ProjectData) => void
  rename: (name: string) => void

  /** Add one 1×1 block per image, each on the first free cell (SPEC V11). One undo step. */
  addImages: (imageIds: readonly string[]) => string[]
  /** Add an image on a cell if it is free, else on the first free cell. */
  addImageAt: (imageId: string, col: number, row: number) => string
  addColorCell: (color?: string) => string
  remove: (ids: readonly string[]) => void
  /** Remove every block that shows the image (SPEC V18). */
  removeImage: (imageId: string) => void

  move: (ids: readonly string[], dCol: number, dRow: number) => Result<true, GridError>
  resize: (id: string, rect: Rect) => Result<true, GridError>
  setTransform: (id: string, transform: Transform, image?: Size) => void
  setColor: (ids: readonly string[], color: string) => void

  split: (id: string) => Result<string[], SplitError>
  /**
   * Join the blocks (SPEC V7). Rejoins and color merges happen at once and
   * return the new block id. A composite needs an image first: the plan is
   * returned for the caller to render, then `completeComposite` finishes it.
   */
  join: (
    ids: readonly string[]
  ) => Result<
    { blockId: string } | { composite: Extract<JoinPlan, { kind: 'composite' }> },
    JoinError
  >
  completeComposite: (ids: readonly string[], rect: Rect, imageId: string) => string

  /** Insert copies of the given blocks on free cells. Returns the new ids. */
  insertCopies: (sources: readonly Block[]) => string[]

  /** A continuous gesture is one undo step, recorded on commit (SPEC V14). */
  beginGesture: () => void
  updateGesture: (blocks: Block[]) => void
  commitGesture: () => void
  cancelGesture: () => void
}

let gestureStart: Block[] | null = null

export const useProject = create<ProjectState>()(
  temporal(
    (set, get) => ({
      id: '',
      name: 'Untitled grid',
      blocks: [],

      load: (project) => {
        gestureStart = null
        set({ id: project.id, name: project.name, blocks: project.blocks })
        useProject.temporal.getState().clear()
      },

      rename: (name) => set({ name: name.trim() || 'Untitled grid' }),

      addImages: (imageIds) => {
        let blocks = get().blocks
        const ids: string[] = []
        for (const imageId of imageIds) {
          const spot = firstFreeCell(blocks)
          const block: Block = {
            id: newId(),
            kind: 'image',
            imageId,
            color: DEFAULT_BARS_COLOR,
            ...spot,
            colSpan: 1,
            rowSpan: 1,
            frame: { cols: 1, rows: 1, col: 0, row: 0 },
            transform: { ...IDENTITY_TRANSFORM },
          }
          blocks = [...blocks, block]
          ids.push(block.id)
        }
        if (ids.length) set({ blocks })
        return ids
      },

      addImageAt: (imageId, col, row) => {
        const blocks = get().blocks
        const wanted = { col, row, colSpan: 1, rowSpan: 1 }
        const spot = hasCollision(blocks, wanted) ? firstFreeCell(blocks) : { col, row }
        const block: Block = {
          id: newId(),
          kind: 'image',
          imageId,
          color: DEFAULT_BARS_COLOR,
          ...spot,
          colSpan: 1,
          rowSpan: 1,
          frame: { cols: 1, rows: 1, col: 0, row: 0 },
          transform: { ...IDENTITY_TRANSFORM },
        }
        set({ blocks: [...blocks, block] })
        return block.id
      },

      addColorCell: (color = DEFAULT_CELL_COLOR) => {
        const blocks = get().blocks
        const block: Block = {
          id: newId(),
          kind: 'color',
          color,
          ...firstFreeCell(blocks),
          colSpan: 1,
          rowSpan: 1,
          frame: { cols: 1, rows: 1, col: 0, row: 0 },
          transform: { ...IDENTITY_TRANSFORM },
        }
        set({ blocks: [...blocks, block] })
        return block.id
      },

      remove: (ids) => {
        const blocks = get().blocks.filter((b) => !ids.includes(b.id))
        if (blocks.length !== get().blocks.length) set({ blocks })
      },

      removeImage: (imageId) => {
        const blocks = get().blocks.filter((b) => b.imageId !== imageId)
        if (blocks.length !== get().blocks.length) set({ blocks })
      },

      move: (ids, dCol, dRow) => {
        if (dCol === 0 && dRow === 0) return ok(true)
        const result = moveBlocks(get().blocks, ids, dCol, dRow)
        if (!result.ok) return result
        set({ blocks: result.value })
        return ok(true)
      },

      resize: (id, rect) => {
        const result = resizeBlock(get().blocks, id, rect)
        if (!result.ok) return result
        set({ blocks: result.value })
        return ok(true)
      },

      setTransform: (id, transform, image) => {
        set({
          blocks: get().blocks.map((b) => {
            if (b.id !== id) return b
            const next = image
              ? clampTransform(frameSize(b, { width: 3, height: 4 }), image, transform)
              : transform
            return { ...b, transform: next }
          }),
        })
      },

      setColor: (ids, color) => {
        set({ blocks: get().blocks.map((b) => (ids.includes(b.id) ? { ...b, color } : b)) })
      },

      split: (id) => {
        const result = split(get().blocks, id, newId)
        if (!result.ok) return result
        set({ blocks: result.value.blocks })
        return ok(result.value.pieceIds)
      },

      join: (ids) => {
        const plan = planJoin(get().blocks, ids)
        if (!plan.ok) return plan
        if (plan.value.kind === 'composite') return ok({ composite: plan.value })
        const joined: Block = { ...plan.value.block, id: newId() }
        set({ blocks: applyJoin(get().blocks, ids, joined) })
        return ok({ blockId: joined.id })
      },

      completeComposite: (ids, rect, imageId) => {
        const joined: Block = { ...compositeBlock(rect, imageId, DEFAULT_BARS_COLOR), id: newId() }
        set({ blocks: applyJoin(get().blocks, ids, joined) })
        return joined.id
      },

      insertCopies: (sources) => {
        let blocks = get().blocks
        const ids: string[] = []
        for (const source of sources) {
          const spot = firstFreeCell(blocks, source.colSpan, source.rowSpan)
          const copy: Block = {
            ...source,
            id: newId(),
            ...spot,
            frame: { ...source.frame },
            transform: { ...source.transform },
          }
          const placed = placeBlock(blocks, copy)
          if (!placed.ok) continue
          blocks = placed.value
          ids.push(copy.id)
        }
        if (ids.length) set({ blocks })
        return ids
      },

      beginGesture: () => {
        if (gestureStart) return
        gestureStart = get().blocks
        useProject.temporal.getState().pause()
      },

      updateGesture: (blocks) => {
        if (gestureStart) set({ blocks })
      },

      commitGesture: () => {
        if (!gestureStart) return
        const start = gestureStart
        const final = get().blocks
        gestureStart = null
        // Rewind while untracked, then record the whole gesture as one change.
        set({ blocks: start })
        useProject.temporal.getState().resume()
        if (final !== start) set({ blocks: final })
      },

      cancelGesture: () => {
        if (!gestureStart) return
        set({ blocks: gestureStart })
        gestureStart = null
        useProject.temporal.getState().resume()
      },
    }),
    {
      // Only the canvas content is undoable (SPEC V13).
      partialize: (state) => ({ blocks: state.blocks }),
      equality: (a, b) => a.blocks === b.blocks,
      limit: HISTORY_LIMIT,
    }
  )
)

export const undo = () => useProject.temporal.getState().undo()
export const redo = () => useProject.temporal.getState().redo()

/** How many blocks show the image; used by the delete confirmation (SPEC V18). */
export function blocksUsingImage(blocks: readonly Block[], imageId: string): number {
  return blocks.filter((b) => b.imageId === imageId).length
}

export type { GridError, JoinError, SplitError }
