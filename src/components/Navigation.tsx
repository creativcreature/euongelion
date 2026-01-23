'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showResetButton, setShowResetButton] = useState(true); // Visible by default during testing

  useEffect(() => {
    // Initialize theme
    const stored = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = stored === 'dark' || stored === 'light' ? stored : (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    // Keyboard shortcut: Cmd/Ctrl + Shift + K to toggle reset button
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setShowResetButton(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleReset = () => {
    if (confirm('Clear all local data (bookmarks, progress, reflections, etc.) and reload?\n\nThis is a testing feature - use with caution!')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  return (
    <>
      {/* Skip to Content Link for Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Debug Reset Button - Toggled with Cmd/Ctrl + Shift + K */}
      {showResetButton && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium rounded shadow-lg transition-all duration-300 flex items-center gap-2"
            aria-label="Reset all local data (testing only)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All Data
          </button>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Press Cmd+Shift+K to hide
          </p>
        </div>
      )}

      {/* Top Nav Bar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-8">
        {/* Hamburger Menu */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8860B]"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <svg
            className="w-6 h-6 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Center Logo */}
        <div className="text-label text-gray-500 vw-small" aria-label="wokeGod">
          W O K E G O D
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
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
      </nav>

      {/* Slide-out Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black z-40 transition-opacity duration-500"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-full md:w-[480px] shadow-2xl z-50 p-12 md:p-16 transform transition-transform duration-500"
            style={{
              backgroundColor: '#FAF9F6',
              transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black transition-all duration-300 hover:rotate-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8860B]"
              aria-label="Close navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Menu Items */}
            <nav className="mt-24 md:mt-32 space-y-8 md:space-y-10 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <p className="text-label vw-small text-gray-400 mb-4">DAILY DEVOTIONALS</p>
                <div className="space-y-6">
                  <MenuItem number="01" label="Identity Crisis" href="/series/identity" onClick={() => setIsOpen(false)} delay={0} />
                  <MenuItem number="02" label="Peace" href="/series/peace" onClick={() => setIsOpen(false)} delay={1} />
                  <MenuItem number="03" label="Community" href="/series/community" onClick={() => setIsOpen(false)} delay={2} />
                  <MenuItem number="04" label="Kingdom" href="/series/kingdom" onClick={() => setIsOpen(false)} delay={3} isGold />
                  <MenuItem number="05" label="Provision" href="/series/provision" onClick={() => setIsOpen(false)} delay={4} />
                  <MenuItem number="06" label="Truth" href="/series/truth" onClick={() => setIsOpen(false)} delay={5} />
                  <MenuItem number="07" label="Hope" href="/series/hope" onClick={() => setIsOpen(false)} delay={6} />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <p className="text-label vw-small text-gray-400 mb-4">EXPLORE</p>
                <div className="space-y-6">
                  <MenuItem number="—" label="All Devotionals" href="/all-devotionals" onClick={() => setIsOpen(false)} delay={7} />
                  <MenuItem number="—" label="About Wake Up" href="/about" onClick={() => setIsOpen(false)} delay={8} />
                  <MenuItem number="—" label="Coming Soon" href="/coming-soon" onClick={() => setIsOpen(false)} delay={9} />
                </div>
              </div>
            </nav>

            {/* Footer Mantra */}
            <div className="absolute bottom-12 md:bottom-16 left-12 md:left-16 right-12 md:right-16">
              <p className="text-label text-gray-400 vw-small leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                VENERATE THE MIRACLE.<br />
                DISMANTLE THE HAVEL.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({
  number,
  label,
  href,
  disabled = false,
  onClick,
  delay = 0,
  isGold = false,
}: {
  number: string;
  label: string;
  href: string;
  disabled?: boolean;
  onClick?: () => void;
  delay?: number;
  isGold?: boolean;
}) {
  const delayStyles = {
    animationDelay: `${0.1 + delay * 0.05}s`,
    animationFillMode: 'forwards' as const,
    opacity: 0
  };

  const content = (
    <div
      className="flex items-start gap-6 md:gap-8 fade-in group"
      style={delayStyles}
    >
      <span className={`vw-small font-sans mt-1 ${disabled ? 'text-gray-300' : isGold ? 'text-[#B8860B]' : 'text-gray-400'}`}>
        {number}
      </span>
      <span
        className={`text-nav vw-body-lg ${disabled ? 'text-gray-300' : 'text-black'} transition-all duration-300`}
        style={{
          transitionProperty: 'color, transform'
        }}
      >
        <span className={!disabled ? 'group-hover:text-[#B8860B] inline-block group-hover:translate-x-2 transition-all duration-300' : ''}>
          {label}
        </span>
      </span>
    </div>
  );

  if (disabled) {
    return <div className="opacity-40 cursor-not-allowed">{content}</div>;
  }

  return (
    <Link href={href} onClick={onClick}>
      {content}
    </Link>
  );
}
