import { useStore } from '@/store/useStore'
import ColorPicker from '@/components/ColorPicker/ColorPicker'

export default function RightToolbar() {
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlocks = useStore((s) => s.removeBlocks)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)

  const selectedBlocks = blocks.filter((b) => selectedBlockIds.includes(b.id))
  const block = selectedBlocks.length === 1 ? selectedBlocks[0] : null
  const disabled = selectedBlocks.length === 0

  function rotate() {
    if (selectedBlocks.length === 0) return
    selectedBlocks.forEach((b) => {
      const next = ((b.transform.rotation + 90) % 360) as 0 | 90 | 180 | 270
      updateBlock(b.id, { transform: { ...b.transform, rotation: next } })
    })
  }

  function flipHorizontal() {
    if (selectedBlocks.length === 0) return
    selectedBlocks.forEach((b) => {
      updateBlock(b.id, { transform: { ...b.transform, flipX: !b.transform.flipX } })
    })
  }

  function flipVertical() {
    if (selectedBlocks.length === 0) return
    selectedBlocks.forEach((b) => {
      updateBlock(b.id, { transform: { ...b.transform, flipY: !b.transform.flipY } })
    })
  }

  function adjustPan(dx: number, dy: number) {
    if (selectedBlocks.length === 0) return
    selectedBlocks.forEach((b) => {
      updateBlock(b.id, { transform: { ...b.transform, panX: b.transform.panX + dx, panY: b.transform.panY + dy } })
    })
  }

  function adjustZoom(delta: number) {
    if (selectedBlocks.length === 0) return
    selectedBlocks.forEach((b) => {
      const zoom = Math.max(0.1, Math.min(10, b.transform.zoom + delta))
      updateBlock(b.id, { transform: { ...b.transform, zoom } })
    })
  }

  function del() {
    if (selectedBlocks.length === 0) return
    removeBlocks(selectedBlockIds)
    setSelectedBlocks([])
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 64,
        height: '100vh',
        background: 'linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #1a0f2e 100%)',
        borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '-2px 0 20px rgba(139, 92, 246, 0.2), inset 1px 0 0 rgba(139, 92, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 8px',
        gap: 8,
        zIndex: 100,
      }}
    >
      {selectedBlocks.length > 1 && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
          padding: '6px 0',
          background: 'var(--color-accent)',
          borderRadius: 4,
          border: '1px solid var(--color-accent)',
          boxShadow: '0 0 12px rgba(255, 107, 53, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}>
          {selectedBlocks.length}
        </div>
      )}

      <IconBtn onClick={rotate} disabled={disabled} title="Rotate 90°">↻</IconBtn>
      <IconBtn onClick={flipHorizontal} disabled={disabled} title="Flip horizontal">⇄</IconBtn>
      <IconBtn onClick={flipVertical} disabled={disabled} title="Flip vertical">⇅</IconBtn>

      <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

      <IconBtn onClick={() => adjustPan(0, -10)} disabled={disabled} title="Pan up">↑</IconBtn>
      <IconBtn onClick={() => adjustPan(-10, 0)} disabled={disabled} title="Pan left">←</IconBtn>
      <IconBtn onClick={() => adjustPan(10, 0)} disabled={disabled} title="Pan right">→</IconBtn>
      <IconBtn onClick={() => adjustPan(0, 10)} disabled={disabled} title="Pan down">↓</IconBtn>

      <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

      <IconBtn onClick={() => adjustZoom(0.1)} disabled={disabled} title="Zoom in">＋</IconBtn>
      <IconBtn onClick={() => adjustZoom(-0.1)} disabled={disabled} title="Zoom out">－</IconBtn>

      <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

      <div style={{ padding: '4px 0' }}>
        <ColorPicker
          value={block?.barsColor ?? '#000000'}
          onChange={(color) => block && updateBlock(block.id, { barsColor: color })}
          disabled={disabled}
        />
      </div>

      <div style={{ flex: 1 }} />

      <IconBtn onClick={del} disabled={disabled} title="Delete" danger>✕</IconBtn>
    </div>
  )
}

function IconBtn({ children, onClick, disabled, title, danger }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 700,
        background: disabled ? 'rgba(255, 255, 255, 0.05)' : danger ? '#ff4444' : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${disabled ? 'rgba(255, 255, 255, 0.1)' : danger ? '#ff4444' : 'rgba(255, 255, 255, 0.25)'}`,
        color: disabled ? '#555555' : '#ffffff',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.4 : 1,
        boxShadow: danger ? '0 0 12px rgba(255, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.background = '#ff6666'
            e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          } else {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.background = '#ff4444'
            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          } else {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
          }
        }
      }}
    >
      {children}
    </button>
  )
}
