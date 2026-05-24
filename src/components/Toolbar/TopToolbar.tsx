import { useStore } from '@/store/useStore'
import ColorPicker from '@/components/ColorPicker/ColorPicker'
import { Lock, Menu, Layers } from 'lucide-react'

interface Props {
  onToggleFAB?: () => void
  fabVisible?: boolean
}

export default function TopToolbar({ onToggleFAB, fabVisible }: Props = {}) {
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlocks = useStore((s) => s.removeBlocks)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const sidebarVisible = useStore((s) => s.sidebarVisible)
  const dragMode = useStore((s) => s.dragMode)
  const toggleDragMode = useStore((s) => s.toggleDragMode)

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

  function del() {
    if (selectedBlocks.length === 0) return
    removeBlocks(selectedBlockIds)
    setSelectedBlocks([])
  }

  const isMobile = window.innerWidth <= 768

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#000',
        borderBottom: 'none',
        boxShadow: 'inset 0 -8px 12px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        zIndex: 100,
      }}
    >
      {isMobile && sidebarVisible ? (
        /* Menu button + logo when sidebar open on mobile */
        <>
          <IconBtn onClick={toggleSidebar} active={sidebarVisible} title="Hide">
            <Menu size={18} />
          </IconBtn>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            InstaGrid
          </div>
        </>
      ) : (
        <>
          {/* Sidebar toggle */}
          <IconBtn
            onClick={toggleSidebar}
            active={sidebarVisible}
            title={sidebarVisible ? 'Hide' : 'Show'}
          >
            <Menu size={18} />
          </IconBtn>

          {/* Drag lock - second position for mobile access */}
          <IconBtn onClick={toggleDragMode} active={dragMode} title="Drag mode">
            <Lock size={18} />
          </IconBtn>

          {/* T135: FAB toggle - third position for mobile UX */}
          {isMobile && onToggleFAB && (
            <IconBtn onClick={onToggleFAB} active={fabVisible} title="Toggle actions">
              <Layers size={18} />
            </IconBtn>
          )}

          {/* Selection count badge */}
          {selectedBlocks.length > 1 && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#000',
                padding: '5px 8px',
                background: '#ffffff',
                borderRadius: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {selectedBlocks.length}
            </div>
          )}

          {/* Essential controls only */}
          <IconBtn onClick={rotate} disabled={disabled} title="Rotate">
            ↻
          </IconBtn>

          <ColorPicker
            value={block?.barsColor ?? '#000000'}
            onChange={(color) => block && updateBlock(block.id, { barsColor: color })}
            disabled={disabled}
          />

          <div style={{ flex: 1 }} />

          <IconBtn onClick={del} disabled={disabled} title="Delete" danger>
            ✕
          </IconBtn>
        </>
      )}
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
  active,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  active?: boolean
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
        fontSize: 18,
        fontWeight: 700,
        background: disabled
          ? 'rgba(0, 0, 0, 0.15)'
          : danger
            ? 'rgba(255, 68, 68, 0.2)'
            : active
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.3)',
        border: 'none',
        color: disabled ? '#666666' : danger ? '#ff4444' : '#ffffff',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled
          ? 'none'
          : danger
            ? '0 0 8px rgba(255, 68, 68, 0.3)'
            : active
              ? '0 0 12px rgba(255, 255, 255, 0.3)'
              : '0 0 8px rgba(255, 255, 255, 0.15)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger
            ? 'rgba(255, 68, 68, 0.3)'
            : active
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(0, 0, 0, 0.5)'
          e.currentTarget.style.boxShadow = danger
            ? '0 0 12px rgba(255, 68, 68, 0.4)'
            : active
              ? '0 0 16px rgba(255, 255, 255, 0.4)'
              : '0 0 12px rgba(255, 255, 255, 0.25)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger
            ? 'rgba(255, 68, 68, 0.2)'
            : active
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.boxShadow = danger
            ? '0 0 8px rgba(255, 68, 68, 0.3)'
            : active
              ? '0 0 12px rgba(255, 255, 255, 0.3)'
              : '0 0 8px rgba(255, 255, 255, 0.15)'
        }
      }}
    >
      {children}
    </button>
  )
}
