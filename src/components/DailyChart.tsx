import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatMoney, formatMoneyCompact, shortDate } from '../format'

interface Props {
  /** Spend per day of the month, in cents; index 0 is the 1st. */
  values: number[]
  month: string
}

const HEIGHT = 168
const PAD_TOP = 10
const PAD_BOTTOM = 24
const AXIS_W = 44

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(326)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Rounds up to a clean axis maximum that splits into two even steps. */
function niceMax(max: number) {
  if (max <= 0) return 100
  const rough = max / 2
  const mag = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough)!
  return step * 2
}

/** Column with a 4px rounded data-end and a square base. */
function columnPath(x: number, y: number, w: number, base: number) {
  const r = Math.min(4, w / 2, base - y)
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`
}

export function DailyChart({ values, month }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const n = values.length
  const max = niceMax(Math.max(...values))
  const plotW = Math.max(0, width - AXIS_W)
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const base = PAD_TOP + plotH
  const slot = plotW / n
  const barW = Math.min(24, Math.max(2, slot - 3))
  const yOf = (v: number) => base - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const labelDays = [1, 8, 15, 22, 29].filter((d) => d <= n)

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left) / slot)
    setActive(i >= 0 && i < n ? i : null)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.key === 'ArrowLeft' ? -1 : 1
    setActive((a) => Math.min(n - 1, Math.max(0, (a ?? (step > 0 ? -1 : n)) + step)))
  }

  const total = values.reduce((a, b) => a + b, 0)
  const activeISO = active !== null ? `${month}-${String(active + 1).padStart(2, '0')}` : null
  const tipX = active !== null ? Math.min(Math.max(active * slot + slot / 2, 60), plotW - 60) : 0

  return (
    <div className="daily-chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Daily spending, ${formatMoney(total)} total. Use arrow keys to inspect days.`}
        tabIndex={0}
        onPointerDown={(e) => {
          // Taps shouldn't focus the chart (and draw a focus ring); keyboard focus still works.
          e.preventDefault()
          pick(e)
        }}
        onPointerMove={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={0} x2={plotW} y1={yOf(t)} y2={yOf(t)} />
            <text className="chart-tick" x={width} y={yOf(t)} dy="0.32em" textAnchor="end">
              {formatMoneyCompact(t)}
            </text>
          </g>
        ))}
        <line className="chart-baseline" x1={0} x2={plotW} y1={base} y2={base} />
        {values.map((v, i) =>
          v > 0 ? (
            <path
              key={i}
              className="chart-bar"
              data-dim={active !== null && active !== i ? '' : undefined}
              d={columnPath(i * slot + (slot - barW) / 2, yOf(v), barW, base)}
            />
          ) : null,
        )}
        {labelDays.map((d) => (
          <text key={d} className="chart-tick" x={(d - 1) * slot + slot / 2} y={HEIGHT - 6} textAnchor="middle">
            {d}
          </text>
        ))}
      </svg>
      {active !== null && activeISO && (
        <div className="chart-tooltip" style={{ left: tipX }}>
          <span className="chart-tooltip__label">{shortDate(activeISO)}</span>
          <strong>{formatMoney(values[active])}</strong>
        </div>
      )}
    </div>
  )
}
