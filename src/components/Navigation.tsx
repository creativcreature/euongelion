'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const pathname = usePathname();
  
  // Determine if we're in the Zine section
  const isZine = pathname?.startsWith('/zine') || pathname?.startsWith('/series') || pathname?.startsWith('/devotional');

  useEffect(() => {
    // Initialize theme
    const stored = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = stored === 'dark' || stored === 'light' ? stored : (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
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

      {/* Top Nav Bar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
        {/* Hamburger Menu */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-all duration-300"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <svg
            className="w-6 h-6 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Center Logo */}
        <Link href="/" className="text-sm tracking-widest text-gray-400 hover:text-[#c19a6b] transition">
          EUONGELION
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-all duration-300"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </nav>

      {/* Slide-out Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-full md:w-[420px] bg-[#0a0a0a] shadow-2xl z-50 p-8 md:p-12 transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition hover:rotate-90"
              aria-label="Close navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Menu Content */}
            <nav className="mt-16 space-y-10 max-h-[80vh] overflow-y-auto">
              {/* Platform Section */}
              <div>
                <p className="text-xs text-[#c19a6b] uppercase tracking-widest mb-4">Platform</p>
                <div className="space-y-4">
                  <MenuItem label="Home" href="/" onClick={() => setIsOpen(false)} />
                  <MenuItem label="Soul Audit" href="/soul-audit" onClick={() => setIsOpen(false)} />
                  <MenuItem label="Daily Bread" href="/daily-bread" onClick={() => setIsOpen(false)} />
                </div>
              </div>

              {/* Wake Up Zine Section */}
              <div>
                <p className="text-xs text-[#c19a6b] uppercase tracking-widest mb-4">Wake Up Zine</p>
                <div className="space-y-4">
                  <MenuItem label="All 7 Questions" href="/zine" onClick={() => setIsOpen(false)} featured />
                  <div className="pl-4 space-y-3 border-l border-gray-800">
                    <MenuItem label="01 · Identity" href="/series/identity" onClick={() => setIsOpen(false)} small />
                    <MenuItem label="02 · Peace" href="/series/peace" onClick={() => setIsOpen(false)} small />
                    <MenuItem label="03 · Community" href="/series/community" onClick={() => setIsOpen(false)} small />
                    <MenuItem label="04 · Kingdom" href="/series/kingdom" onClick={() => setIsOpen(false)} small isGold />
                    <MenuItem label="05 · Provision" href="/series/provision" onClick={() => setIsOpen(false)} small />
                    <MenuItem label="06 · Truth" href="/series/truth" onClick={() => setIsOpen(false)} small />
                    <MenuItem label="07 · Hope" href="/series/hope" onClick={() => setIsOpen(false)} small />
                  </div>
                </div>
              </div>

              {/* Explore Section */}
              <div>
                <p className="text-xs text-[#c19a6b] uppercase tracking-widest mb-4">Explore</p>
                <div className="space-y-4">
                  <MenuItem label="All Devotionals" href="/all-devotionals" onClick={() => setIsOpen(false)} />
                  <MenuItem label="About" href="/about" onClick={() => setIsOpen(false)} />
                  <MenuItem label="Coming Soon" href="/coming-soon" onClick={() => setIsOpen(false)} />
                </div>
              </div>
            </nav>

            {/* Footer Mantra */}
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-xs text-gray-600 leading-relaxed">
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
  label,
  href,
  onClick,
  featured = false,
  small = false,
  isGold = false,
}: {
  label: string;
  href: string;
  onClick?: () => void;
  featured?: boolean;
  small?: boolean;
  isGold?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block transition ${
        featured
          ? 'text-[#c19a6b] hover:text-[#d4ad7e] font-medium'
          : isGold
          ? 'text-[#c19a6b] hover:text-[#d4ad7e]'
          : small
          ? 'text-gray-400 hover:text-white text-sm'
          : 'text-gray-300 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}
