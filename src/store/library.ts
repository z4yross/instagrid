import { create } from 'zustand'
import type { SymmetryRecipe } from '@/core/symmetry'

export type ImageOrigin = 'upload' | 'composite' | 'symmetry' | 'v1'

/** An image in the library. `url` is an object URL owned by this store (SPEC V15). */
export interface LibraryImage {
  id: string
  name: string
  width: number
  height: number
  origin: ImageOrigin
  createdAt: number
  url: string
  /** How a symmetry pattern was made, when this image is one (SPEC V53). */
  symmetry?: SymmetryRecipe
}

interface LibraryState {
  images: LibraryImage[]
  /** Restoring from storage; `expected` sizes the skeletons (SPEC V35). */
  loading: boolean
  expected: number

  setLoading: (loading: boolean, expected?: number) => void
  setImages: (images: LibraryImage[]) => void
  addImages: (images: LibraryImage[]) => void
  removeImage: (id: string) => void
  /** Swap an image for a new version with the same id. */
  replaceImage: (image: LibraryImage) => void
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  images: [],
  loading: true,
  expected: 0,

  setLoading: (loading, expected = 0) => set({ loading, expected }),

  setImages: (images) => {
    const keep = new Set(images.map((i) => i.url))
    for (const old of get().images) if (!keep.has(old.url)) URL.revokeObjectURL(old.url)
    set({ images, loading: false })
  },

  addImages: (images) => set({ images: [...get().images, ...images] }),

  replaceImage: (image) => {
    const old = get().images.find((i) => i.id === image.id)
    if (old && old.url !== image.url) URL.revokeObjectURL(old.url)
    set({ images: get().images.map((i) => (i.id === image.id ? image : i)) })
  },

  removeImage: (id) => {
    const image = get().images.find((i) => i.id === id)
    if (!image) return
    URL.revokeObjectURL(image.url)
    set({ images: get().images.filter((i) => i.id !== id) })
  },
}))

export function imageById(images: readonly LibraryImage[], id: string | undefined) {
  return id ? images.find((i) => i.id === id) : undefined
}
