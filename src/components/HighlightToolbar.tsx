'use client';

import { useState, useEffect } from 'react';

interface HighlightToolbarProps {
  devotionalSlug: string;
  onHighlight: (text: string, color: string) => void;
}

export default function HighlightToolbar({ devotionalSlug, onHighlight }: HighlightToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setPosition(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3) {
        // Don't show toolbar for very short selections
        setPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position toolbar above the selection
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setSelectedText(text);
    };

    // Listen for text selection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  const handleHighlightClick = (color: string) => {
    if (selectedText) {
      onHighlight(selectedText, color);
      setPosition(null);
      setSelectedText('');

      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!position) return null;

  return (
    <div
      className="fixed z-50 animate-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-black shadow-2xl rounded-lg p-2 flex items-center gap-2">
        {/* Yellow Highlight */}
        <button
          onClick={() => handleHighlightClick('yellow')}
          className="w-8 h-8 rounded flex items-center justify-center hover:scale-110 transition-transform"
          style={{ backgroundColor: '#FEF3C7' }}
          title="Highlight in yellow"
        >
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {/* Green Highlight */}
        <button
          onClick={() => handleHighlightClick('green')}
          className="w-8 h-8 rounded flex items-center justify-center hover:scale-110 transition-transform"
          style={{ backgroundColor: '#D1FAE5' }}
          title="Highlight in green"
        >
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {/* Gold Highlight */}
        <button
          onClick={() => handleHighlightClick('gold')}
          className="w-8 h-8 rounded flex items-center justify-center hover:scale-110 transition-transform"
          style={{ backgroundColor: '#FDE68A' }}
          title="Highlight in gold"
        >
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={() => {
            setPosition(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-800 transition-colors ml-1"
          style={{ color: '#FAF9F6' }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
