import { type ReactNode } from 'react'

export type IconName =
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'check'
  | 'cross'
  | 'search'
  | 'external-link'
  | 'download'
  | 'spinner'
  | 'alert'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

// An X — shared by `close` and `cross`.
const xMark = (
  <>
    <path d="M4 4l8 8" />
    <path d="M12 4l-8 8" />
  </>
)

const icons: Record<IconName, ReactNode> = {
  'chevron-down': <path d="M4 6l4 4 4-4" />,
  'chevron-right': <path d="M6 4l4 4-4 4" />,
  close: xMark,
  check: <path d="M3 8l3 3 7-7" />,
  cross: xMark,
  search: (
    <>
      <circle cx="6" cy="6" r="4" />
      <path d="M11 11l3 3" />
    </>
  ),
  'external-link': (
    <>
      <path d="M9 3h4v4" />
      <path d="M13 3l-6 6" />
      <path d="M11 9v4H3V5h4" />
    </>
  ),
  download: (
    <>
      <path d="M8 3v7" />
      <path d="M5 8l3 3 3-3" />
      <path d="M3 13h10" />
    </>
  ),
  alert: (
    <>
      <path d="M8 2l6 11H2z" />
      <path d="M8 7v3" />
      <path d="M8 12h.01" />
    </>
  ),
  spinner: <path d="M14 8a6 6 0 1 1-3-5.2" />,
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const svgClassName = name === 'spinner' ? `${className} animate-spin`.trim() : className
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={svgClassName}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}
