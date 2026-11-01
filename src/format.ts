// spendy is rupee-only, with Indian digit grouping (₹1,23,456.00).
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const moneyCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const CURRENCY_SYMBOL = '₹'

/** Formats paise as rupees. */
export const formatMoney = (paise: number) => money.format(paise / 100)

export const formatMoneyCompact = (paise: number) => moneyCompact.format(paise / 100)

/** Parses user input like "12.50" or "12,5" into paise. Returns null if invalid. */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/\s/g, '')
  if (!t) return null
  // Treat a lone comma as a decimal separator; otherwise commas are grouping.
  t = t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.')
  if (!/^\d*\.?\d*$/.test(t)) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export const centsToInput = (cents: number) =>
  (cents / 100).toFixed(2).replace(/\.00$/, '')

// ---- dates (all local time, as YYYY-MM-DD / YYYY-MM strings) ----

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => toISODate(new Date())

export const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const monthOf = (iso: string) => iso.slice(0, 7)

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthLabel(month: string, withYear = true) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const sameYear = y === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    month: 'long',
    ...(withYear && !sameYear ? { year: 'numeric' } : {}),
  })
}

export function dayLabel(iso: string) {
  const today = todayISO()
  if (iso === today) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (iso === toISODate(y)) return 'Yesterday'
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export const shortDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
