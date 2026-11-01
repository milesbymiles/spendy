import { Preferences } from '@capacitor/preferences'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isCategoryId } from './categories'
import { isNative } from './native'
import type { Expense, ExpenseDraft, Settings } from './types'

const KEY = 'spendy:v1'

interface Data {
  expenses: Expense[]
  settings: Settings
}

const defaultSettings = (): Settings => ({ budget: null })

export const newId = () =>
  // crypto.randomUUID only exists in secure contexts; plain-http LAN testing still needs ids.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

const byNewest = (a: Expense, b: Expense) =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt

function isExpense(e: unknown): e is Expense {
  if (!e || typeof e !== 'object') return false
  const x = e as Record<string, unknown>
  return (
    typeof x.id === 'string' &&
    Number.isInteger(x.amount) &&
    isCategoryId(x.category) &&
    typeof x.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date)
  )
}

/** Validates and normalises data from storage or an imported backup. */
export function sanitize(raw: unknown): Data | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.expenses)) return null
  const expenses = r.expenses
    .filter(isExpense)
    .map((e) => ({
      ...e,
      note: typeof e.note === 'string' ? e.note : '',
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    }))
    .sort(byNewest)
  const s = (r.settings ?? {}) as Partial<Settings>
  const settings: Settings = {
    budget: typeof s.budget === 'number' && s.budget > 0 ? Math.round(s.budget) : null,
  }
  return { expenses, settings }
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = sanitize(JSON.parse(raw))
      if (data) return data
    }
  } catch {
    // corrupted or unavailable storage: start fresh
  }
  return { expenses: [], settings: defaultSettings() }
}

function useSpendyState() {
  const [data, setData] = useState(load)
  // In the iOS app, localStorage is only a fast cache: iOS may clear WebView storage, so the
  // durable copy lives in native Preferences. Don't write there until it has been read.
  const hydrated = useRef(!isNative)

  useEffect(() => {
    const json = JSON.stringify(data)
    try {
      localStorage.setItem(KEY, json)
    } catch {
      // storage full or blocked; nothing sensible to do
    }
    if (isNative && hydrated.current) Preferences.set({ key: KEY, value: json }).catch(() => {})
  }, [data])

  useEffect(() => {
    if (!isNative) {
      // Ask the browser not to evict our data under storage pressure.
      navigator.storage?.persist?.().catch(() => {})
      return
    }
    Preferences.get({ key: KEY })
      .then(({ value }) => {
        let saved: Data | null = null
        try {
          saved = value ? sanitize(JSON.parse(value)) : null
        } catch {
          // unreadable durable copy: keep what localStorage had
        }
        hydrated.current = true
        // Replacing state re-runs the save effect, which writes the durable copy.
        setData((current) => saved ?? { ...current })
      })
      .catch(() => {
        hydrated.current = true
      })
  }, [])

  const addExpense = useCallback((draft: ExpenseDraft) => {
    const expense: Expense = { ...draft, id: newId(), createdAt: Date.now() }
    setData((d) => ({ ...d, expenses: [...d.expenses, expense].sort(byNewest) }))
  }, [])

  const updateExpense = useCallback((id: string, draft: ExpenseDraft) => {
    setData((d) => ({
      ...d,
      expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...draft } : e)).sort(byNewest),
    }))
  }, [])

  const removeExpense = useCallback((id: string) => {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }))
  }, [])

  const restoreExpense = useCallback((expense: Expense) => {
    setData((d) => ({ ...d, expenses: [...d.expenses, expense].sort(byNewest) }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const replaceAll = useCallback((next: Data) => {
    setData(next)
  }, [])

  const clearAll = useCallback(() => {
    setData((d) => ({ ...d, expenses: [] }))
  }, [])

  return useMemo(
    () => ({
      ...data,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      updateSettings,
      replaceAll,
      clearAll,
    }),
    [data, addExpense, updateExpense, removeExpense, restoreExpense, updateSettings, replaceAll, clearAll],
  )
}

type Store = ReturnType<typeof useSpendyState>

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useSpendyState()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
