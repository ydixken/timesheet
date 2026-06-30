import { chart } from '../../lib/chart-theme'

// Custom Recharts tooltip — Recharts injects `active`, `payload`, and `label`.
interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  formatValue?: (value: number, name: string, entry: any) => string
  labelFormatter?: (label: any) => string
}

export function ChartTooltip({ active, payload, label, formatValue, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const heading = labelFormatter ? labelFormatter(label) : label

  return (
    <div className="bg-terminal-elevated border border-terminal-border rounded-md shadow-overlay px-3 py-2 font-mono text-xs">
      {heading != null && heading !== '' && (
        <div className="text-terminal-green mb-1.5">{heading}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.fill || chart.textMuted }}
            />
            <span className="text-terminal-text">{entry.name}</span>
            <span className="ml-auto pl-4 font-data text-terminal-text-bright">
              {formatValue ? formatValue(entry.value, entry.name, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
