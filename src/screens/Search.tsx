import { useEffect, useRef, useState } from 'react'
import { ExpenseList } from '../components/ExpenseList'
import { Icon } from '../components/Icon'
import { PAYMENT_METHODS } from '../categories'
import { formatMoney, monthOf, shiftMonth, todayISO } from '../format'
import { useStore } from '../store'
import type { Expense, PaymentMethod } from '../types'

type Range = 'all' | 'month' | '3m' | 'year'

const RANGES: { id: Range; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: '3m', label: '3 months' },
  { id: 'year', label: 'This year' },
]

const MAX_RESULTS = 300

/** First date (YYYY-MM-DD) included in a range, or '' for no lower bound. */
function rangeStart(range: Range) {
  const month = monthOf(todayISO())
  if (range === 'month') return `${month}-01`
  if (range === '3m') return `${shiftMonth(month, -2)}-01`
  if (range === 'year') return `${month.slice(0, 4)}-01-01`
  return ''
}

interface Props {
  onClose: () => void
  onSelect: (e: Expense) => void
}

export function Search({ onClose, onSelect }: Props) {
  const { expenses, categories, categoryOf } = useStore()
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<Range>('all')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [category, setCategory] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const from = rangeStart(range)
  const terms = query.trim().toLowerCase()
  const digits = terms.replace(/[₹,\s]/g, '')
  const isAmount = /^\d+(\.\d+)?$/.test(digits)

  const matches = (e: Expense) => {
    if (!terms) return true
    if (e.note.toLowerCase().includes(terms)) return true
    if (categoryOf(e.category).label.toLowerCase().includes(terms)) return true
    return isAmount && String(e.amount / 100).includes(digits)
  }

  const results = expenses.filter(
    (e) =>
      (!from || e.date >= from) &&
      (!method || e.method === method) &&
      (!category || e.category === category) &&
      matches(e),
  )
  const total = results.reduce((a, e) => a + e.amount, 0)
  const filtered = terms || range !== 'all' || method || category

  return (
    <main className="screen">
      <header className="search-bar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Search notes or amounts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search expenses"
          />
        </label>
        <button className="link-btn" onClick={onClose}>
          Cancel
        </button>
      </header>

      <div className="filter-row" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r.id} className="pill" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="filter-row" role="group" aria-label="Payment method and category">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            className="pill"
            aria-pressed={method === m.id}
            onClick={() => setMethod(method === m.id ? null : m.id)}
          >
            {m.label}
          </button>
        ))}
        <select
          className="pill pill--select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      {filtered && (
        <p className="results-summary">
          {results.length} expense{results.length === 1 ? '' : 's'} · <strong>{formatMoney(total)}</strong>
        </p>
      )}

      {results.length > 0 ? (
        <>
          <ExpenseList expenses={results.slice(0, MAX_RESULTS)} onSelect={onSelect} />
          {results.length > MAX_RESULTS && (
            <p className="footnote">Showing the latest {MAX_RESULTS}. Narrow the filters to see the rest.</p>
          )}
        </>
      ) : (
        <div className="empty">
          <p className="empty__emoji" aria-hidden="true">
            🔍
          </p>
          <p className="empty__title">No matching expenses</p>
          <p className="empty__sub">Try a different word or loosen the filters.</p>
        </div>
      )}
    </main>
  )
}
