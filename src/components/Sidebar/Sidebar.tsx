import { useRef, useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { loadImageFiles } from '@/utils/imageUtils'
import { exportAllCells } from '@/utils/exportUtils'
import { saveProfile, updateProfile, listProfiles, loadProfile, deleteProfile, type Profile } from '@/utils/storage'
import type { ImageBlock } from '@/store/types'
import Modal, { type ModalType } from '../Modal/Modal'

interface Props {
  onLowRes?: (names: string[]) => void
  width?: number | string
}

interface ModalState {
  type: ModalType
  title?: string
  message: string
  onConfirm: (value?: string) => void
  placeholder?: string
}

export default function Sidebar({ onLowRes, width = 210 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showProfiles, setShowProfiles] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)

  const images = useStore((s) => s.images)
  const blocks = useStore((s) => s.blocks)
  const gridRows = useStore((s) => s.gridRows)
  const showGuides = useStore((s) => s.showGuides)
  const isLoading = useStore((s) => s.isLoading)
  const imageCount = useStore((s) => s.imageCount)
  const gridCellW = useStore((s) => s.gridCellW)
  const gridCellH = useStore((s) => s.gridCellH)
  const addImage = useStore((s) => s.addImage)
  const addBlock = useStore((s) => s.addBlock)
  const addPlaceholder = useStore((s) => s.addPlaceholder)
  const clearCanvas = useStore((s) => s.clearCanvas)
  const clearImages = useStore((s) => s.clearImages)
  const removeImage = useStore((s) => s.removeImage)
  const loadProfileState = useStore((s) => s.loadProfileState)
  const toggleGuides = useStore ((s) => s.toggleGuides)
  const currentProfileId = useStore((s) => s.currentProfileId)
  const setCurrentProfileId = useStore((s) => s.setCurrentProfileId)

  useEffect(() => {
    if (showProfiles) {
      listProfiles().then(setProfiles)
    }
  }, [showProfiles])

  // V27: Autosave profiles (debounced 2s)
  useEffect(() => {
    if (currentProfileId === null) return

    const timeout = setTimeout(async () => {
      try {
        const profile = await loadProfile(currentProfileId)
        if (profile) {
          await updateProfile(currentProfileId, profile.name, blocks, gridRows)
          console.log('Profile autosaved:', profile.name)
        }
      } catch (err) {
        console.error('Autosave failed:', err)
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [blocks, gridRows, currentProfileId])

  async function handleSaveProfile() {
    // V26: Smart save - update existing profile or prompt for new
    if (currentProfileId !== null) {
      // Update existing profile
      try {
        const profile = await loadProfile(currentProfileId)
        if (profile) {
          await updateProfile(currentProfileId, profile.name, blocks, gridRows)
          const updated = await listProfiles()
          setProfiles(updated)
        }
      } catch (err) {
        setModal({
          type: 'alert',
          title: 'Error',
          message: 'Failed to update profile. Check console for details.',
          onConfirm: () => setModal(null),
        })
      }
    } else {
      // Prompt for new profile name
      setModal({
        type: 'prompt',
        title: 'Save Profile',
        message: 'Enter a name for this profile:',
        placeholder: 'Profile name',
        onConfirm: async (name) => {
          setModal(null)
          if (!name) return
          try {
            const id = await saveProfile(name, blocks, gridRows)
            setCurrentProfileId(id)
            const updated = await listProfiles()
            setProfiles(updated)
          } catch (err) {
            setModal({
              type: 'alert',
              title: 'Error',
              message: 'Failed to save profile. Check console for details.',
              onConfirm: () => setModal(null),
            })
          }
        },
      })
    }
  }

  async function handleLoadProfile(id: number) {
    const profile = await loadProfile(id)
    if (profile) {
      loadProfileState(profile.blocks, profile.gridRows)
      setCurrentProfileId(id)
      setShowProfiles(false)
    }
  }

  function handleDeleteProfile(id: number) {
    setModal({
      type: 'confirm',
      title: 'Delete Profile',
      message: 'Are you sure you want to delete this profile?',
      onConfirm: async () => {
        setModal(null)
        await deleteProfile(id)
        const updated = await listProfiles()
        setProfiles(updated)
      },
    })
  }

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

  async function doExport() {
    if (exporting) return
    setExporting(true)
    try { await exportAllCells(blocks, images, gridRows, gridCellW, gridCellH) }
    finally { setExporting(false) }
  }

  return (
    <aside style={{
      width,
      height: '100%',
      flexShrink: 0,
      borderRight: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      background: `
        linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%),
        repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px),
        repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px)
      `,
      boxShadow: 'inset -8px 0 12px rgba(0, 0, 0, 0.4)',
      overflowY: 'auto',
    }}>
      {/* header */}
      <div style={{
        padding: '14px 14px 10px',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          insta<span style={{ color: 'var(--color-accent)' }}>grid</span>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity: 0.8 }}>
            <rect x="1" y="1" width="4" height="4" fill="var(--color-accent)" />
            <rect x="7" y="1" width="4" height="4" fill="var(--color-accent)" opacity="0.6" />
            <rect x="13" y="1" width="4" height="4" fill="var(--color-accent)" opacity="0.3" />
            <rect x="1" y="7" width="4" height="4" fill="var(--color-accent)" opacity="0.6" />
            <rect x="7" y="7" width="4" height="4" fill="var(--color-accent)" />
            <rect x="13" y="7" width="4" height="4" fill="var(--color-accent)" opacity="0.6" />
            <rect x="1" y="13" width="4" height="4" fill="var(--color-accent)" opacity="0.3" />
            <rect x="7" y="13" width="4" height="4" fill="var(--color-accent)" opacity="0.6" />
            <rect x="13" y="13" width="4" height="4" fill="var(--color-accent)" />
          </svg>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, letterSpacing: '0.5px' }}>feed planner</div>
      </div>

      {/* upload */}
      <div style={{ padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          className="ig-btn ig-btn-accent"
          style={{ width: '100%', padding: '8px', fontSize: 12 }}
          onClick={() => fileRef.current?.click()}
        >
          ＋ Upload images
        </button>
        <button
          className="ig-btn ig-btn-filled"
          style={{ width: '100%', padding: '7px', fontSize: 11 }}
          onClick={addPlaceholder}
        >
          ＋ Add placeholder
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* thumbnails */}
      {isLoading ? (
        <div style={{ padding: '0 10px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Loading{imageCount > 0 ? ` ${imageCount} image${imageCount !== 1 ? 's' : ''}` : ''}...
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {Array.from({ length: imageCount || 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 5,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
        </div>
      ) : images.length > 0 ? (
        <div style={{ padding: '0 10px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            {images.length} image{images.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => {
                  const pos = findFreeCellInBlocks(blocks, gridRows)
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
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '3/4',
                  borderRadius: 5,
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.15)'
                  const deleteBtn = e.currentTarget.querySelector('[data-delete-btn]') as HTMLElement
                  if (deleteBtn) deleteBtn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  const deleteBtn = e.currentTarget.querySelector('[data-delete-btn]') as HTMLElement
                  if (deleteBtn) deleteBtn.style.opacity = '0'
                }}
              >
                <img src={img.src} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} />
                <button
                  data-delete-btn
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(img.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.75)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 0.15s, background 0.15s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(220,38,38,0.9)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.75)'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          margin: '0 10px 8px',
          padding: '18px 10px',
          borderRadius: 8,
          border: '1px dashed var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 11,
          lineHeight: 1.5,
        }}>
          Drop images on canvas<br/>or click upload
        </div>
      )}

      {/* divider */}
      <div style={{ flex: 1 }} />
      <div style={{ margin: '0 10px', borderTop: '1px solid var(--color-border)' }} />

      {/* actions */}
      <div style={{ padding: '8px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button
          className="ig-btn ig-btn-filled"
          style={{ width: '100%', justifyContent: 'flex-start' }}
          onClick={() => {
            setModal({
              type: 'confirm',
              title: 'New Profile',
              message: 'Start a new profile? This will clear the current canvas.',
              onConfirm: () => {
                setModal(null)
                clearCanvas()
                setCurrentProfileId(null)
              },
            })
          }}
        >
New profile
        </button>

        <button className="ig-btn" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleSaveProfile}>
Save profile
        </button>

        <button className="ig-btn" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setShowProfiles(!showProfiles)}>
{showProfiles ? 'Hide' : 'Load'} profiles
        </button>

        {showProfiles && (
          <div style={{ maxHeight: 150, overflowY: 'auto', background: 'var(--color-bg-base)', borderRadius: 6, padding: 4 }}>
            {profiles.length === 0 ? (
              <div style={{ padding: 8, fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center' }}>No profiles saved</div>
            ) : (
              profiles.map((p) => (
                <div key={p.id} style={{ display: 'flex', gap: 4, padding: 4 }}>
                  <button
                    className="ig-btn"
                    style={{ flex: 1, justifyContent: 'flex-start', fontSize: 10, padding: '4px 6px' }}
                    onClick={() => handleLoadProfile(p.id!)}
                  >
                    {p.name}
                  </button>
                  <button
                    className="ig-btn ig-btn-danger"
                    style={{ width: 24, height: 24, padding: 0, fontSize: 10 }}
                    onClick={() => handleDeleteProfile(p.id!)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

        <button className="ig-btn" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={toggleGuides}>
{showGuides ? 'Hide guides' : 'Show guides'}
        </button>

        <button
          className={`ig-btn${blocks.length > 0 ? ' ig-btn-accent' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start', opacity: blocks.length === 0 ? 0.4 : 1 }}
          onClick={doExport}
          disabled={exporting || blocks.length === 0}
        >
{exporting ? 'Exporting…' : 'Export ZIP'}
        </button>

        <button
          className="ig-btn ig-btn-danger"
          style={{ width: '100%', justifyContent: 'flex-start' }}
          onClick={() => {
            setModal({
              type: 'confirm',
              title: 'Clear Canvas',
              message: 'Remove all blocks from the canvas?',
              onConfirm: () => {
                setModal(null)
                clearCanvas()
              },
            })
          }}
        >
Clear canvas
        </button>

        <button
          className="ig-btn ig-btn-danger"
          style={{ width: '100%', justifyContent: 'flex-start', opacity: images.length === 0 ? 0.4 : 1 }}
          onClick={() => {
            setModal({
              type: 'confirm',
              title: 'Clear Images',
              message: 'Clear all images from memory? This cannot be undone.',
              onConfirm: () => {
                setModal(null)
                clearImages()
              },
            })
          }}
          disabled={images.length === 0}
        >
Clear images
        </button>
      </div>

      {modal && (
        <Modal
          type={modal.type}
          title={modal.title}
          message={modal.message}
          placeholder={modal.placeholder}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </aside>
  )
}
