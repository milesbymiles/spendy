import { CATEGORY } from '../categories'
import { formatMoney } from '../format'
import type { CategoryId } from '../types'

interface Props {
  totals: { id: CategoryId; amount: number; count: number }[]
}

export function CategoryBreakdown({ totals }: Props) {
  const sum = totals.reduce((a, t) => a + t.amount, 0)
  const max = totals[0]?.amount ?? 1

  return (
    <ul className="breakdown">
      {totals.map((t) => {
        const cat = CATEGORY[t.id]
        const share = sum ? t.amount / sum : 0
        return (
          <li key={t.id} className="breakdown__row">
            <span className="emoji-badge" aria-hidden="true">
              {cat.emoji}
            </span>
            <div className="breakdown__body">
              <div className="breakdown__line">
                <span className="breakdown__name">{cat.label}</span>
                <span className="breakdown__amount">{formatMoney(t.amount)}</span>
              </div>
              <div className="breakdown__line breakdown__line--sub">
                <div className="breakdown__bar" aria-hidden="true">
                  <div style={{ width: `${(t.amount / max) * 100}%` }} />
                </div>
                <span className="breakdown__share">{Math.round(share * 100)}%</span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
