import { useState, useEffect } from 'react'

interface CurrentTimeIndicatorProps {
  hourHeight: number
}

export function CurrentTimeIndicator({ hourHeight }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const minutes = now.getHours() * 60 + now.getMinutes()
  const top = (minutes / 60) * hourHeight

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
      <div className="relative">
        <div className="w-2.5 h-2.5 rounded-full bg-terminal-green absolute -left-1 -top-[5px]" />
        <div className="border-t-2 border-terminal-green w-full" />
      </div>
    </div>
  )
}
