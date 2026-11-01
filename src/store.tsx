import { Preferences } from '@capacitor/preferences'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Account } from './cloud'
import { byNewest, emptyData, isExpense, sanitize, type Data, type OutboxEntry } from './data'
import { isNative } from './native'
import { cloudEnabled } from './supabase-config'
import type { Expense, ExpenseDraft, Settings } from './types'

const KEY = 'spendy:v1'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

type Cloud = typeof import('./cloud')
let cloudPromise: Promise<Cloud> | null = null
const loadCloud = () => (cloudPromise ??= import('./cloud'))

export const newId = () =>
  // crypto.randomUUID only exists in secure contexts; plain-http LAN testing still needs ids.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

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
  return emptyData()
}

/** Adds entries to the outbox, but only once this device is linked to an account. */
const queue = (d: Data, entries: OutboxEntry[]) =>
  d.sync ? { ...d.outbox, ...Object.fromEntries(entries.map((e) => [e.id, e])) } : d.outbox

interface PullResult {
  pushed: Data['outbox']
  pushedSettings: Settings | null
  rows: Awaited<ReturnType<Cloud['pullExpenses']>>
  /** undefined when not fetched this round; null when the account has no settings yet. */
  remoteSettings: Settings | null | undefined
  fromRow: Cloud['fromRow']
}

function applySync(d: Data, r: PullResult): Data {
  if (!d.sync) return d
  // Confirmed entries leave the outbox, unless they were edited again while in flight.
  const outbox = { ...d.outbox }
  for (const [id, e] of Object.entries(r.pushed)) if (outbox[id] === e) delete outbox[id]

  const byId = new Map(d.expenses.map((e) => [e.id, e]))
  let cursor = d.sync.cursor
  for (const row of r.rows) {
    if (!cursor || row.updated_at > cursor) cursor = row.updated_at
    if (outbox[row.id]) continue // an unsent local change is newer
    if (row.deleted) byId.delete(row.id)
    else {
      const e = r.fromRow(row)
      if (isExpense(e)) byId.set(e.id, e)
    }
  }

  let { settings, settingsDirty } = d
  if (r.pushedSettings && d.settings === r.pushedSettings) settingsDirty = false
  if (r.remoteSettings && !settingsDirty) settings = r.remoteSettings
  if (r.remoteSettings === null && settings.budget !== null) settingsDirty = true

  return {
    ...d,
    expenses: [...byId.values()].sort(byNewest),
    outbox,
    settings,
    settingsDirty,
    sync: { ...d.sync, cursor },
  }
}

