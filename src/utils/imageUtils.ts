import type { UploadedImage } from '@/store/types'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function isAcceptedType(file: File): boolean {
  return ACCEPTED.includes(file.type)
}

export function isLowRes(img: UploadedImage): boolean {
  return img.width < 1080
}

export function loadImageFile(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    if (!isAcceptedType(file)) {
      reject(new Error(`Unsupported type: ${file.type}`))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        resolve({
          id: crypto.randomUUID(),
          src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          name: file.name,
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function loadImageFiles(files: FileList | File[]): Promise<{
  loaded: UploadedImage[]
  lowRes: string[]
  failed: string[]
}> {
  const loaded: UploadedImage[] = []
  const lowRes: string[] = []
  const failed: string[] = []

  for (const file of Array.from(files)) {
    try {
      const img = await loadImageFile(file)
      loaded.push(img)
      if (isLowRes(img)) lowRes.push(img.name)
    } catch {
      failed.push(file.name)
    }
  }

  return { loaded, lowRes, failed }
}
