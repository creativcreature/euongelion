'use client';

import { useEffect, useRef, useState } from 'react';

interface ReflectionPromptProps {
  question: string;
  index: number;
  devotionalSlug: string;
}

interface SavedReflection {
  text: string;
  savedAt: string;
}

export default function ReflectionPrompt({ question, index, devotionalSlug }: ReflectionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [response, setResponse] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved response if exists
    const savedData = localStorage.getItem(`reflection_${devotionalSlug}_${index}`);
    if (savedData) {
      try {
        // Try to parse as new format (with timestamp)
        const parsed: SavedReflection = JSON.parse(savedData);
        setResponse(parsed.text);
        setLastSavedAt(parsed.savedAt);
      } catch {
        // Fallback for old format (just text string)
        setResponse(savedData);
        setLastSavedAt(new Date().toISOString());
      }
    }

    // Intersection observer for fade-in animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (promptRef.current) {
      observer.observe(promptRef.current);
    }

    return () => observer.disconnect();
  }, [devotionalSlug, index]);

  const handleSave = () => {
    if (response.trim()) {
      const now = new Date().toISOString();
      const dataToSave: SavedReflection = {
        text: response,
        savedAt: now,
      };
      localStorage.setItem(`reflection_${devotionalSlug}_${index}`, JSON.stringify(dataToSave));
      setLastSavedAt(now);
      setShowSavedConfirmation(true);
      setTimeout(() => setShowSavedConfirmation(false), 3000);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';

    const savedDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - savedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return savedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      ref={promptRef}
      className={`my-16 md:my-24 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="border-l-4 pl-8 md:pl-12" style={{ borderColor: '#B8860B' }}>
        <div className="flex items-start gap-3 mb-4">
          <svg className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#B8860B' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-label vw-small mb-2" style={{ color: '#B8860B' }}>
              REFLECTION PROMPT
            </p>
            <p className="text-serif-italic vw-body-lg mb-6" style={{ color: '#1a1a1a' }}>
              {question}
            </p>

            <div className="space-y-3">
              <textarea
                value={response}
                onChange={(e) => {
                  setResponse(e.target.value);
                  setShowSavedConfirmation(false);
                }}
                placeholder="Write your thoughts here..."
                className="w-full p-4 border-2 border-gray-200 focus:border-[#B8860B] outline-none resize-none vw-body font-serif transition-colors"
                style={{ backgroundColor: '#FAF9F6', minHeight: '120px' }}
                aria-label="Reflection response"
              />

              {/* Save Confirmation Banner */}
              {showSavedConfirmation && (
                <div
                  className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-600 animate-fade-in"
                  role="status"
                  aria-live="polite"
                >
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-800 vw-small font-semibold">Reflection Saved Successfully</p>
                    <p className="text-green-700 vw-small">Your response has been saved to your device</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={!response.trim()}
                  className={`px-8 py-3 text-label vw-small transition-all duration-300 ${
                    response.trim()
                      ? 'bg-black hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8860B]'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  style={{ color: '#FAF9F6' }}
                  aria-label={lastSavedAt ? 'Update reflection response' : 'Save reflection response'}
                >
                  {lastSavedAt ? 'Update Response' : 'Save Response'}
                </button>

                <div className="flex items-center gap-4 text-gray-400 vw-small">
                  <span>
                    {response.length > 0 ? `${response.length} characters` : 'Start writing...'}
                  </span>
                  {lastSavedAt && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Saved {formatTimestamp(lastSavedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-500 vw-small mt-4 italic">
              Your reflections are saved locally and private to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