function useSpendyState() {
  const [data, setData] = useState(load)
  const [account, setAccount] = useState<Account | null>(null)
  const [authReady, setAuthReady] = useState(!cloudEnabled)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  const dataRef = useRef(data)
  dataRef.current = data
  const accountRef = useRef<Account | null>(null)
  const cloudRef = useRef<Cloud | null>(null)
  const syncing = useRef(false)
  const syncAgain = useRef(false)
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

  // ---- sync ----

  const syncNow = useCallback(async () => {
    const cloud = cloudRef.current
    const acct = accountRef.current
    const d = dataRef.current
    if (!cloud || !acct || d.sync?.userId !== acct.userId) return
    if (syncing.current) {
      syncAgain.current = true
      return
    }
    syncing.current = true
    setSyncStatus('syncing')
    try {
      const pushed = d.outbox
      const pushedSettings = d.settingsDirty ? d.settings : null
      if (Object.keys(pushed).length) await cloud.pushExpenses(acct.userId, Object.values(pushed))
      if (pushedSettings) await cloud.pushSettings(acct.userId, pushedSettings)
      const [rows, remoteSettings] = await Promise.all([
        cloud.pullExpenses(d.sync.cursor),
        pushedSettings ? undefined : cloud.pullSettings(),
      ])
      setData((cur) => applySync(cur, { pushed, pushedSettings, rows, remoteSettings, fromRow: cloud.fromRow }))
      setSyncStatus('synced')
    } catch (err) {
      console.warn('spendy sync failed', err)
      setSyncStatus(navigator.onLine ? 'error' : 'offline')
    } finally {
      syncing.current = false
      if (syncAgain.current) {
        syncAgain.current = false
        setTimeout(syncNow, 300)
      }
    }
  }, [])

  useEffect(() => {
    if (!cloudEnabled) return
    let cancelled = false
    let unsubscribe = () => {}
    loadCloud()
      .then((cloud) => {
        if (cancelled) return
        cloudRef.current = cloud
        unsubscribe = cloud.watchAccount((acct) => {
          setAuthReady(true)
          if (accountRef.current?.userId === acct?.userId) return // token refresh, nothing new
          accountRef.current = acct
          setAccount(acct)
          // Signed out (or session lost): keep this device's copy so signing back in resumes syncing.
          if (!acct) return
          setData((d) => {
            if (d.sync?.userId === acct.userId) return d
            // Another account's data was cached here: drop it.
            if (d.sync) return { ...emptyData(), sync: { userId: acct.userId, cursor: null } }
            // First sign-in on this device: upload everything recorded so far.
            return {
              ...d,
              outbox: Object.fromEntries(d.expenses.map((e) => [e.id, e])),
              settingsDirty: false,
              sync: { userId: acct.userId, cursor: null },
            }
          })
        })
      })
      .catch(() => setAuthReady(true))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const linked = account !== null && data.sync?.userId === account.userId

  // Sync whenever this device becomes linked to the signed-in account (sign-in, app start).
  useEffect(() => {
    if (linked) syncNow()
  }, [linked, syncNow])

  // Push local changes shortly after they happen.
  const pendingCount = Object.keys(data.outbox).length + (data.settingsDirty ? 1 : 0)
  useEffect(() => {
    if (!linked || !pendingCount) return
    const t = setTimeout(syncNow, 800)
    return () => clearTimeout(t)
  }, [linked, data.outbox, data.settingsDirty, pendingCount, syncNow])

  // Catch up when the app comes back to the foreground or the network returns.
  useEffect(() => {
    const kick = () => {
      if (document.visibilityState === 'visible') syncNow()
    }
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', kick)
    return () => {
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', kick)
    }
  }, [syncNow])

  // ---- account ----

  const sendCode = useCallback(async (email: string) => (await loadCloud()).sendCode(email), [])
  const verifyCode = useCallback(
    async (email: string, code: string) => (await loadCloud()).verifyCode(email, code),
    [],
  )
  const signOut = useCallback(async () => {
    await cloudRef.current?.signOut()
    // Explicit sign-out: the data lives in the account, so clear this device.
    setData(emptyData())
  }, [])

  // ---- expenses ----

  const addExpense = useCallback((draft: ExpenseDraft) => {
    const expense: Expense = { ...draft, id: newId(), createdAt: Date.now() }
    setData((d) => ({ ...d, expenses: [...d.expenses, expense].sort(byNewest), outbox: queue(d, [expense]) }))
  }, [])

  const updateExpense = useCallback((id: string, draft: ExpenseDraft) => {
    setData((d) => {
      const prev = d.expenses.find((e) => e.id === id)
      if (!prev) return d
      const next = { ...prev, ...draft }
      return {
        ...d,
        expenses: d.expenses.map((e) => (e.id === id ? next : e)).sort(byNewest),
        outbox: queue(d, [next]),
      }
    })
  }, [])

  const removeExpense = useCallback((id: string) => {
    setData((d) => {
      const prev = d.expenses.find((e) => e.id === id)
      if (!prev) return d
      return {
        ...d,
        expenses: d.expenses.filter((e) => e.id !== id),
        outbox: queue(d, [{ ...prev, deleted: true }]),
      }
    })
  }, [])

  const restoreExpense = useCallback((expense: Expense) => {
    setData((d) => ({ ...d, expenses: [...d.expenses, expense].sort(byNewest), outbox: queue(d, [expense]) }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch }, settingsDirty: d.sync !== null }))
  }, [])

  /** Replaces all expenses and settings (restoring a backup). */
  const replaceAll = useCallback((expenses: Expense[], settings: Settings) => {
    setData((d) => {
      const keep = new Set(expenses.map((e) => e.id))
      const removed = d.expenses.filter((e) => !keep.has(e.id)).map((e) => ({ ...e, deleted: true }))
      return {
        ...d,
        expenses: [...expenses].sort(byNewest),
        settings,
        settingsDirty: d.sync !== null,
        outbox: queue(d, [...removed, ...expenses]),
      }
    })
  }, [])

  const clearAll = useCallback(() => {
    setData((d) => ({
      ...d,
      expenses: [],
      outbox: queue(
        d,
        d.expenses.map((e) => ({ ...e, deleted: true })),
      ),
    }))
  }, [])

  return useMemo(
    () => ({
      expenses: data.expenses,
      settings: data.settings,
      cloudEnabled,
      authReady,
      account,
      /** Linked to an account whose session has ended; signing in again resumes syncing. */
      needsSignIn: !account && data.sync !== null,
      syncStatus,
      pendingCount,
      syncNow,
      sendCode,
      verifyCode,
      signOut,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      updateSettings,
      replaceAll,
      clearAll,
    }),
    [
      data.expenses,
      data.settings,
      data.sync,
      authReady,
      account,
      syncStatus,
      pendingCount,
      syncNow,
      sendCode,
      verifyCode,
      signOut,
      addExpense,
      updateExpense,
      removeExpense,
      restoreExpense,
      updateSettings,
      replaceAll,
      clearAll,
    ],
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
