import { beforeEach, describe, expect, it } from 'vitest'
import { isValidLayout } from '@/core/grid'
import { imageBlock } from '@/core/testing'
import { IDENTITY_TRANSFORM } from '@/core/types'
import { blocksUsingImage, redo, undo, useProject } from './project'

const state = () => useProject.getState()
const history = () => useProject.temporal.getState()

beforeEach(() => {
  state().load({ id: 'p1', name: 'Test', blocks: [] })
})

describe('adding content (V11)', () => {
  it('puts a batch of images on distinct cells as one undo step', () => {
    const ids = state().addImages(['i1', 'i2', 'i3', 'i4'])
    expect(ids).toHaveLength(4)
    expect(state().blocks.map((b) => [b.col, b.row])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ])
    expect(isValidLayout(state().blocks)).toBe(true)
    undo()
    expect(state().blocks).toEqual([])
  })

  it('adds a color cell on the first free cell', () => {
    state().addImages(['i1'])
    state().addColorCell('#112233')
    expect(state().blocks[1]).toMatchObject({ kind: 'color', color: '#112233', col: 1, row: 0 })
  })
})

describe('rejected changes leave the state alone (V1)', () => {
  it('refuses a move onto another block', () => {
    const [a] = state().addImages(['i1', 'i2'])
    const before = state().blocks
    expect(state().move([a], 1, 0)).toEqual({ ok: false, reason: 'collision' })
    expect(state().blocks).toBe(before)
    expect(history().pastStates).toHaveLength(1)
  })

  it('refuses a resize out of the grid', () => {
    const [a] = state().addImages(['i1'])
    expect(state().resize(a, { col: 2, row: 0, colSpan: 2, rowSpan: 1 }).ok).toBe(false)
  })
})

describe('undo and redo (V13)', () => {
  it('walks canvas changes back and forth', () => {
    const [a] = state().addImages(['i1'])
    state().move([a], 2, 1)
    state().resize(a, { col: 1, row: 1, colSpan: 2, rowSpan: 2 })
    undo()
    expect(state().blocks[0]).toMatchObject({ col: 2, row: 1, colSpan: 1 })
    undo()
    expect(state().blocks[0]).toMatchObject({ col: 0, row: 0 })
    redo()
    redo()
    expect(state().blocks[0]).toMatchObject({ col: 1, row: 1, colSpan: 2, rowSpan: 2 })
  })

  it('does not record a rename', () => {
    state().rename('Summer')
    expect(state().name).toBe('Summer')
    expect(history().pastStates).toHaveLength(0)
  })

  it('forgets history when another project loads', () => {
    state().addImages(['i1'])
    state().load({ id: 'p2', name: 'Other', blocks: [imageBlock('x', 0, 0)] })
    expect(history().pastStates).toHaveLength(0)
    undo()
    expect(state().blocks).toHaveLength(1)
  })
})

describe('gestures are one undo step (V14)', () => {
  it('records only the final state of a drag', () => {
    const [a] = state().addImages(['i1'])
    const past = history().pastStates.length
    const pan = (panX: number) =>
      state().blocks.map((b) => ({ ...b, transform: { ...IDENTITY_TRANSFORM, panX } }))

    state().beginGesture()
    state().updateGesture(pan(0.1))
    state().updateGesture(pan(0.2))
    state().updateGesture(pan(0.3))
    state().commitGesture()

    expect(state().blocks[0].transform.panX).toBe(0.3)
    expect(history().pastStates).toHaveLength(past + 1)
    undo()
    expect(state().blocks[0]).toMatchObject({ id: a, transform: { panX: 0 } })
  })

  it('records nothing for a gesture that changed nothing', () => {
    state().addImages(['i1'])
    const past = history().pastStates.length
    state().beginGesture()
    state().commitGesture()
    expect(history().pastStates).toHaveLength(past)
  })

  it('restores the start on cancel and keeps tracking afterwards', () => {
    const [a] = state().addImages(['i1'])
    const start = state().blocks
    state().beginGesture()
    state().updateGesture(start.map((b) => ({ ...b, col: 2 })))
    state().cancelGesture()
    expect(state().blocks).toBe(start)
    const past = history().pastStates.length
    state().move([a], 1, 0)
    expect(history().pastStates).toHaveLength(past + 1)
  })
})

describe('split and join (V6, V7, V8)', () => {
  it('splits and rejoins as single undo steps', () => {
    const [a] = state().addImages(['i1'])
    state().resize(a, { col: 0, row: 0, colSpan: 2, rowSpan: 2 })
    const whole = state().blocks[0]

    const pieces = state().split(a)
    expect(pieces.ok && pieces.value).toHaveLength(4)
    if (!pieces.ok) return

    const joined = state().join(pieces.value)
    expect(joined.ok && 'blockId' in joined.value).toBe(true)
    expect(state().blocks).toHaveLength(1)
    expect({ ...state().blocks[0], id: whole.id }).toEqual(whole)

    undo()
    expect(state().blocks).toHaveLength(4)
    undo()
    expect(state().blocks).toEqual([whole])
  })

  it('hands back a composite plan for different images and completes it', () => {
    const ids = state().addImages(['i1', 'i2'])
    const result = state().join(ids)
    expect(result.ok && 'composite' in result.value).toBe(true)
    if (!result.ok || !('composite' in result.value)) return
    expect(state().blocks).toHaveLength(2)

    const blockId = state().completeComposite(ids, result.value.composite.rect, 'new-image')
    expect(state().blocks).toHaveLength(1)
    expect(state().blocks[0]).toMatchObject({
      id: blockId,
      imageId: 'new-image',
      colSpan: 2,
      rowSpan: 1,
    })
    undo()
    expect(state().blocks.map((b) => b.imageId)).toEqual(['i1', 'i2'])
  })

  it('reports why a join is not possible', () => {
    const [a] = state().addImages(['i1'])
    expect(state().join([a])).toEqual({ ok: false, reason: 'too-few' })
  })
})

describe('removing and copying', () => {
  it('removes every block of a deleted image (V18)', () => {
    state().addImages(['i1', 'i2', 'i1'])
    expect(blocksUsingImage(state().blocks, 'i1')).toBe(2)
    state().removeImage('i1')
    expect(state().blocks.map((b) => b.imageId)).toEqual(['i2'])
  })

  it('inserts copies on free cells with new ids', () => {
    const [a] = state().addImages(['i1'])
    state().resize(a, { col: 0, row: 0, colSpan: 2, rowSpan: 1 })
    const ids = state().insertCopies(state().blocks)
    expect(ids).toHaveLength(1)
    expect(ids[0]).not.toBe(a)
    expect(state().blocks[1]).toMatchObject({ col: 0, row: 1, colSpan: 2, imageId: 'i1' })
    expect(isValidLayout(state().blocks)).toBe(true)
  })
})
