import { BudgetMeter } from '../components/BudgetMeter'
import { ExpenseList } from '../components/ExpenseList'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { formatMoney, monthLabel, monthOf, todayISO } from '../format'
import { useStore } from '../store'
import type { Expense } from '../types'

interface Props {
  month: string
  onMonthChange: (m: string) => void
  onSelect: (e: Expense) => void
  onAdd: () => void
  onOpenSettings: () => void
}

export function Home({ month, onMonthChange, onSelect, onAdd, onOpenSettings }: Props) {
  const { expenses, settings } = useStore()
  const items = expenses.filter((e) => monthOf(e.date) === month)
  const total = items.reduce((a, e) => a + e.amount, 0)
  const isCurrent = month === monthOf(todayISO())

  return (
    <main className="screen">
      <header className="screen__header">
        <h1 className="wordmark">spendy</h1>
        <MonthSwitcher month={month} onChange={onMonthChange} />
      </header>

      <section className="card summary">
        <p className="summary__label">{isCurrent ? 'Spent this month' : `Spent in ${monthLabel(month)}`}</p>
        <p className="hero-figure">{formatMoney(total)}</p>
        {settings.budget ? (
          <BudgetMeter spent={total} budget={settings.budget} />
        ) : (
          <button className="link-btn" onClick={onOpenSettings}>
            Set a monthly budget
          </button>
        )}
      </section>

      {items.length > 0 ? (
        <ExpenseList expenses={items} onSelect={onSelect} />
      ) : (
        <div className="empty">
          <p className="empty__emoji" aria-hidden="true">
            🧾
          </p>
          <p className="empty__title">No expenses {isCurrent ? 'yet this month' : `in ${monthLabel(month)}`}</p>
          {isCurrent && (
            <button className="btn btn--primary" onClick={onAdd}>
              Add your first expense
            </button>
          )}
        </div>
      )}
    </main>
  )
}
