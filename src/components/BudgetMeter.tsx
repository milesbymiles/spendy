import { formatMoney } from '../format'

interface Props {
  spent: number
  budget: number
}

export function BudgetMeter({ spent, budget }: Props) {
  const ratio = spent / budget
  const level = ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'
  const left = budget - spent

  return (
    <div className={`meter meter--${level}`}>
      <div
        className="meter__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Math.min(spent, budget)}
        aria-label="Budget used"
      >
        <div className="meter__fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="meter__caption">
        {level === 'over' ? (
          <>
            <span className="status-dot" aria-hidden="true" />
            <strong>{formatMoney(-left)} over</strong> your {formatMoney(budget)} budget
          </>
        ) : (
          <>
            {level === 'warn' && <span className="status-dot" aria-hidden="true" />}
            <strong>{formatMoney(left)} left</strong> of {formatMoney(budget)}
          </>
        )}
      </p>
    </div>
  )
}
