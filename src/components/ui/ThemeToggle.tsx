'use client'

import { useTheme } from '@/lib/use-theme'

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        // Sun icon for dark mode (clicking will switch to light)
        <svg
          className="w-5 h-5 text-gold"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon for light mode (clicking will switch to dark)
        <svg
          className="w-5 h-5 text-gold"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  )
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-1 p-1 bg-[#1a1a1a] rounded-lg">
      {(['light', 'dark', 'system'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
            theme === t
              ? 'bg-[#c19a6b] text-[#0a0a0a]'
              : 'text-gray-400 hover:text-[#f7f3ed]'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
