import { useStore } from '@/store/useStore'
import ColorPicker from '@/components/ColorPicker/ColorPicker'

export default function TopToolbar() {
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlocks = useStore((s) => s.removeBlocks)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const sidebarVisible = useStore((s) => s.sidebarVisible)

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
        left: 0,
        right: 0,
        height: 56,
        background: `
          linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%),
          repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px),
          repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px)
        `,
        borderBottom: 'none',
        boxShadow: 'inset 0 -8px 12px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        zIndex: 100,
      }}
    >
      {/* Sidebar toggle */}
      <IconBtn onClick={toggleSidebar} title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}>
        {sidebarVisible ? '‹' : '›'}
      </IconBtn>

      {/* Logo */}
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
        insta<span style={{ color: 'var(--color-accent)' }}>grid</span>
      </div>

      {/* Selection count */}
      {selectedBlocks.length > 1 && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          padding: '4px 8px',
          background: 'var(--color-accent)',
          borderRadius: 4,
          border: '1px solid var(--color-accent)',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}>
          {selectedBlocks.length} selected
        </div>
      )}

      {/* Controls */}
      <IconBtn onClick={rotate} disabled={disabled} title="Rotate 90°">↻</IconBtn>
      <IconBtn onClick={flipHorizontal} disabled={disabled} title="Flip horizontal">⇄</IconBtn>
      <IconBtn onClick={flipVertical} disabled={disabled} title="Flip vertical">⇅</IconBtn>

      <div style={{ width: 1, height: 32, background: 'var(--color-border)', margin: '0 4px' }} />

      <IconBtn onClick={() => adjustPan(0, -10)} disabled={disabled} title="Pan up">↑</IconBtn>
      <IconBtn onClick={() => adjustPan(-10, 0)} disabled={disabled} title="Pan left">←</IconBtn>
      <IconBtn onClick={() => adjustPan(10, 0)} disabled={disabled} title="Pan right">→</IconBtn>
      <IconBtn onClick={() => adjustPan(0, 10)} disabled={disabled} title="Pan down">↓</IconBtn>

      <div style={{ width: 1, height: 32, background: 'var(--color-border)', margin: '0 4px' }} />

      <IconBtn onClick={() => adjustZoom(0.1)} disabled={disabled} title="Zoom in">＋</IconBtn>
      <IconBtn onClick={() => adjustZoom(-0.1)} disabled={disabled} title="Zoom out">－</IconBtn>

      <div style={{ width: 1, height: 32, background: 'var(--color-border)', margin: '0 4px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</span>
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
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        background: disabled ? 'rgba(255, 255, 255, 0.05)' : danger ? 'transparent' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
        border: danger ? '1px dashed rgba(255, 255, 255, 0.3)' : 'none',
        color: disabled ? '#555555' : danger ? '#ff4444' : '#ffffff',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.4 : 1,
        boxShadow: danger ? 'none' : '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.background = 'rgba(255, 68, 68, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            e.currentTarget.style.color = '#ff6666'
          } else {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.1) 100%)'
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.color = '#ff4444'
          } else {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          }
        }
      }}
    >
      {children}
    </button>
  )
}
