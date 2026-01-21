'use client'

export interface ShareData {
  title: string
  text?: string
  url: string
}

export async function shareContent(data: ShareData): Promise<boolean> {
  // Try native Web Share API first (mobile)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data)
      return true
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error)
      }
      return false
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(data.url)
    return true
  } catch (error) {
    console.error('Clipboard copy failed:', error)
    return false
  }
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

export function getShareUrl(seriesSlug: string, day?: number): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (day) {
    return `${baseUrl}/series/${seriesSlug}/${day}`
  }
  return `${baseUrl}/series/${seriesSlug}`
}

export function createShareData(
  title: string,
  seriesSlug: string,
  day?: number,
  excerpt?: string
): ShareData {
  return {
    title: `${title} | EUONGELION`,
    text: excerpt || `Check out "${title}" on EUONGELION`,
    url: getShareUrl(seriesSlug, day),
  }
}
