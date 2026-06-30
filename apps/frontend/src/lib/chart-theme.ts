// Chart color + styling tokens — these mirror the --color-terminal-* @theme tokens in styles/globals.css and MUST be kept in sync with that file.

export const chart = {
  text: '#b3b1ad',
  textBright: '#e6e1dc',
  textMuted: '#8a897f',
  grid: '#2a2a3e',
  surface: '#151b24',
  elevated: '#1a2130',
  green: '#39ff14',
  blue: '#00d9ff',
  purple: '#bd93f9',
  danger: '#ff5555',
  warning: '#f1fa8c',
} as const

// Ordered fallback palette for projects without a color (mirrors Dashboard's
// FALLBACK_COLORS exactly so existing charts keep their colors when adopted).
// All seven values map to --color-terminal-* tokens.
export const CHART_PALETTE: string[] = [
  '#39ff14', // terminal-green
  '#00d9ff', // terminal-blue
  '#bd93f9', // terminal-purple
  '#f1fa8c', // terminal-warning
  '#ff5555', // terminal-danger
  '#2ed573', // terminal-success
  '#50fa7b', // terminal-green-hover
]

// Recharts prop helpers — spread into the matching component props.
export const axisTick = { fill: chart.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 } as const
export const gridProps = { stroke: chart.grid, strokeDasharray: '3 3', vertical: false } as const
export const barCursor = { fill: 'rgba(57,255,20,0.06)' } as const
