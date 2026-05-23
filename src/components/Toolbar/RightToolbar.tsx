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
        background: 'linear-gradient(180deg, #13131e 0%, #0d0d14 100%)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 8px',
        gap: 8,
        zIndex: 100,
      }}
    >
      {selectedBlocks.length > 1 && (
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--color-accent)',
          textAlign: 'center',
          padding: '4px 0',
          background: 'rgba(168,85,247,0.1)',
          borderRadius: 4,
        }}>
          {selectedBlocks.length}
        </div>
      )}

      <IconBtn onClick={rotate} disabled={disabled} title="Rotate 90°">↻</IconBtn>

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
        fontWeight: 500,
        background: disabled ? 'var(--color-bg-base)' : danger ? 'rgba(248,113,113,0.1)' : 'var(--color-bg-elevated)',
        border: `1px solid ${disabled ? 'var(--color-border-subtle)' : danger ? 'rgba(248,113,113,0.3)' : 'var(--color-border)'}`,
        color: disabled ? 'var(--color-text-muted)' : danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.18)' : 'var(--color-bg-hover)')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.1)' : 'var(--color-bg-elevated)')}
    >
      {children}
    </button>
  )
}
