/**
 * Content Parser Utility
 * Parses markdown files and JSON content into structured data for database import
 */

import * as fs from 'fs'
import * as path from 'path'
import { Logger } from './logger'

// Frontmatter types
export interface DevotionalFrontmatter {
  title: string
  subtitle?: string
  series?: string
  seriesSlug?: string
  dayNumber?: number
  scriptureRef: string
  scriptureVersion?: string
  author?: string
  tags?: string[]
  isPremium?: boolean
  isPublished?: boolean
  publishedAt?: string
  readingTimeMinutes?: number
}

// Parsed markdown structure
export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>
  content: string
  sections: MarkdownSection[]
}

// Markdown section structure
export interface MarkdownSection {
  type:
    | 'heading'
    | 'paragraph'
    | 'scripture'
    | 'prayer'
    | 'reflection'
    | 'action'
    | 'list'
    | 'quote'
  level?: number
  content: string
  metadata?: Record<string, unknown>
}

// Series JSON structure (matching existing format)
export interface SeriesJson {
  series: {
    id: string
    title: string
    subtitle?: string
    pathway?: string
    coreQuestion?: string
    booksOfFocus?: string[]
    totalDays: number
    heroImage?: string | null
    soulAuditKeywords?: string[]
  }
  days: DayModule[]
  weekOverview?: {
    theme: string
    focus: string
    learningObjectives?: string[]
  }
  metadata?: {
    estimatedReadTime?: {
      quick: string
      medium: string
      deep: string
    }
    moduleCount?: number
    primaryEmotion?: string
    soulAuditKeywords?: string[]
  }
}

// Day module structure
export interface DayModule {
  number: number
  title: string
  anchorVerse: string
  theme?: string
  modules: ContentModule[]
}

// Content module types
export interface ContentModule {
  type: string
  order: number
  content: Record<string, unknown>
}

/**
 * Content Parser class
 */
