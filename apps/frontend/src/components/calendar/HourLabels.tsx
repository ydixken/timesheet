interface HourLabelsProps {
  hourHeight: number
}

export function HourLabels({ hourHeight }: HourLabelsProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="relative w-14" style={{ height: `${hourHeight * 24}px` }}>
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute text-[10px] text-terminal-text/40 font-mono text-right pr-2 w-full -translate-y-1/2"
          style={{ top: `${hour * hourHeight}px` }}
        >
          {String(hour).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  )
}
