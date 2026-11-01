import { isCategoryId, isPaymentMethod } from './categories'
import type { Category, Expense, Settings } from './types'

/** An expense waiting to be sent to the server; `deleted` marks a deletion. */
export type OutboxEntry = Expense & { deleted?: boolean }

export interface SyncState {
  userId: string
  /** Latest server `updated_at` already pulled, or null before the first pull. */
  cursor: string | null
}

export interface Data {
  expenses: Expense[]
  settings: Settings
  /** Set once this device is linked to an account. */
  sync: SyncState | null
  /** Local changes the server hasn't confirmed yet, keyed by expense id. */
  outbox: Record<string, OutboxEntry>
  settingsDirty: boolean
}

export const emptyData = (): Data => ({
  expenses: [],
  settings: { budget: null, categories: [], hidden: [] },
  sync: null,
  outbox: {},
  settingsDirty: false,
})

export const byNewest = (a: Expense, b: Expense) =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt

export function isExpense(e: unknown): e is Expense {
  if (!e || typeof e !== 'object') return false
  const x = e as Record<string, unknown>
  return (
    typeof x.id === 'string' &&
    Number.isInteger(x.amount) &&
    (x.amount as number) > 0 &&
    isCategoryId(x.category) &&
    (x.method === undefined || isPaymentMethod(x.method)) &&
    typeof x.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date)
  )
}

const normalize = (e: Expense): Expense => ({
  id: e.id,
  amount: e.amount,
  category: e.category,
  ...(isPaymentMethod(e.method) ? { method: e.method } : {}),
  note: typeof e.note === 'string' ? e.note.slice(0, 200) : '',
  date: e.date,
  createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
})

function isCategory(c: unknown): c is Category {
  if (!c || typeof c !== 'object') return false
  const x = c as Record<string, unknown>
  return (
    isCategoryId(x.id) &&
    typeof x.label === 'string' &&
    x.label.trim().length > 0 &&
    x.label.length <= 20 &&
    typeof x.emoji === 'string' &&
    x.emoji.length > 0 &&
    x.emoji.length <= 16
  )
}

/** Validates and normalises settings from storage, a backup or the server. */
export function sanitizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>
  return {
    budget: typeof s.budget === 'number' && s.budget > 0 ? Math.round(s.budget) : null,
    categories: Array.isArray(s.categories)
      ? s.categories.filter(isCategory).map((c) => ({ id: c.id, label: c.label.trim(), emoji: c.emoji }))
      : [],
    hidden: Array.isArray(s.hidden) ? s.hidden.filter(isCategoryId) : [],
  }
}

/** Validates and normalises data from storage or an imported backup. */
export function sanitize(raw: unknown): Data | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.expenses)) return null

  const sync = r.sync as Partial<SyncState> | null | undefined
  const outbox: Data['outbox'] = {}
  if (r.outbox && typeof r.outbox === 'object') {
    for (const e of Object.values(r.outbox as Record<string, unknown>)) {
      if (isExpense(e)) outbox[e.id] = { ...normalize(e), ...((e as OutboxEntry).deleted ? { deleted: true } : {}) }
    }
  }

  return {
    expenses: r.expenses.filter(isExpense).map(normalize).sort(byNewest),
    settings: sanitizeSettings(r.settings),
    sync:
      sync && typeof sync.userId === 'string'
        ? { userId: sync.userId, cursor: typeof sync.cursor === 'string' ? sync.cursor : null }
        : null,
    outbox,
    settingsDirty: r.settingsDirty === true,
  }
}
