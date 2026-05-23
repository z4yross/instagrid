/**
 * ═══════════════════════════════════════════════════════════════
 * CENTRALIZED THEME CONFIGURATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Change colors, gradients, and effects here to update the entire app.
 *
 * IMPORTANT: After changing values here, also update:
 *   1. src/index.css → @theme section (CSS variables)
 *   2. Inline styles in components that use hardcoded colors
 *
 * Files with inline color references:
 *   - src/components/Sidebar/Sidebar.tsx (sidebar gradient, borders, shadows)
 *   - src/components/Toolbar/RightToolbar.tsx (toolbar gradient, borders, shadows)
 *   - src/components/Canvas/CanvasArea.tsx (selection box gradients)
 *   - src/components/Canvas/GridCanvas.tsx (grid radial gradient)
 *   - src/components/Modal/Modal.tsx (modal border shadow)
 *   - src/index.css (button shadows, accent glows)
 *
 * Quick theme swap guide:
 *   1. Pick your accent color (e.g., #7c3aed for purple, #3b82f6 for blue)
 *   2. Update accent.primary and accent.hover below
 *   3. Calculate rgba() version for accent.glow and accent.soft
 *   4. Update sidebar gradients (bg.sidebarGradient) with darker tones
 *   5. Search/replace old rgba() values in files listed above
 *   6. Update --color-accent in index.css
 *
 * ═══════════════════════════════════════════════════════════════
 */

export const theme = {
  // ─── Main Accent Color ────────────────────────────────────────
  accent: {
    primary: '#7c3aed',      // violet-600 (darker purple)
    hover: '#8b5cf6',        // violet-500 (lighter on hover)
    glow: 'rgba(124, 58, 237, 0.6)',     // Convert primary to rgba for glows
    soft: 'rgba(124, 58, 237, 0.18)',    // Subtle background tints
  },

  // ─── Backgrounds ──────────────────────────────────────────────
  bg: {
    base: '#000000',         // Pure black for grid canvas
    surface: '#0d0d0d',      // Slightly lighter for surfaces
    elevated: '#1a1a1a',     // Elevated elements
    hover: '#2a2a2a',        // Hover states

    // Sidebar gradient: adjust these hex values for different themes
    // Format: 'linear-gradient(135deg, dark 0%, mid 50%, dark 100%)'
    sidebarGradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1850 50%, #1a0a2e 100%)',
  },

  // ─── Borders ──────────────────────────────────────────────────
  border: {
    default: '#444444',                     // Standard borders
    subtle: '#222222',                      // Subtle dividers
    accent: 'rgba(124, 58, 237, 0.4)',      // Accent borders
    accentBright: 'rgba(124, 58, 237, 0.6)', // Brighter accent borders
  },

  // ─── Text Colors ──────────────────────────────────────────────
  text: {
    primary: '#ffffff',      // Main text
    secondary: '#e0e0e0',    // Secondary text
    muted: '#888888',        // Muted/disabled text
  },

  // ─── Semantic Colors ──────────────────────────────────────────
  danger: '#ff4444',         // Delete, destructive actions
  warning: '#ffaa00',        // Warnings, alerts

  // ─── Shadows & Effects ────────────────────────────────────────
  shadow: {
    accent: '0 0 16px rgba(124, 58, 237, 0.5)',           // Accent button glow
    accentHover: '0 0 24px rgba(124, 58, 237, 0.7)',      // Accent hover glow
    accentSoft: '0 0 12px rgba(124, 58, 237, 0.4)',       // Subtle accent glow
    sidebarGlow: '2px 0 20px rgba(124, 58, 237, 0.25)',   // Sidebar edge glow
    insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)', // Top highlight
  },
}

// Helper for future CSS-in-JS integration
export const cssVar = (value: string) => value
