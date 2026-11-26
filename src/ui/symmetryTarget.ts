import { imageById, useLibrary } from '@/store/library'
import type { LibraryImage } from '@/store/library'
import { useOverlays } from './overlays'

/** Whether a symmetry pattern can be opened again: its recipe and its source photo must exist. */
export function canEditPattern(image: LibraryImage | undefined, images: readonly LibraryImage[]) {
  return Boolean(image?.symmetry && imageById(images, image.symmetry.sourceImageId))
}

/**
 * Open a photo in the symmetry editor (SPEC V51). A pattern made here opens
 * with its saved settings; any other photo starts a new pattern.
 */
export function openInSymmetry(image: LibraryImage) {
  const images = useLibrary.getState().images
  if (canEditPattern(image, images) && image.symmetry) {
    useOverlays
      .getState()
      .openSymmetry({ sourceImageId: image.symmetry.sourceImageId, editImageId: image.id })
  } else {
    useOverlays.getState().openSymmetry({ sourceImageId: image.id })
  }
}

/** Label of the action for an image: edit its pattern, or make one from it. */
export function symmetryLabel(image: LibraryImage | undefined, images: readonly LibraryImage[]) {
  return canEditPattern(image, images) ? 'Edit symmetry pattern' : 'Make a symmetry pattern'
}
