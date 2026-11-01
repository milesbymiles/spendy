// Everything that talks to Supabase. Loaded lazily so the app opens instantly without it.
import { createClient, type Session } from '@supabase/supabase-js'
import type { OutboxEntry } from './data'
import { supabaseConfig } from './supabase-config'
import type { CategoryId, Expense, Settings } from './types'

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

export interface Account {
  userId: string
  email: string
}

interface ExpenseRow {
  id: string
  amount: number
  category: CategoryId
  note: string
  date: string
  created_at: number
  deleted: boolean
  updated_at: string
}

const toAccount = (s: Session | null): Account | null =>
  s ? { userId: s.user.id, email: s.user.email ?? '' } : null

/** Calls back with the current account immediately, then on every sign-in / sign-out. */
export function watchAccount(cb: (account: Account | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(toAccount(session)))
  return () => data.subscription.unsubscribe()
}

/** Emails a one-time code (creating the account on first use). */
export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut() {
  // 'local' so signing out works offline too.
  await supabase.auth.signOut({ scope: 'local' })
}

const toRow = (userId: string, e: OutboxEntry) => ({
  user_id: userId,
  id: e.id,
  amount: e.amount,
  category: e.category,
  note: e.deleted ? '' : e.note,
  date: e.date,
  created_at: e.createdAt,
  deleted: e.deleted === true,
})

export const fromRow = (r: ExpenseRow): Expense => ({
  id: r.id,
  amount: Number(r.amount),
  category: r.category,
  note: r.note,
  date: r.date,
  createdAt: Number(r.created_at),
})

export async function pushExpenses(userId: string, entries: OutboxEntry[]) {
  for (let i = 0; i < entries.length; i += 500) {
    const rows = entries.slice(i, i + 500).map((e) => toRow(userId, e))
    const { error } = await supabase.from('expenses').upsert(rows, { onConflict: 'user_id,id' })
    if (error) throw error
  }
}

/** Rows changed since `cursor` (all rows when null), oldest change first. */
export async function pullExpenses(cursor: string | null): Promise<ExpenseRow[]> {
  // Re-read a short overlap so a write that committed just behind the cursor isn't missed.
  const since = cursor ? new Date(Date.parse(cursor.replace(/(\.\d{3})\d+/, '$1')) - 30_000).toISOString() : null
  const rows: ExpenseRow[] = []
  for (;;) {
    let q = supabase
      .from('expenses')
      .select('id,amount,category,note,date,created_at,deleted,updated_at')
      .order('updated_at')
      .order('id')
      .range(rows.length, rows.length + 999)
    if (since) q = q.gt('updated_at', since)
    const { data, error } = await q
    if (error) throw error
    rows.push(...(data as ExpenseRow[]))
    if (data.length < 1000) return rows
  }
}

/** The saved settings row, or null if this account has none yet. */
export async function pullSettings(): Promise<Settings | null> {
  const { data, error } = await supabase.from('settings').select('budget').maybeSingle()
  if (error) throw error
  return data ? { budget: data.budget === null ? null : Number(data.budget) } : null
}

export async function pushSettings(userId: string, settings: Settings) {
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, budget: settings.budget }, { onConflict: 'user_id' })
  if (error) throw error
}
