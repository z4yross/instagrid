import { useState } from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import CanvasArea from '@/components/Canvas/CanvasArea'
import RightToolbar from '@/components/Toolbar/RightToolbar'
import useKeyboard from '@/hooks/useKeyboard'
import { useStore } from '@/store/useStore'

export default function App() {
  useKeyboard()

  const [lowResWarning, setLowResWarning] = useState<string[]>([])
  const isLoading = useStore((s) => s.isLoading)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg-base)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading images...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

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
