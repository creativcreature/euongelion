'use client';

import { useState, useEffect } from 'react';
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks';

interface DevotionalActionsProps {
  slug: string;
  title: string;
  seriesTitle: string;
}

export default function DevotionalActions({ slug, title, seriesTitle }: DevotionalActionsProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(slug));

    const handleUpdate = () => {
      setBookmarked(isBookmarked(slug));
    };

    window.addEventListener('bookmarksUpdated', handleUpdate);
    return () => window.removeEventListener('bookmarksUpdated', handleUpdate);
  }, [slug]);

  const handleBookmark = () => {
    const newState = toggleBookmark(slug, title, seriesTitle);
    setBookmarked(newState);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/devotional/${slug}`;
    const text = `${title} - Wake Up Zine`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/devotional/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleShareTwitter = () => {
    const url = `${window.location.origin}/devotional/${slug}`;
    const text = `${title} - Wake Up Zine`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareEmail = () => {
    const url = `${window.location.origin}/devotional/${slug}`;
    const subject = `${title} - Wake Up Zine`;
    const body = `I thought you might find this devotional meaningful:\n\n${title}\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="flex items-center gap-4">
      {/* Bookmark Button */}
      <button
        onClick={handleBookmark}
        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 hover:border-gray-400 transition-all duration-300 group"
        title={bookmarked ? 'Remove bookmark' : 'Bookmark this devotional'}
      >
        <svg
          className={`w-5 h-5 transition-colors duration-300 ${bookmarked ? 'fill-current' : 'fill-none'}`}
          style={{ color: bookmarked ? '#B8860B' : 'currentColor' }}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="text-label vw-small text-gray-700 group-hover:text-black">
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      </button>

      {/* Share Button */}
      <div className="relative">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 hover:border-gray-400 transition-all duration-300 group"
          title="Share this devotional"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-label vw-small text-gray-700 group-hover:text-black">
            Share
          </span>
        </button>

        {/* Share Menu */}
        {showShareMenu && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white shadow-2xl border border-gray-200 z-50">
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="vw-small">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleShareTwitter}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
              <span className="vw-small">Share on Twitter</span>
            </button>
            <button
              onClick={handleShareEmail}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="vw-small">Share via Email</span>
            </button>
            <button
              onClick={() => setShowShareMenu(false)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-gray-500 vw-small border-t border-gray-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close share menu */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </div>
  );
}
