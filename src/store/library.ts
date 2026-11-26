import { create } from 'zustand'

export type ImageOrigin = 'upload' | 'composite' | 'v1'

/** An image in the library. `url` is an object URL owned by this store (SPEC V15). */
export interface LibraryImage {
  id: string
  name: string
  width: number
  height: number
  origin: ImageOrigin
  createdAt: number
  url: string
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
