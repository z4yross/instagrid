import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import CanvasArea from '@/components/Canvas/CanvasArea'
import TopToolbar from '@/components/Toolbar/TopToolbar'
import RightToolbar from '@/components/Toolbar/RightToolbar'
import MobileFAB from '@/components/MobileFAB/MobileFAB'
import MobileActionOverlay from '@/components/MobileFAB/MobileActionOverlay'
import useKeyboard from '@/hooks/useKeyboard'
import { useStore } from '@/store/useStore'

export default function App() {
  useKeyboard()

  const [lowResWarning, setLowResWarning] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [fabVisible, setFabVisible] = useState(true) // T134: FAB visibility separate from overlay
  const [fabOverlayVisible, setFabOverlayVisible] = useState(false)
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 })
  const sidebarVisible = useStore((s) => s.sidebarVisible)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    // Mobile layout: TopToolbar + fullscreen sidebar overlay
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--color-bg-base)',
        }}
      >
        <TopToolbar onToggleFAB={() => setFabVisible(!fabVisible)} fabVisible={fabVisible} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginTop: 64,
            position: 'relative',
          }}
        >
          {lowResWarning.length > 0 && (
            <div
              style={{
                padding: '6px 12px',
                background: 'rgba(251,191,36,0.12)',
                borderBottom: '1px solid rgba(251,191,36,0.3)',
                fontSize: 12,
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⚠ Low resolution: {lowResWarning.join(', ')} — may look blurry at export
              <button
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
                onClick={() => setLowResWarning([])}
              >
                ✕
              </button>
            </div>
          )}

          <CanvasArea onLowRes={setLowResWarning} />

          {/* Fullscreen sidebar overlay */}
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 99,
                top: 64,
                opacity: sidebarVisible ? 1 : 0,
                pointerEvents: sidebarVisible ? 'auto' : 'none',
                transition: 'opacity 0.25s ease-out',
              }}
              onClick={() => useStore.getState().toggleSidebar()}
            />
            <div
              style={{
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                right: 0,
                zIndex: 100,
                transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease-out',
              }}
            >
              <Sidebar onLowRes={setLowResWarning} width="100%" />
            </div>
          </>

          {/* Mobile FAB for actions - hide when sidebar active */}
          {!sidebarVisible && (
            <MobileFAB
              visible={fabVisible}
              overlayVisible={fabOverlayVisible}
              onToggle={setFabOverlayVisible}
              onPositionChange={setFabPosition}
            />
          )}

          {/* Mobile action overlay */}
          <MobileActionOverlay visible={fabOverlayVisible} fabPosition={fabPosition} />
        </div>
      </div>
    )
  }

  // Desktop layout: RightToolbar + left sidebar (always visible)
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--color-bg-base)',
      }}
    >
      <Sidebar onLowRes={setLowResWarning} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginRight: 64,
        }}
      >
        {lowResWarning.length > 0 && (
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(251,191,36,0.12)',
              borderBottom: '1px solid rgba(251,191,36,0.3)',
              fontSize: 12,
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ⚠ Low resolution: {lowResWarning.join(', ')} — may look blurry at export
            <button
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
              onClick={() => setLowResWarning([])}
            >
              ✕
            </button>
          </div>
        )}

        <CanvasArea onLowRes={setLowResWarning} />
      </div>

      <RightToolbar />
    </div>
  )
}
