import { clampRecipe, isSymmetryRecipe } from '@/core/symmetry'
import type { SymmetryRecipe } from '@/core/symmetry'
import type { Block, Size } from '@/core/types'
import { newId } from '@/store/id'
import { useLibrary } from '@/store/library'
import type { ImageOrigin, LibraryImage } from '@/store/library'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { images, meta, projects } from './database'
import type { StoredImage, StoredProject } from './database'
import { migrateV1 } from './migrateV1'
import type { MigrationResult } from './migrateV1'

/*
 * Glue between storage and the stores: start-up restore, autosave, the image
 * library and the project list (SPEC V15, V16, V18).
 */

const SAVE_DELAY_MS = 600
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DEFAULT_PROJECT_NAME = 'Untitled grid'

const createdAt = new Map<string, number>()
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()
let unsubscribe: (() => void) | null = null

const toLibraryImage = (image: StoredImage): LibraryImage => ({
  id: image.id,
  name: image.name,
  width: image.width,
  height: image.height,
  origin: image.origin,
  createdAt: image.createdAt,
  url: URL.createObjectURL(image.blob),
  symmetry: isSymmetryRecipe(image.symmetry) ? clampRecipe(image.symmetry) : undefined,
})

/** Drop image blocks whose image is not in the library any more. */
function withoutOrphans(blocks: readonly Block[], imageIds: ReadonlySet<string>): Block[] {
  return blocks.filter((b) => b.kind !== 'image' || (b.imageId && imageIds.has(b.imageId)))
}

function openStored(project: StoredProject) {
  const ids = new Set(useLibrary.getState().images.map((i) => i.id))
  createdAt.set(project.id, project.createdAt)
  useProject
    .getState()
    .load({ id: project.id, name: project.name, blocks: withoutOrphans(project.blocks, ids) })
  useUi.getState().clearSelection()
  useUi.getState().exitAdjust()
}

async function writeCurrent() {
  const { id, name, blocks } = useProject.getState()
  if (!id) return
  const now = Date.now()
  if (!createdAt.has(id)) createdAt.set(id, now)
  await projects.put([{ id, name, blocks, createdAt: createdAt.get(id)!, updatedAt: now }])
  await meta.set('lastProjectId', id)
}

function save() {
  pendingSave = pendingSave
    .then(writeCurrent)
    .then(() => useUi.getState().setSaveStatus('saved'))
    .catch((error) => {
      console.error('Saving the project failed', error)
      useUi.getState().setSaveStatus('error')
    })
  return pendingSave
}

function scheduleSave() {
  useUi.getState().setSaveStatus('saving')
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void save()
  }, SAVE_DELAY_MS)
}

/** Write any pending change now. */
export async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    await save()
  } else {
    await pendingSave
  }
}

function startAutosave() {
  unsubscribe?.()
  unsubscribe = useProject.subscribe((state, previous) => {
    if (state.id !== previous.id) return
    if (state.blocks !== previous.blocks || state.name !== previous.name) scheduleSave()
  })
}

export function stopAutosave() {
  unsubscribe?.()
  unsubscribe = null
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
}

async function createAndOpen(name = DEFAULT_PROJECT_NAME) {
  const now = Date.now()
  const project: StoredProject = { id: newId(), name, blocks: [], createdAt: now, updatedAt: now }
  await projects.put([project])
  await meta.set('lastProjectId', project.id)
  openStored(project)
  return project.id
}

/**
 * Restore the library and the last open project. Storage problems are reported
 * through the save status and never block the app (SPEC V16).
 */
export async function boot(
  storage: Pick<Storage, 'getItem'> | null,
  viewport: Size
): Promise<MigrationResult> {
  const library = useLibrary.getState()
  let migration: MigrationResult = { imported: false, images: 0, projects: 0 }
  try {
    library.setLoading(true, await images.count())
    migration = await migrateV1(storage, viewport)
    library.setImages((await images.all()).map(toLibraryImage))

    const lastId = await meta.get<string>('lastProjectId')
    const last = lastId ? await projects.get(lastId) : undefined
    const fallback =
      last ?? [...(await projects.all())].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (fallback) openStored(fallback)
    else await createAndOpen()
    useUi.getState().setSaveStatus('saved')
  } catch (error) {
    console.error('Restoring saved work failed', error)
    library.setImages([])
    useProject.getState().load({ id: newId(), name: DEFAULT_PROJECT_NAME, blocks: [] })
    useUi.getState().setSaveStatus('error')
  }
  startAutosave()
  return migration
}

