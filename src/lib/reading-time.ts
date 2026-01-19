// Calculate reading time for content
// Average reading speed: 200-250 words per minute
// We use 200 wpm for devotional content (more contemplative reading)

const WORDS_PER_MINUTE = 200

export function calculateReadingTime(text: string): number {
  if (!text) return 0

  // Remove HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, '')

  // Count words (split by whitespace)
  const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length

  // Calculate minutes, minimum 1 minute
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE)

  return Math.max(1, minutes)
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min read'
  if (minutes === 1) return '1 min read'
  return `${minutes} min read`
}

// Calculate reading time for a devotional with modules
export function calculateDevotionalReadingTime(modules: Array<{ type: string; data: unknown }>): number {
  let totalWords = 0

  for (const module of modules) {
    const data = module.data as Record<string, unknown>

    switch (module.type) {
      case 'teaching':
      case 'story':
      case 'bridge':
        if (typeof data.content === 'string') {
          totalWords += countWords(data.content)
        }
        break

      case 'scripture':
        if (typeof data.text === 'string') {
          totalWords += countWords(data.text)
        }
        break

      case 'reflection':
      case 'prayer':
      case 'insight':
      case 'takeaway':
        if (typeof data.content === 'string') {
          totalWords += countWords(data.content)
        }
        if (typeof data.text === 'string') {
          totalWords += countWords(data.text)
        }
        break

      case 'vocab':
        if (typeof data.definition === 'string') {
          totalWords += countWords(data.definition)
        }
        if (typeof data.usage === 'string') {
          totalWords += countWords(data.usage)
        }
        break

      case 'comprehension':
        if (Array.isArray(data.questions)) {
          for (const q of data.questions) {
            if (typeof q === 'object' && q !== null) {
              const question = q as Record<string, unknown>
              if (typeof question.question === 'string') {
                totalWords += countWords(question.question)
              }
            }
          }
        }
        break
    }
  }

  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE))
}

function countWords(text: string): number {
  if (!text) return 0
  const cleanText = text.replace(/<[^>]*>/g, '').trim()
  return cleanText.split(/\s+/).filter(Boolean).length
}
