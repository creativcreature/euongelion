'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initialize theme from localStorage or system preference
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
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Skip to Content Link */}
      <a 
        href="#main-content" 
        className="absolute left-[-9999px] z-[999] p-4 bg-gold text-white font-bold no-underline focus:left-1/2 focus:top-4 focus:-translate-x-1/2"
      >
        Skip to main content
      </a>

      {/* Top Nav Bar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-8">
        {/* Hamburger Menu */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
        >
          <svg
            className="w-6 h-6 text-gray-900 dark:text-gray-100 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Center Logo */}
        <Link href="/" className="text-sm tracking-[0.25em] text-gray-500 dark:text-gray-400 hover:text-gold transition-colors">
          W O K E G O D
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </nav>

      {/* Slide-out Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-500 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-full md:w-[480px] shadow-2xl z-50 p-12 md:p-16 transform transition-transform duration-500 bg-cream dark:bg-[#1a1a1a]"
            style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-300 hover:rotate-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              aria-label="Close navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Menu Items */}
            <nav className="mt-24 md:mt-32 space-y-8 md:space-y-10 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-4">DAILY DEVOTIONALS</p>
                <div className="space-y-6">
                  <MenuItem number="01" label="Identity Crisis" href="/series/identity" onClick={() => setIsOpen(false)} />
                  <MenuItem number="02" label="Peace" href="/series/peace" onClick={() => setIsOpen(false)} />
                  <MenuItem number="03" label="Community" href="/series/community" onClick={() => setIsOpen(false)} />
                  <MenuItem number="04" label="Kingdom" href="/series/kingdom" onClick={() => setIsOpen(false)} isGold />
                  <MenuItem number="05" label="Provision" href="/series/provision" onClick={() => setIsOpen(false)} />
                  <MenuItem number="06" label="Truth" href="/series/truth" onClick={() => setIsOpen(false)} />
                  <MenuItem number="07" label="Hope" href="/series/hope" onClick={() => setIsOpen(false)} />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-4">YOUR JOURNEY</p>
                <div className="space-y-6">
                  <MenuItem number="✦" label="Soul Audit" href="/soul-audit" onClick={() => setIsOpen(false)} isGold />
                  <MenuItem number="✦" label="Daily Bread" href="/daily-bread" onClick={() => setIsOpen(false)} />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-4">EXPLORE</p>
                <div className="space-y-6">
                  <MenuItem number="—" label="All Devotionals" href="/all-devotionals" onClick={() => setIsOpen(false)} />
                  <MenuItem number="—" label="About Wake Up" href="/about" onClick={() => setIsOpen(false)} />
                  <MenuItem number="—" label="Coming Soon" href="/coming-soon" onClick={() => setIsOpen(false)} />
                </div>
              </div>
            </nav>

            {/* Footer Mantra */}
            <div className="absolute bottom-12 md:bottom-16 left-12 md:left-16 right-12 md:right-16">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-gray-600 leading-relaxed">
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

interface MenuItemProps {
  number: string;
  label: string;
  href: string;
  onClick?: () => void;
  isGold?: boolean;
}

function MenuItem({ number, label, href, onClick, isGold = false }: MenuItemProps) {
  return (
    <Link href={href} onClick={onClick} className="flex items-start gap-6 md:gap-8 group">
      <span className={`text-sm mt-1 ${isGold ? 'text-gold' : 'text-gray-400 dark:text-gray-500'}`}>
        {number}
      </span>
      <span className="text-xl font-serif italic text-gray-900 dark:text-gray-100 group-hover:text-gold group-hover:translate-x-2 transition-all duration-300">
        {label}
      </span>
    </Link>
  );
}
