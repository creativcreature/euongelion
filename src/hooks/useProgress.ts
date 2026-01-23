'use client';

import { useEffect, useState } from 'react';
import {
  getProgress,
  isDevotionalRead,
  markDevotionalComplete,
  getSeriesProgress,
  getOverallProgress,
  canReadDevotional,
  type DevotionalProgress,
} from '@/lib/progress';

export function useProgress() {
  const [progress, setProgress] = useState<DevotionalProgress[]>([]);

  useEffect(() => {
    // Initial load
    setProgress(getProgress());

    // Listen for progress updates
    const handleUpdate = () => {
      setProgress(getProgress());
    };

    window.addEventListener('progressUpdated', handleUpdate);

    return () => {
      window.removeEventListener('progressUpdated', handleUpdate);
    };
  }, []);

  return {
    progress,
    isRead: isDevotionalRead,
    markComplete: markDevotionalComplete,
    getSeriesProgress,
    getOverallProgress,
    canRead: canReadDevotional,
  };
}

/**
 * Hook to track time spent on current page
 */
export function useReadingTime() {
  const [startTime] = useState(() => Date.now());
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return timeSpent;
}
