'use client';

import { useEffect, useRef, useState } from 'react';

interface ReflectionPromptProps {
  question: string;
  index: number;
  devotionalSlug: string;
}

export default function ReflectionPrompt({ question, index, devotionalSlug }: ReflectionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [response, setResponse] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved response if exists
    const saved = localStorage.getItem(`reflection_${devotionalSlug}_${index}`);
    if (saved) {
      setResponse(saved);
      setIsSaved(true);
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
      localStorage.setItem(`reflection_${devotionalSlug}_${index}`, response);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
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
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your thoughts here..."
                className="w-full p-4 border-2 border-gray-200 focus:border-[#B8860B] outline-none resize-none vw-body font-serif"
                style={{ backgroundColor: '#FAF9F6', minHeight: '120px' }}
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSave}
                  disabled={!response.trim()}
                  className={`px-6 py-2 text-label vw-small transition-all duration-300 ${
                    response.trim()
                      ? 'bg-black hover:bg-gray-800'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  style={{ color: '#FAF9F6' }}
                >
                  {isSaved ? 'Saved ✓' : 'Save Response'}
                </button>

                <span className="text-gray-400 vw-small">
                  {response.length > 0 ? `${response.length} characters` : 'Start writing...'}
                </span>
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
