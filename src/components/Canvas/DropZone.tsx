import { useState } from 'react'
import { loadImageFiles } from '@/utils/imageUtils'
import { useStore } from '@/store/useStore'
import type { ImageBlock } from '@/store/types'

interface Props {
  children: React.ReactNode
  onLowRes?: (names: string[]) => void
}

export default function DropZone({ children, onLowRes }: Props) {
  const [draggingOver, setDraggingOver] = useState(false)
  const addImage = useStore((s) => s.addImage)
  const addBlock = useStore((s) => s.addBlock)
  const blocks = useStore((s) => s.blocks)
  const gridRows = useStore((s) => s.gridRows)

  function findFreeCellInBlocks(currentBlocks: ImageBlock[], rows: number): { col: number; row: number } {
    for (let r = 0; r < rows + 3; r++) {
      for (let c = 0; c < 3; c++) {
        const occupied = currentBlocks.some(
          (b) => c >= b.col && c < b.col + b.colSpan && r >= b.row && r < b.row + b.rowSpan
        )
        if (!occupied) return { col: c, row: r }
      }
    }
    return { col: 0, row: rows }
  }

  async function handleFiles(files: FileList | File[]) {
    const { loaded, lowRes } = await loadImageFiles(files)
    if (lowRes.length > 0) onLowRes?.(lowRes)

    // V13: track blocks locally to avoid overlap in batch uploads
    let currentBlocks = blocks
    for (const img of loaded) {
      addImage(img)
      const pos = findFreeCellInBlocks(currentBlocks, gridRows)
      const block: ImageBlock = {
        id: crypto.randomUUID(),
        imageId: img.id,
        col: pos.col,
        row: pos.row,
        colSpan: 1,
        rowSpan: 1,
        barsColor: '#000000',
        transform: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
      }
      addBlock(block)
      // Track locally for next iteration
      currentBlocks = [...currentBlocks, block]
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) setDraggingOver(true)
  }

  function onDragLeave() {
    setDraggingOver(false)
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDraggingOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) await handleFiles(files)
  }

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'hidden auto',
        outline: draggingOver ? '2px dashed var(--color-accent)' : 'none',
        outlineOffset: '-2px',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {draggingOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(192,132,252,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none',
            fontSize: 16,
            color: 'var(--color-accent)',
            fontWeight: 500,
          }}
        >
          Drop images here
        </div>
      )}
      {children}
    </div>
  )
}

export type { Props as DropZoneProps }
