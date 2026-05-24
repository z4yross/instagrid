import { useState, useRef, useEffect } from 'react'

interface Props {
  onToggle: (visible: boolean) => void
  overlayVisible: boolean
  onPositionChange?: (position: { x: number; y: number }) => void
}

const FAB_SIZE = 60
const STORAGE_KEY = 'fab-position'

export default function MobileFAB({ onToggle, overlayVisible, onPositionChange }: Props) {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
    // Default: bottom-right with 16px margin
    return {
      x: window.innerWidth - FAB_SIZE - 16,
      y: window.innerHeight - FAB_SIZE - 16 - 60, // Account for zoom controls
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; fabX: number; fabY: number } | null>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  // Save position to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    onPositionChange?.(position)
  }, [position, onPositionChange])

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    const button = e.currentTarget as HTMLElement
    button.setPointerCapture(e.pointerId)

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fabX: position.x,
      fabY: position.y,
    }
    setIsDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return
    e.preventDefault()

    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    // Only update if moved more than 5px (distinguish from tap)
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      const newX = Math.max(0, Math.min(window.innerWidth - FAB_SIZE, dragStartRef.current.fabX + deltaX))
      const newY = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, dragStartRef.current.fabY + deltaY))

      setPosition({ x: newX, y: newY })
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const button = e.currentTarget as HTMLElement
    button.releasePointerCapture(e.pointerId)

    // If not dragged (small movement), treat as tap to toggle
    if (dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      const wasDrag = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5

      if (!wasDrag) {
        onToggle(!overlayVisible)
      }
    }

    dragStartRef.current = null
    setIsDragging(false)
  }

  // Only show on mobile
  if (window.innerWidth > 768) {
    return null
  }

  return (
    <button
      ref={fabRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: '50%',
        background: overlayVisible
          ? 'rgba(255, 255, 255, 0.3)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
        border: 'none',
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 700,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 200,
        boxShadow: overlayVisible
          ? '0 0 20px rgba(255, 255, 255, 0.4), 0 8px 16px rgba(0, 0, 0, 0.6)'
          : '0 8px 16px rgba(0, 0, 0, 0.6)',
        transition: isDragging ? 'none' : 'all 0.2s',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ⊕
    </button>
  )
}
