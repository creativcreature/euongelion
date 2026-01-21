'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  return (
    <>
      {/* Top Nav Bar */}
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-8">
        {/* Hamburger Menu */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all duration-300"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
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
        <div className="text-label text-gray-500 vw-small">
          W O K E G O D
        </div>

        {/* Moon Icon (Theme Toggle Placeholder) */}
        <button
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all duration-300"
          aria-label="Toggle theme"
        >
          <span className="text-2xl">🌙</span>
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
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black transition-all duration-300 hover:rotate-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Menu Items */}
            <nav className="mt-24 md:mt-32 space-y-10 md:space-y-12">
              <MenuItem number="01" label="Daily Bread" href="/" onClick={() => setIsOpen(false)} delay={0} />
              <MenuItem number="02" label="Havel Audit" href="/wake-up" onClick={() => setIsOpen(false)} delay={1} />
              <MenuItem number="03" label="The Gospel" href="/about" disabled delay={2} />
              <MenuItem number="04" label="The Archive" href="/archive" disabled delay={3} />
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
}: {
  number: string;
  label: string;
  href: string;
  disabled?: boolean;
  onClick?: () => void;
  delay?: number;
}) {
  const delayStyles = {
    animationDelay: `${0.1 + delay * 0.1}s`,
    animationFillMode: 'forwards' as const,
    opacity: 0
  };

  const content = (
    <div
      className="flex items-start gap-8 md:gap-10 fade-in group"
      style={delayStyles}
    >
      <span className={`vw-small font-sans mt-2 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
        {number}
      </span>
      <span
        className={`text-nav vw-heading-md ${disabled ? 'text-gray-300' : 'text-black'} transition-all duration-300`}
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
