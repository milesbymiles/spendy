import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../categories'
import { CURRENCY_SYMBOL, centsToInput, parseAmount, todayISO } from '../format'
import type { CategoryId, Expense, ExpenseDraft } from '../types'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface Props {
  expense?: Expense
  onSave: (draft: ExpenseDraft) => void
  onDelete?: () => void
  onClose: () => void
}

export function ExpenseSheet({ expense, onSave, onDelete, onClose }: Props) {
  const [amountText, setAmountText] = useState(expense ? centsToInput(expense.amount) : '')
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? 'food')
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(expense?.date ?? todayISO())
  const amountRef = useRef<HTMLInputElement>(null)

  const amount = parseAmount(amountText)

  useEffect(() => {
    if (!expense) amountRef.current?.focus()
  }, [expense])

  const submit = () => {
    if (amount === null) return
    onSave({ amount, category, note: note.trim(), date: date || todayISO() })
  }

  return (
    <Sheet
      title={expense ? 'Edit expense' : 'New expense'}
      onClose={onClose}
      onSubmit={submit}
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

        <fieldset className="category-grid">
          <legend className="visually-hidden">Category</legend>
          {CATEGORIES.map((c) => (
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
    </Sheet>
  )
}
