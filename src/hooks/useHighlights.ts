'use client';

import { useEffect, useState } from 'react';
import {
  getHighlights,
  getDevotionalHighlights,
  addHighlight,
  removeHighlight,
  type Highlight,
} from '@/lib/highlights';

export function useHighlights(devotionalSlug?: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    // Initial load
    if (devotionalSlug) {
      setHighlights(getDevotionalHighlights(devotionalSlug));
    } else {
      setHighlights(getHighlights());
    }

    // Listen for updates
    const handleUpdate = () => {
      if (devotionalSlug) {
        setHighlights(getDevotionalHighlights(devotionalSlug));
      } else {
        setHighlights(getHighlights());
      }
    };

    window.addEventListener('highlightsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('highlightsUpdated', handleUpdate);
    };
  }, [devotionalSlug]);

  return {
    highlights,
    addHighlight,
    removeHighlight,
  };
}