export class ContentParser {
  private logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ prefix: '[Parser]' })
  }

  /**
   * Parse YAML-like frontmatter from markdown
   */
  parseFrontmatter(content: string): {
    frontmatter: Record<string, unknown>
    body: string
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return { frontmatter: {}, body: content }
    }

    const [, frontmatterStr, body] = match
    const frontmatter: Record<string, unknown> = {}

    // Parse YAML-like frontmatter
    const lines = frontmatterStr.split('\n')
    let currentKey = ''
    let currentArray: string[] = []
    let inArray = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Array item
      if (trimmed.startsWith('- ') && inArray) {
        currentArray.push(trimmed.slice(2).replace(/^["']|["']$/g, ''))
        continue
      }

      // End of array
      if (inArray && !trimmed.startsWith('-')) {
        frontmatter[currentKey] = currentArray
        currentArray = []
        inArray = false
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim()
        const value = trimmed.slice(colonIndex + 1).trim()

        if (value === '' || value === '[]') {
          // Start of array
          currentKey = key
          inArray = true
          currentArray = []
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // Inline array
          frontmatter[key] = value
            .slice(1, -1)
            .split(',')
            .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        } else {
          // Scalar value
          const parsedValue = this.parseValue(value)
          frontmatter[key] = parsedValue
        }
      }
    }

    // Handle final array
    if (inArray && currentArray.length > 0) {
      frontmatter[currentKey] = currentArray
    }

    return { frontmatter, body }
  }

  /**
   * Parse a string value to its appropriate type
   */
  private parseValue(value: string): unknown {
    // Remove quotes
    const unquoted = value.replace(/^["']|["']$/g, '')

    // Boolean
    if (unquoted.toLowerCase() === 'true') return true
    if (unquoted.toLowerCase() === 'false') return false

    // Null
    if (unquoted.toLowerCase() === 'null' || unquoted === '~') return null

    // Number
    const num = Number(unquoted)
    if (!isNaN(num) && unquoted !== '') return num

    // Date (ISO format)
    if (/^\d{4}-\d{2}-\d{2}/.test(unquoted)) {
      const date = new Date(unquoted)
      if (!isNaN(date.getTime())) return date.toISOString()
    }

    return unquoted
  }

  /**
   * Parse markdown content into sections
   */
  parseMarkdownSections(content: string): MarkdownSection[] {
    const sections: MarkdownSection[] = []
    const lines = content.split('\n')
    let currentSection: MarkdownSection | null = null
    let buffer: string[] = []

    const flushBuffer = () => {
      if (buffer.length > 0 && currentSection) {
        currentSection.content = buffer.join('\n').trim()
        if (currentSection.content) {
          sections.push(currentSection)
        }
      }
      buffer = []
    }

    for (const line of lines) {
      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        flushBuffer()
        const level = headingMatch[1].length
        const text = headingMatch[2]

        // Detect special section types
        let type: MarkdownSection['type'] = 'heading'
        const lowerText = text.toLowerCase()

        if (lowerText.includes('scripture') || lowerText.includes('verse')) {
          type = 'scripture'
        } else if (lowerText.includes('prayer')) {
          type = 'prayer'
        } else if (
          lowerText.includes('reflection') ||
          lowerText.includes('question')
        ) {
          type = 'reflection'
        } else if (
          lowerText.includes('action') ||
          lowerText.includes('commitment')
        ) {
          type = 'action'
        }

        currentSection = { type, level, content: text }
        continue
      }

      // Blockquote (often scripture)
      if (line.startsWith('>')) {
        if (currentSection?.type !== 'quote') {
          flushBuffer()
          currentSection = { type: 'quote', content: '' }
        }
        buffer.push(line.slice(1).trim())
        continue
      }

      // List item
      if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
        if (currentSection?.type !== 'list') {
          flushBuffer()
          currentSection = { type: 'list', content: '' }
        }
        buffer.push(line)
        continue
      }

      // Paragraph
      if (line.trim() && currentSection?.type !== 'paragraph') {
        flushBuffer()
        currentSection = { type: 'paragraph', content: '' }
      }

      if (line.trim()) {
        buffer.push(line)
      } else if (buffer.length > 0) {
        flushBuffer()
        currentSection = null
      }
    }

    flushBuffer()
    return sections
  }

  /**
   * Parse a complete markdown devotional file
   */
  parseMarkdownDevotional(filePath: string): ParsedMarkdown {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(content)
    const sections = this.parseMarkdownSections(body)

    return { frontmatter, content: body, sections }
  }

  /**
   * Parse a series JSON file
   */
  parseSeriesJson(filePath: string): SeriesJson {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as SeriesJson
  }

  /**
   * Extract scripture reference from text
   */
  extractScriptureRef(
    text: string,
  ): { reference: string; version?: string } | null {
    // Common patterns: "John 3:16 (ESV)", "John 3:16-17", "1 Corinthians 13:4-7"
    const refPattern =
      /([123]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\s*(?:\(([A-Z]+)\))?/
    const match = text.match(refPattern)

    if (match) {
      return {
        reference: match[1].trim(),
        version: match[2] || undefined,
      }
    }

    return null
  }

  /**
   * Extract reflection questions from content
   */
  extractReflectionQuestions(content: string): string[] {
    const questions: string[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      // Look for lines ending with ?
      if (line.trim().endsWith('?')) {
        // Clean up list markers and extra whitespace
        const question = line.replace(/^[-*+]\s*|\d+\.\s*/, '').trim()
        if (question.length > 10) {
          // Minimum length to filter noise
          questions.push(question)
        }
      }
    }

    return questions
  }

  /**
   * Extract prayer from content
   */
  extractPrayer(sections: MarkdownSection[]): string | null {
    for (const section of sections) {
      if (section.type === 'prayer') {
        // Look for the next paragraph or quote
        const idx = sections.indexOf(section)
        for (let i = idx + 1; i < sections.length; i++) {
          if (
            sections[i].type === 'paragraph' ||
            sections[i].type === 'quote'
          ) {
            return sections[i].content
          }
          if (sections[i].type === 'heading') break
        }
      }
    }

    return null
  }

  /**
   * Calculate estimated reading time
   */
  calculateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const words = content.split(/\s+/).length
    return Math.ceil(words / wordsPerMinute)
  }

  /**
   * Generate a slug from a title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Scan a directory for content files
   */
  scanDirectory(
    dirPath: string,
    options?: { extensions?: string[]; recursive?: boolean },
  ): string[] {
    const extensions = options?.extensions || ['.md', '.json']
    const recursive = options?.recursive ?? true
    const files: string[] = []

    const scan = (dir: string) => {
      if (!fs.existsSync(dir)) {
        this.logger.warn(`Directory not found: ${dir}`)
        return
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory() && recursive) {
          scan(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (extensions.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }

    scan(dirPath)
    return files
  }

  /**
   * Parse all content in a directory
   */
  parseDirectory(dirPath: string): {
    markdown: ParsedMarkdown[]
    series: SeriesJson[]
  } {
    const files = this.scanDirectory(dirPath)
    const markdown: ParsedMarkdown[] = []
    const series: SeriesJson[] = []

    for (const file of files) {
      try {
        const ext = path.extname(file).toLowerCase()

        if (ext === '.md') {
          const parsed = this.parseMarkdownDevotional(file)
          markdown.push(parsed)
        } else if (ext === '.json') {
          const parsed = this.parseSeriesJson(file)
          if (parsed.series && parsed.days) {
            series.push(parsed)
          }
        }
      } catch (err) {
        this.logger.error(`Failed to parse ${file}: ${(err as Error).message}`)
      }
    }

    return { markdown, series }
  }
}

/**
 * Create a parser instance
 */
export function createParser(logger?: Logger): ContentParser {
  return new ContentParser(logger)
}

export default ContentParser
