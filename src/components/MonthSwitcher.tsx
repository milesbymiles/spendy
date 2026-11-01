import { monthLabel, monthOf, shiftMonth, todayISO } from '../format'
import { Icon } from './Icon'

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month >= monthOf(todayISO())
  return (
    <div className="month-switcher">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <Icon name="left" size={20} />
      </button>
      <span className="month-switcher__label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        className="icon-btn"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label="Next month"
      >
        <Icon name="right" size={20} />
      </button>
    </div>
  )
}