/* ---------- Library ---------- */

async function measure(blob: Blob): Promise<Size> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { width: img.naturalWidth, height: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function storeImage(
  blob: Blob,
  name: string,
  origin: ImageOrigin,
  size?: Size,
  symmetry?: SymmetryRecipe
): Promise<LibraryImage> {
  const { width, height } = size ?? (await measure(blob))
  const stored: StoredImage = {
    id: newId(),
    name,
    width,
    height,
    origin,
    createdAt: Date.now(),
    blob,
    symmetry,
  }
  await images.put([stored])
  const image = toLibraryImage(stored)
  useLibrary.getState().addImages([image])
  return image
}

export interface ImportResult {
  added: LibraryImage[]
  /** Names of files that are not JPG, PNG or WEBP, or could not be read. */
  rejected: string[]
}

/** Add files to the library (SPEC I.fs). Does not place them on the grid. */
export async function importFiles(files: readonly File[]): Promise<ImportResult> {
  const result: ImportResult = { added: [], rejected: [] }
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      result.rejected.push(file.name)
      continue
    }
    try {
      result.added.push(await storeImage(file, file.name, 'upload'))
    } catch (error) {
      console.error(`Reading ${file.name} failed`, error)
      result.rejected.push(file.name)
    }
  }
  return result
}

/** Store the image a composite join produced (SPEC V7). */
export function addCompositeImage(blob: Blob, size: Size, name: string) {
  return storeImage(blob, name, 'composite', size)
}

/** Store a new symmetry pattern with its recipe (SPEC V52, V53). */
export function addSymmetryImage(blob: Blob, size: Size, name: string, recipe: SymmetryRecipe) {
  return storeImage(blob, name, 'symmetry', size, clampRecipe(recipe))
}

/**
 * Replace a symmetry pattern with a new version. The image keeps its id, so
 * every block that shows it, in every grid, shows the new version (SPEC V53).
 */
export async function updateSymmetryImage(
  id: string,
  blob: Blob,
  size: Size,
  recipe: SymmetryRecipe
): Promise<LibraryImage | null> {
  const existing = await images.get(id)
  if (!existing) return null
  const stored: StoredImage = {
    ...existing,
    width: size.width,
    height: size.height,
    blob,
    symmetry: clampRecipe(recipe),
  }
  await images.put([stored])
  const image = toLibraryImage(stored)
  useLibrary.getState().replaceImage(image)
  return image
}

/** Delete an image and every block that shows it, in every project (SPEC V18). */
export async function deleteImage(imageId: string) {
  useProject.getState().removeImage(imageId)
  useLibrary.getState().removeImage(imageId)
  await flushSave()
  const currentId = useProject.getState().id
  const others = (await projects.all()).filter(
    (p) => p.id !== currentId && p.blocks.some((b) => b.imageId === imageId)
  )
  await projects.put(
    others.map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.imageId !== imageId) }))
  )
  await images.delete(imageId)
}

/* ---------- Projects ---------- */

export interface ProjectSummary {
  id: string
  name: string
  updatedAt: number
  blockCount: number
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await flushSave()
  return (await projects.all())
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, blockCount: p.blocks.length }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createProject(name = DEFAULT_PROJECT_NAME) {
  await flushSave()
  return createAndOpen(name)
}

export async function openProject(id: string) {
  await flushSave()
  const project = await projects.get(id)
  if (!project) return false
  openStored(project)
  await meta.set('lastProjectId', id)
  return true
}

export async function duplicateProject(id: string) {
  await flushSave()
  const source = await projects.get(id)
  if (!source) return null
  const now = Date.now()
  const copy: StoredProject = {
    ...source,
    id: newId(),
    name: `${source.name} copy`,
    createdAt: now,
    updatedAt: now,
  }
  await projects.put([copy])
  return copy.id
}

/** Delete a project. Deleting the open one opens the most recent other, or a new empty one. */
export async function deleteProject(id: string) {
  await flushSave()
  await projects.delete(id)
  createdAt.delete(id)
  if (useProject.getState().id !== id) return
  const next = [...(await projects.all())].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  if (next) {
    openStored(next)
    await meta.set('lastProjectId', next.id)
  } else {
    await createAndOpen()
  }
}
