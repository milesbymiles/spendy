// Per-device conveniences, kept out of the synced data on purpose.
import type { CategoryId, PaymentMethod } from './types'

export type Theme = 'system' | 'light' | 'dark'

interface Prefs {
  lastCategory?: CategoryId
  lastMethod?: PaymentMethod
  theme?: Theme
}

const KEY = 'spendy:prefs'

export function getPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

export function setPrefs(patch: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getPrefs(), ...patch }))
  } catch {
    // storage unavailable; the app just won't remember
  }
}

const THEME_COLOR = { light: '#f4f4f1', dark: '#0d0d0d' }

/** Applies a theme override (or follows the OS for 'system'), including the browser chrome colour. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? THEME_COLOR.dark : THEME_COLOR.light
    meta.content = theme === 'system' ? own : THEME_COLOR[theme]
  }
}
