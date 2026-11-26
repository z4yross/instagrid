import { describe, expect, it } from 'vitest'
import { oppositeTheme, readPreference, resolveTheme, THEME_STORAGE_KEY } from './theme'

const storage = (value: string | null) => ({
  getItem: (key: string) => (key === THEME_STORAGE_KEY ? value : null),
})

describe('theme preference (V36)', () => {
  it('follows the system when nothing is stored', () => {
    expect(readPreference(storage(null))).toBe('system')
    expect(readPreference(null)).toBe('system')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('lets a stored override win over the system', () => {
    expect(readPreference(storage('dark'))).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('ignores an unknown stored value and a throwing storage', () => {
    expect(readPreference(storage('sepia'))).toBe('system')
    expect(
      readPreference({
        getItem: () => {
          throw new Error('blocked')
        },
      })
    ).toBe('system')
  })

  it('toggles to the opposite of what is showing', () => {
    expect(oppositeTheme('light')).toBe('dark')
    expect(oppositeTheme('dark')).toBe('light')
  })
})
