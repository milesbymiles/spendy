import { formatMoney } from '../format'

export interface BreakdownRow {
  id: string
  emoji: string
  label: string
  amount: number
}

/** Ranked rows with a thin single-hue bar each, sized against the largest row. */
export function Breakdown({ rows }: { rows: BreakdownRow[] }) {
  const sum = rows.reduce((a, r) => a + r.amount, 0)
  const max = rows[0]?.amount || 1

  return (
    <ul className="breakdown">
      {rows.map((r) => (
        <li key={r.id} className="breakdown__row">
          <span className="emoji-badge" aria-hidden="true">
            {r.emoji}
          </span>
          <div className="breakdown__body">
            <div className="breakdown__line">
              <span className="breakdown__name">{r.label}</span>
              <span className="breakdown__amount">{formatMoney(r.amount)}</span>
            </div>
            <div className="breakdown__line breakdown__line--sub">
              <div className="breakdown__bar" aria-hidden="true">
                <div style={{ width: `${(r.amount / max) * 100}%` }} />
              </div>
              <span className="breakdown__share">{sum ? Math.round((r.amount / sum) * 100) : 0}%</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
