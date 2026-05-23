// Centralized theme configuration
// Change colors here to update entire app

export const theme = {
  // Main accent color
  accent: {
    primary: '#7c3aed',      // violet-600 - darker purple
    hover: '#8b5cf6',        // violet-500
    glow: 'rgba(124, 58, 237, 0.6)',
    soft: 'rgba(124, 58, 237, 0.18)',
  },

  // Backgrounds
  bg: {
    base: '#000000',         // pure black for grid
    surface: '#0d0d0d',
    elevated: '#1a1a1a',
    hover: '#2a2a2a',

    // Sidebar gradients
    sidebarGradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1850 50%, #1a0a2e 100%)',
  },

  // Borders
  border: {
    default: '#444444',
    subtle: '#222222',
    accent: 'rgba(124, 58, 237, 0.4)',
    accentBright: 'rgba(124, 58, 237, 0.6)',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    muted: '#888888',
  },

  // Semantic colors
  danger: '#ff4444',
  warning: '#ffaa00',

  // Shadows & Effects
  shadow: {
    accent: '0 0 16px rgba(124, 58, 237, 0.5)',
    accentHover: '0 0 24px rgba(124, 58, 237, 0.7)',
    accentSoft: '0 0 12px rgba(124, 58, 237, 0.4)',
    sidebarGlow: '2px 0 20px rgba(124, 58, 237, 0.25)',
    insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
}

// CSS-in-JS helper to convert theme to inline styles
export const cssVar = (value: string) => value
