import { Link } from 'react-router-dom'
import { useNavDrawer } from '../../store/navDrawer'
import { useCommandPalette } from '../CommandPalette'

/** Mobile-only top chrome: menu trigger, wordmark, quick-add. Hidden at md+. */
export function MobileTopBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-30 h-12 md:hidden bg-terminal-bg-light border-b border-terminal-border flex items-center justify-between px-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => useNavDrawer.getState().openDrawer()}
          className="tap-target flex items-center justify-center font-mono text-terminal-text hover:text-terminal-text-bright transition-colors cursor-pointer"
        >
          [≡]
        </button>
        <Link to="/" className="font-mono text-base font-bold leading-none">
          <span className="text-terminal-green">~/</span>
          <span className="text-terminal-text-bright">timesheet</span>
          <span className="animate-blink text-terminal-green">_</span>
        </Link>
      </div>

      <button
        type="button"
        aria-label="Quick add"
        onClick={() => useCommandPalette.getState().toggle()}
        className="tap-target flex items-center justify-center font-mono text-terminal-green hover:text-terminal-green-hover transition-colors cursor-pointer"
      >
        {'>_'}
      </button>
    </header>
  )
}
