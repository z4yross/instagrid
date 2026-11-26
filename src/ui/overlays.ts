import { create } from 'zustand'

/*
 * App-level overlays: which dialog is open, confirmations, toasts and the file
 * picker. Replaces browser alert / confirm / prompt (SPEC V27).
 */

export type DialogName = 'export' | 'projects'

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  resolve: (confirmed: boolean) => void
}

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

interface OverlayState {
  dialog: DialogName | null
  confirm: ConfirmRequest | null
  toasts: Toast[]
  /** Mobile library sheet. */
  sheetOpen: boolean
  /** Set by the app shell; opens the system file picker. */
  pickFiles: () => void

  openDialog: (dialog: DialogName) => void
  closeDialog: () => void
  setSheetOpen: (open: boolean) => void
  setPickFiles: (pick: () => void) => void
}

export const useOverlays = create<OverlayState>()((set) => ({
  dialog: null,
  confirm: null,
  toasts: [],
  sheetOpen: false,
  pickFiles: () => {},

  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
  setPickFiles: (pickFiles) => set({ pickFiles }),
}))

/** Ask the user to confirm something. Resolves false when dismissed. */
export function confirm(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useOverlays.getState().confirm?.resolve(false)
    useOverlays.setState({
      confirm: {
        ...request,
        resolve: (confirmed) => {
          useOverlays.setState({ confirm: null })
          resolve(confirmed)
        },
      },
    })
  })
}

const TOAST_MS = 5000
let nextToastId = 1

export function toast(message: string, tone: Toast['tone'] = 'info') {
  const id = nextToastId++
  useOverlays.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }))
  setTimeout(() => dismissToast(id), TOAST_MS)
}

export function dismissToast(id: number) {
  useOverlays.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}
