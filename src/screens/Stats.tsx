import { Breakdown, type BreakdownRow } from '../components/Breakdown'
import { DailyChart } from '../components/DailyChart'
import { Icon } from '../components/Icon'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { daysInMonth, formatMoney, monthLabel, monthOf, shiftMonth, todayISO } from '../format'
import { PAYMENT_METHODS } from '../categories'
import { useStore } from '../store'

interface Props {
  month: string
  onMonthChange: (m: string) => void
}

export function Stats({ month, onMonthChange }: Props) {
  const { expenses, categoryOf } = useStore()
  const prevMonth = shiftMonth(month, -1)

  const items = expenses.filter((e) => monthOf(e.date) === month)
  const total = items.reduce((a, e) => a + e.amount, 0)
  const prevTotal = expenses.filter((e) => monthOf(e.date) === prevMonth).reduce((a, e) => a + e.amount, 0)

  const days = daysInMonth(month)
  const today = todayISO()
  const elapsed = month === monthOf(today) ? Number(today.slice(8)) : days
  const daily = Array.from({ length: days }, () => 0)
  const byCat = new Map<string, BreakdownRow>()
  const byMethod = new Map<string, BreakdownRow>()
  const add = (map: Map<string, BreakdownRow>, row: Omit<BreakdownRow, 'amount'>, amount: number) => {
    const r = map.get(row.id) ?? { ...row, amount: 0 }
    r.amount += amount
    map.set(row.id, r)
  }
  for (const e of items) {
    daily[Number(e.date.slice(8)) - 1] += e.amount
    add(byCat, categoryOf(e.category), e.amount)
    const m = PAYMENT_METHODS.find((p) => p.id === e.method)
    add(byMethod, m ?? { id: 'unknown', label: 'Not recorded', emoji: '❔' }, e.amount)
  }
  const ranked = (map: Map<string, BreakdownRow>) => [...map.values()].sort((a, b) => b.amount - a.amount)
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null

  return (
    <main className="screen">
      <header className="screen__header">
        <h1 className="screen__title">Stats</h1>
        <MonthSwitcher month={month} onChange={onMonthChange} />
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p className="empty__emoji" aria-hidden="true">
            📊
          </p>
          <p className="empty__title">Nothing to chart for {monthLabel(month)}</p>
          <p className="empty__sub">Add a few expenses and your trends show up here.</p>
        </div>
      ) : (
        <>
          <section className="card summary">
            <p className="summary__label">Total spent</p>
            <p className="hero-figure">{formatMoney(total)}</p>
            {delta !== null && (
              <p className={`delta ${delta > 0 ? 'delta--up' : 'delta--down'}`}>
                <Icon name={delta > 0 ? 'up' : 'down'} size={16} />
                <span>
                  {Math.abs(Math.round(delta * 100))}% {delta > 0 ? 'more' : 'less'} than {monthLabel(prevMonth, false)}
                </span>
              </p>
            )}
            <div className="tiles">
              <div className="tile">
                <span className="tile__label">Daily average</span>
                <span className="tile__value">{formatMoney(Math.round(total / elapsed))}</span>
              </div>
              <div className="tile">
                <span className="tile__label">Expenses</span>
                <span className="tile__value">{items.length}</span>
              </div>
            </div>
          </section>

          <section className="card chart-card">
            <h2 className="card__title">Daily spending</h2>
            <DailyChart values={daily} month={month} />
          </section>

          <section className="card chart-card">
            <h2 className="card__title">By category</h2>
            <Breakdown rows={ranked(byCat)} />
          </section>

          <section className="card chart-card">
            <h2 className="card__title">Paid with</h2>
            <Breakdown rows={ranked(byMethod)} />
          </section>
        </>
      )}
    </main>
  )
}
