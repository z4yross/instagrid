import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import CanvasArea from '@/components/Canvas/CanvasArea'
import TopToolbar from '@/components/Toolbar/TopToolbar'
import RightToolbar from '@/components/Toolbar/RightToolbar'
import useKeyboard from '@/hooks/useKeyboard'
import { useStore } from '@/store/useStore'

export default function App() {
  useKeyboard()

  const [lowResWarning, setLowResWarning] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const sidebarVisible = useStore((s) => s.sidebarVisible)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    // Mobile layout: TopToolbar + fullscreen sidebar overlay
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
        <TopToolbar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: 56, position: 'relative' }}>
          {lowResWarning.length > 0 && (
            <div style={{
              padding: '6px 12px',
              background: 'rgba(251,191,36,0.12)',
              borderBottom: '1px solid rgba(251,191,36,0.3)',
              fontSize: 12, color: 'var(--color-warning)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠ Low resolution: {lowResWarning.join(', ')} — may look blurry at export
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                onClick={() => setLowResWarning([])}>✕</button>
            </div>
          )}

          <CanvasArea onLowRes={setLowResWarning} />

          {/* Fullscreen sidebar overlay */}
          {sidebarVisible && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 99,
                  top: 56,
                }}
                onClick={() => useStore.getState().toggleSidebar()}
              />
              <div style={{ position: 'fixed', left: 0, top: 56, bottom: 0, right: 0, zIndex: 100 }}>
                <div style={{ width: '100%', height: '100%' }}>
                  <Sidebar onLowRes={setLowResWarning} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout: RightToolbar + left sidebar (always visible)
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      <Sidebar onLowRes={setLowResWarning} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: 64 }}>
        {lowResWarning.length > 0 && (
          <div style={{
            padding: '6px 12px',
            background: 'rgba(251,191,36,0.12)',
            borderBottom: '1px solid rgba(251,191,36,0.3)',
            fontSize: 12, color: 'var(--color-warning)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠ Low resolution: {lowResWarning.join(', ')} — may look blurry at export
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              onClick={() => setLowResWarning([])}>✕</button>
          </div>
        )}

        <CanvasArea onLowRes={setLowResWarning} />
      </div>

      <RightToolbar />
    </div>
  )
}
