import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { imageBlock } from '@/core/testing'
import { useLibrary } from '@/store/library'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { closeDb, DB_NAME, images, meta, projects } from './database'
import {
  addCompositeImage,
  boot,
  createProject,
  deleteImage,
  deleteProject,
  duplicateProject,
  flushSave,
  listProjects,
  openProject,
  stashUnsaved,
  stopAutosave,
  UNSAVED_KEY,
} from './session'

const viewport = { width: 1440, height: 900 }
const blob = () => new Blob(['x'], { type: 'image/png' })
const start = () => boot(null, viewport)

beforeEach(async () => {
  stopAutosave()
  await closeDb()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  useLibrary.getState().setImages([])
})

afterEach(() => stopAutosave())

describe('boot (V16)', () => {
  it('opens a new empty project on first run', async () => {
    await start()
    const { id, name, blocks } = useProject.getState()
    expect(id).not.toBe('')
    expect(name).toBe('Untitled grid')
    expect(blocks).toEqual([])
    expect(useLibrary.getState().loading).toBe(false)
    expect(await meta.get('lastProjectId')).toBe(id)
  })

  it('restores the last open project and the library', async () => {
    await start()
    const image = await addCompositeImage(blob(), { width: 1080, height: 1440 }, 'Joined')
    useProject.getState().addImages([image.id])
    useProject.getState().rename('Summer')
    await flushSave()
    const id = useProject.getState().id

    stopAutosave()
    useProject.getState().load({ id: 'scratch', name: 'x', blocks: [] })
    useLibrary.getState().setImages([])

    await start()
    expect(useProject.getState()).toMatchObject({ id, name: 'Summer' })
    expect(useProject.getState().blocks).toHaveLength(1)
    expect(useLibrary.getState().images.map((i) => i.id)).toEqual([image.id])
    expect(useLibrary.getState().images[0].url).toMatch(/^blob:/)
  })

  it('drops blocks whose image no longer exists', async () => {
    await start()
    const id = useProject.getState().id
    await projects.put([
      { id, name: 'Broken', blocks: [imageBlock('a', 0, 0)], createdAt: 1, updatedAt: 1 },
    ])
    stopAutosave()
    await start()
    expect(useProject.getState().blocks).toEqual([])
  })
})

describe('autosave (V16)', () => {
  it('saves canvas changes and reports the status', async () => {
    await start()
    useProject.getState().addColorCell()
    expect(useUi.getState().saveStatus).toBe('saving')
    await flushSave()
    expect(useUi.getState().saveStatus).toBe('saved')
    const stored = await projects.get(useProject.getState().id)
    expect(stored?.blocks).toHaveLength(1)
  })

  it('does not save one project over another when switching', async () => {
    await start()
    const first = useProject.getState().id
    useProject.getState().addColorCell()
    const second = await createProject('Second')
    expect(useProject.getState().blocks).toEqual([])
    await flushSave()
    expect((await projects.get(first))?.blocks).toHaveLength(1)
    expect((await projects.get(second))?.blocks).toEqual([])
  })
})

describe('library (V15, V18)', () => {
  it('deletes an image with its blocks in every project', async () => {
    await start()
    const first = useProject.getState().id
    const image = await addCompositeImage(blob(), { width: 1080, height: 1440 }, 'Shared')
    useProject.getState().addImages([image.id])
    useProject.getState().addColorCell()
    await flushSave()

    await createProject('Second')
    useProject.getState().addImages([image.id])

    await deleteImage(image.id)
    expect(useProject.getState().blocks).toEqual([])
    expect(useLibrary.getState().images).toEqual([])
    expect(await images.all()).toEqual([])
    expect((await projects.get(first))?.blocks.map((b) => b.kind)).toEqual(['color'])
  })
})

describe('projects', () => {
  it('lists, duplicates, opens and deletes', async () => {
    await start()
    const first = useProject.getState().id
    useProject.getState().rename('First')
    useProject.getState().addColorCell()

    const copy = await duplicateProject(first)
    expect(copy).not.toBeNull()
    const list = await listProjects()
    expect(list.map((p) => p.name).sort()).toEqual(['First', 'First copy'])
    expect(list.every((p) => p.blockCount === 1)).toBe(true)

    expect(await openProject(copy!)).toBe(true)
    expect(useProject.getState()).toMatchObject({ id: copy, name: 'First copy' })

    await deleteProject(copy!)
    expect(useProject.getState().id).toBe(first)
    await deleteProject(first)
    expect(useProject.getState().name).toBe('Untitled grid')
    expect(await listProjects()).toHaveLength(1)
  })
})

describe('closing the page right after a change (V16)', () => {
  const fakeStorage = () => {
    const data = new Map<string, string>()
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    }
  }

  it('parks the unsaved layout and recovers it on the next start', async () => {
    const storage = fakeStorage()
    await boot(storage, viewport)
    const id = useProject.getState().id
    useProject.getState().addColorCell()
    await flushSave()

    // A second change, and the page goes away before its save runs.
    useProject.getState().addColorCell()
    useProject.getState().rename('Summer')
    stashUnsaved()
    expect(storage.data.has(UNSAVED_KEY)).toBe(true)
    // Simulate the write never landing: put the older version back.
    stopAutosave()
    await projects.put([
      {
        id,
        name: 'Untitled grid',
        blocks: useProject.getState().blocks.slice(0, 1),
        createdAt: 1,
        updatedAt: 1,
      },
    ])
    useProject.getState().load({ id: 'scratch', name: 'x', blocks: [] })

    await boot(storage, viewport)
    expect(useProject.getState()).toMatchObject({ id, name: 'Summer' })
    expect(useProject.getState().blocks).toHaveLength(2)
    expect((await projects.get(id))?.blocks).toHaveLength(2)
    expect(storage.data.has(UNSAVED_KEY)).toBe(false)
  })

  it('parks nothing when everything is already saved', async () => {
    const storage = fakeStorage()
    await boot(storage, viewport)
    useProject.getState().addColorCell()
    await flushSave()
    stashUnsaved()
    expect(storage.data.has(UNSAVED_KEY)).toBe(false)
  })

  it('clears the parked copy once the save lands', async () => {
    const storage = fakeStorage()
    await boot(storage, viewport)
    useProject.getState().addColorCell()
    stashUnsaved()
    expect(storage.data.has(UNSAVED_KEY)).toBe(true)
    await flushSave()
    expect(storage.data.has(UNSAVED_KEY)).toBe(false)
  })

  it('ignores a parked copy that is damaged or points at a deleted grid', async () => {
    for (const raw of [
      'not json',
      JSON.stringify({ id: 'gone', name: 'x', blocks: [] }),
      JSON.stringify({ id: 5, name: 'x', blocks: 'nope' }),
    ]) {
      const storage = fakeStorage()
      storage.data.set(UNSAVED_KEY, raw)
      await boot(storage, viewport)
      expect(useProject.getState().name).toBe('Untitled grid')
      expect(storage.data.has(UNSAVED_KEY)).toBe(false)
      stopAutosave()
    }
  })

  it('refuses a parked layout that breaks the grid rules', async () => {
    const storage = fakeStorage()
    await boot(storage, viewport)
    const id = useProject.getState().id
    stopAutosave()
    const overlapping = [imageBlock('a', 0, 0), imageBlock('b', 0, 0)]
    storage.data.set(UNSAVED_KEY, JSON.stringify({ id, name: 'Bad', blocks: overlapping }))
    await boot(storage, viewport)
    expect(useProject.getState().name).toBe('Untitled grid')
    expect(useProject.getState().blocks).toEqual([])
  })
})
