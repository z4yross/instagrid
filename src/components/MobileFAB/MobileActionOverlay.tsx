import { useStore } from '@/store/useStore'

interface Props {
  visible: boolean
  fabPosition: { x: number; y: number }
}

const BUTTON_SIZE = 50
const GAP = 6

export default function MobileActionOverlay({ visible, fabPosition }: Props) {
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)

  const selectedBlocks = blocks.filter((b) => selectedBlockIds.includes(b.id))
  const disabled = selectedBlocks.length === 0

  function adjustPan(dx: number, dy: number) {
    if (disabled) return
    selectedBlocks.forEach((b) => {
      updateBlock(b.id, {
        transform: {
          ...b.transform,
          panX: b.transform.panX + dx,
          panY: b.transform.panY + dy,
        },
      })
    })
  }

  function adjustZoom(delta: number) {
    if (disabled) return
    selectedBlocks.forEach((b) => {
      const zoom = Math.max(0.1, Math.min(10, b.transform.zoom + delta))
      updateBlock(b.id, { transform: { ...b.transform, zoom } })
    })
  }

  if (!visible) return null

  // Position left or right of FAB based on available space
  const overlayWidth = BUTTON_SIZE * 3 + GAP * 2
  const spaceOnRight = window.innerWidth - (fabPosition.x + 60 + 16)
  const positionLeft = spaceOnRight >= overlayWidth

  const overlayX = positionLeft
    ? fabPosition.x + 60 + 16
    : fabPosition.x - overlayWidth - 16

  // Vertically align with FAB center
  const overlayY = fabPosition.y + 30 - (BUTTON_SIZE * 2 + GAP) / 2

  return (
    <div
      style={{
        position: 'fixed',
        left: overlayX,
        top: overlayY,
        zIndex: 199,
        pointerEvents: 'auto',
      }}
    >
      {/* Top row: - ↑ + */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
        <ActionButton onClick={() => adjustZoom(-0.1)} disabled={disabled}>
          －
        </ActionButton>
        <ActionButton onClick={() => adjustPan(0, -10)} disabled={disabled}>
          ↑
        </ActionButton>
        <ActionButton onClick={() => adjustZoom(0.1)} disabled={disabled}>
          ＋
        </ActionButton>
      </div>

      {/* Middle row: ← ↓ → */}
      <div style={{ display: 'flex', gap: GAP }}>
        <ActionButton onClick={() => adjustPan(-10, 0)} disabled={disabled}>
          ←
        </ActionButton>
        <ActionButton onClick={() => adjustPan(0, 10)} disabled={disabled}>
          ↓
        </ActionButton>
        <ActionButton onClick={() => adjustPan(10, 0)} disabled={disabled}>
          →
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        background: disabled
          ? 'rgba(0, 0, 0, 0.5)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
        border: 'none',
        borderRadius: 8,
        color: disabled ? '#666666' : '#ffffff',
        fontSize: 20,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled
          ? 'none'
          : '0 4px 8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        transition: 'all 0.15s',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </button>
  )
}
