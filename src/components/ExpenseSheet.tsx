import { useEffect, useRef, useState } from 'react'
import { PAYMENT_METHODS } from '../categories'
import { CURRENCY_SYMBOL, centsToInput, parseAmount, todayISO } from '../format'
import { getPrefs } from '../prefs'
import { useStore } from '../store'
import type { CategoryId, Expense, ExpenseDraft, PaymentMethod } from '../types'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000]

interface Props {
  expense?: Expense
  /** Starting values for a new expense (e.g. from a deep link). */
  prefill?: Partial<ExpenseDraft>
  onSave: (draft: ExpenseDraft) => void
  /** Edit mode only: records a copy of the expense dated today. */
  onRepeat?: (draft: ExpenseDraft) => void
  onDelete?: () => void
  onClose: () => void
}

export function ExpenseSheet({ expense, prefill, onSave, onRepeat, onDelete, onClose }: Props) {
  const { categories, settings } = useStore()
  const start = expense ?? prefill
  const prefs = getPrefs()

  const visible = categories.filter((c) => !settings.hidden.includes(c.id))
  const fallbackCategory =
    prefs.lastCategory && visible.some((c) => c.id === prefs.lastCategory) ? prefs.lastCategory : visible[0]?.id

  const [amountText, setAmountText] = useState(start?.amount ? centsToInput(start.amount) : '')
  const [category, setCategory] = useState<CategoryId>(start?.category ?? fallbackCategory ?? 'other')
  const [method, setMethod] = useState<PaymentMethod | undefined>(
    expense ? expense.method : (prefill?.method ?? prefs.lastMethod ?? 'upi'),
  )
  const [note, setNote] = useState(start?.note ?? '')
  const [date, setDate] = useState(start?.date ?? todayISO())
  const amountRef = useRef<HTMLInputElement>(null)

  const amount = parseAmount(amountText)
  // Keep an expense's current category selectable even if it has since been hidden.
  const choices = visible.some((c) => c.id === category)
    ? visible
    : [...visible, categories.find((c) => c.id === category) ?? { id: category, label: 'Current', emoji: '❔' }]

  useEffect(() => {
    if (!expense) amountRef.current?.focus()
  }, [expense])

  const draft = (): ExpenseDraft | null =>
    amount === null ? null : { amount, category, method, note: note.trim(), date: date || todayISO() }

  return (
    <Sheet
      title={expense ? 'Edit expense' : 'New expense'}
      onClose={onClose}
      onSubmit={() => {
        const d = draft()
        if (d) onSave(d)
      }}
      action={
        onDelete && (
          <button type="button" className="icon-btn icon-btn--danger" onClick={onDelete} aria-label="Delete expense">
            <Icon name="trash" size={22} />
          </button>
        )
      }
    >
      <label className="amount-field">
        <span className="amount-field__symbol">{CURRENCY_SYMBOL}</span>
        <input
          ref={amountRef}
          className="amount-field__input"
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="0"
          autoComplete="off"
          value={amountText}
          // Size to the typed digits so the ₹ hugs the number.
          style={{ width: `${Math.max(amountText.length, 1) + 0.25}ch` }}
          onChange={(e) => setAmountText(e.target.value)}
          aria-label="Amount"
        />
      </label>

      <div className="quick-amounts" role="group" aria-label="Quick amounts">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            className="pill"
            aria-pressed={amount === n * 100}
            onClick={() => setAmountText(String(n))}
          >
            {CURRENCY_SYMBOL}
            {n.toLocaleString('en-IN')}
          </button>
        ))}
      </div>

      <fieldset className="category-grid">
        <legend className="visually-hidden">Category</legend>
        {choices.map((c) => (
          <label key={c.id} className="category-chip">
            <input
              type="radio"
              name="category"
              value={c.id}
              checked={category === c.id}
              onChange={() => setCategory(c.id)}
            />
            <span className="category-chip__emoji" aria-hidden="true">
              {c.emoji}
            </span>
            <span className="category-chip__label">{c.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="segmented">
        <legend className="visually-hidden">Paid with</legend>
        {PAYMENT_METHODS.map((m) => (
          <label key={m.id} className="segmented__option">
            <input
              type="radio"
              name="method"
              value={m.id}
              checked={method === m.id}
              onChange={() => setMethod(m.id)}
            />
            <span aria-hidden="true">{m.emoji}</span> {m.label}
          </label>
        ))}
      </fieldset>

      <div className="field-row">
        <input
          className="text-input"
          placeholder="Note (optional)"
          value={note}
          maxLength={80}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
        />
        <input
          className="text-input text-input--date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
        />
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={amount === null}>
        {expense ? 'Save changes' : 'Add expense'}
      </button>
      {onRepeat && (
        <button
          type="button"
          className="btn btn--secondary btn--block"
          disabled={amount === null}
          onClick={() => {
            const d = draft()
            if (d) onRepeat({ ...d, date: todayISO() })
          }}
        >
          Add again for today
        </button>
      )}
    </Sheet>
  )
}
