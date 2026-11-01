import { methodLabel } from '../categories'
import { dayLabel, formatMoney } from '../format'
import { useStore } from '../store'
import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  onSelect: (e: Expense) => void
}

export function ExpenseList({ expenses, onSelect }: Props) {
  const { categoryOf } = useStore()
  const groups: { date: string; items: Expense[]; total: number }[] = []
  for (const e of expenses) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.date) {
      last.items.push(e)
      last.total += e.amount
    } else {
      groups.push({ date: e.date, items: [e], total: e.amount })
    }
  }

  return (
    <div className="day-groups">
      {groups.map((g) => (
        <section key={g.date} className="day-group">
          <header className="day-group__header">
            <h3>{dayLabel(g.date)}</h3>
            <span>{formatMoney(g.total)}</span>
          </header>
          <ul className="card expense-list">
            {g.items.map((e) => {
              const cat = categoryOf(e.category)
              const sub = [e.note && cat.label, e.method && methodLabel(e.method)].filter(Boolean).join(' · ')
              return (
                <li key={e.id}>
                  <button className="expense-row" onClick={() => onSelect(e)}>
                    <span className="emoji-badge" aria-hidden="true">
                      {cat.emoji}
                    </span>
                    <span className="expense-row__text">
                      <span className="expense-row__title">{e.note || cat.label}</span>
                      {sub && <span className="expense-row__sub">{sub}</span>}
                    </span>
                    <span className="expense-row__amount">{formatMoney(e.amount)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
