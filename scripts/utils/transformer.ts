/**
 * Data Transformer Utility
 * Transforms parsed content into database-ready format
 */

import { v4 as uuidv4 } from 'uuid'
import {
  SeriesInsert,
  DevotionalInsert,
  SoulAuditQuestionInsert,
  DifficultyLevel,
  QuestionCategory,
  QuestionType,
} from '../../database/types'
import {
  ParsedMarkdown,
  SeriesJson,
  DayModule,
  ContentModule,
  MarkdownSection,
} from './parser'
import { Logger } from './logger'

// Transformation options
export interface TransformOptions {
  generateIds?: boolean
  defaultAuthor?: string
  defaultScriptureVersion?: string
  setPublished?: boolean
  seriesIdMap?: Map<string, string>
}

// Transformation result
export interface TransformResult<T> {
  data: T
  warnings: string[]
  errors: string[]
}

/**
 * Data Transformer class
 */
export class DataTransformer {
  private logger: Logger
  private seriesIdMap: Map<string, string>

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ prefix: '[Transformer]' })
    this.seriesIdMap = new Map()
  }

  /**
   * Set the series ID mapping
   */
  setSeriesIdMap(map: Map<string, string>): void {
    this.seriesIdMap = map
  }

  /**
   * Transform a SeriesJson to database format
   */
  transformSeries(
    input: SeriesJson,
    options: TransformOptions = {},
  ): TransformResult<SeriesInsert> {
    const warnings: string[] = []
    const errors: string[] = []

    const { series, days, weekOverview, metadata } = input

    // Generate or use existing ID
    const id = options.generateIds ? uuidv4() : series.id

    // Store the ID mapping
    this.seriesIdMap.set(series.id, id)

    // Generate slug
    const slug = this.generateSlug(series.title)

    // Determine difficulty level based on content
    const difficultyLevel = this.inferDifficultyLevel(series, days)

    // Extract tags from keywords and other metadata
    const tags = this.extractTags(series, weekOverview, metadata)

    // Determine if premium based on pathway or explicit flag
    const isPremium =
      series.pathway === 'Mastery' || series.pathway === 'Advanced'

    const data: SeriesInsert = {
      name: series.title,
      slug,
      description: weekOverview?.focus || series.coreQuestion || null,
      short_description: series.subtitle || null,
      image_url: series.heroImage || null,
      thumbnail_url: null,
      duration_days: series.totalDays,
      difficulty_level: difficultyLevel,
      tags,
      is_premium: isPremium,
      is_published: options.setPublished ?? false,
      is_featured: false,
      sort_order: 0,
      author: options.defaultAuthor || 'EUONGELION Team',
    }

    // Validation
    if (!data.name) {
      errors.push('Series must have a title')
    }

    if (data.duration_days && data.duration_days < 1) {
      warnings.push('Series duration should be at least 1 day')
    }

    return { data, warnings, errors }
  }

  /**
   * Transform a DayModule to Devotional format
   */
  transformDayToDevotional(
    day: DayModule,
    seriesSlug: string,
    options: TransformOptions = {},
  ): TransformResult<DevotionalInsert> {
    const warnings: string[] = []
    const errors: string[] = []

    // Get series ID from map
    const seriesId =
      this.seriesIdMap.get(seriesSlug) || options.seriesIdMap?.get(seriesSlug)

    // Generate slug
    const slug = this.generateSlug(
      `${seriesSlug}-day-${day.number}-${day.title}`,
    )

    // Extract content from modules
    const {
      content,
      contentHtml,
      prayer,
      reflectionQuestions,
      actionStep,
      scriptureText,
      readingTime,
    } = this.extractFromModules(day.modules)

    // Parse anchor verse
    const { reference, version } = this.parseScriptureRef(day.anchorVerse)

    const data: DevotionalInsert = {
      series_id: seriesId || null,
      title: day.title,
      slug,
      subtitle: day.theme || null,
      content: content || '',
      content_html: contentHtml || null,
      scripture_ref: reference,
      scripture_text: scriptureText || null,
      scripture_version: version || options.defaultScriptureVersion || 'ESV',
      day_number: day.number,
      reading_time_minutes: readingTime || 5,
      prayer: prayer || null,
      reflection_questions: reflectionQuestions,
      action_step: actionStep || null,
      audio_url: null,
      image_url: null,
      tags: this.extractDevotionalTags(day),
      is_premium: false,
      is_published: options.setPublished ?? false,
      is_featured: false,
      author: options.defaultAuthor || 'EUONGELION Team',
      published_at: options.setPublished ? new Date().toISOString() : null,
    }

    // Validation
    if (!data.title) {
      errors.push('Devotional must have a title')
    }

    if (!data.scripture_ref) {
      errors.push('Devotional must have a scripture reference')
    }

    if (!data.content || data.content.length < 100) {
      warnings.push('Devotional content seems too short')
    }

    return { data, warnings, errors }
  }

  /**
   * Transform parsed markdown to Devotional format
   */
  transformMarkdownToDevotional(
    parsed: ParsedMarkdown,
    options: TransformOptions = {},
  ): TransformResult<DevotionalInsert> {
    const warnings: string[] = []
    const errors: string[] = []

    const fm = parsed.frontmatter as Record<string, unknown>

    // Get series ID if specified
    const seriesSlug = (fm.seriesSlug as string) || (fm.series as string)
    const seriesId = seriesSlug
      ? this.seriesIdMap.get(seriesSlug) || options.seriesIdMap?.get(seriesSlug)
      : null

    // Generate slug
    const title = (fm.title as string) || 'Untitled Devotional'
    const slug = this.generateSlug(title)

    // Extract scripture reference
    const scriptureRef = (fm.scriptureRef as string) || ''
    const { reference, version } = this.parseScriptureRef(scriptureRef)

    // Extract content sections
    const { prayer, reflectionQuestions, actionStep } =
      this.extractFromSections(parsed.sections)

    // Calculate reading time
    const readingTime =
      (fm.readingTimeMinutes as number) ||
      this.calculateReadingTime(parsed.content)

    const data: DevotionalInsert = {
      series_id: seriesId || null,
      title,
      slug,
      subtitle: (fm.subtitle as string) || null,
      content: parsed.content,
      content_html: this.markdownToHtml(parsed.content),
      scripture_ref: reference,
      scripture_text: null,
      scripture_version: version || options.defaultScriptureVersion || 'ESV',
      day_number: (fm.dayNumber as number) || null,
      reading_time_minutes: readingTime,
      prayer: prayer || null,
      reflection_questions: reflectionQuestions,
      action_step: actionStep || null,
      audio_url: null,
      image_url: null,
      tags: (fm.tags as string[]) || [],
      is_premium: (fm.isPremium as boolean) || false,
      is_published:
        (fm.isPublished as boolean) || options.setPublished || false,
      is_featured: false,
      author:
        (fm.author as string) || options.defaultAuthor || 'EUONGELION Team',
      published_at:
        (fm.publishedAt as string) ||
        (options.setPublished ? new Date().toISOString() : null),
    }

    // Validation
    if (!data.title) {
      errors.push('Devotional must have a title')
    }

    if (!data.scripture_ref) {
      warnings.push('No scripture reference found')
    }

    return { data, warnings, errors }
  }

  /**
   * Transform Soul Audit question data
   */
  transformSoulAuditQuestion(
    input: Record<string, unknown>,
    sortOrder: number,
  ): TransformResult<SoulAuditQuestionInsert> {
    const warnings: string[] = []
    const errors: string[] = []

    const category = input.category as QuestionCategory
    const questionType = (input.questionType as QuestionType) || 'scale'

    const data: SoulAuditQuestionInsert = {
      question_text: input.questionText as string,
      question_description: (input.description as string) || null,
      category,
      question_type: questionType,
      options:
        (input.options as { value: string | number; label: string }[]) || null,
      min_value: (input.minValue as number) ?? 1,
      max_value: (input.maxValue as number) ?? 10,
      min_label: (input.minLabel as string) || 'Strongly Disagree',
      max_label: (input.maxLabel as string) || 'Strongly Agree',
      weight: (input.weight as number) ?? 1.0,
      sort_order: sortOrder,
      is_required: (input.isRequired as boolean) ?? true,
      is_active: (input.isActive as boolean) ?? true,
      help_text: (input.helpText as string) || null,
      scripture_reference: (input.scriptureReference as string) || null,
    }

    // Validation
    if (!data.question_text) {
      errors.push('Question must have text')
    }

    if (!data.category) {
      errors.push('Question must have a category')
    }

    return { data, warnings, errors }
  }

  /**
   * Batch transform series data
   */
  transformSeriesBatch(
    seriesData: SeriesJson[],
    options: TransformOptions = {},
  ): {
    series: SeriesInsert[]
    devotionals: DevotionalInsert[]
    warnings: string[]
    errors: string[]
  } {
    const allSeries: SeriesInsert[] = []
    const allDevotionals: DevotionalInsert[] = []
    const allWarnings: string[] = []
    const allErrors: string[] = []

    for (const seriesJson of seriesData) {
      // Transform series
      const seriesResult = this.transformSeries(seriesJson, options)
      allSeries.push(seriesResult.data)
      allWarnings.push(
        ...seriesResult.warnings.map(
          (w) => `[${seriesJson.series.title}] ${w}`,
        ),
      )
      allErrors.push(
        ...seriesResult.errors.map((e) => `[${seriesJson.series.title}] ${e}`),
      )

      // Transform devotionals
      for (const day of seriesJson.days) {
        if (day.modules && day.modules.length > 0) {
          const devResult = this.transformDayToDevotional(
            day,
            seriesJson.series.id,
            options,
          )
          allDevotionals.push(devResult.data)
          allWarnings.push(
            ...devResult.warnings.map((w) => `[${day.title}] ${w}`),
          )
          allErrors.push(...devResult.errors.map((e) => `[${day.title}] ${e}`))
        }
      }
    }

    return {
      series: allSeries,
      devotionals: allDevotionals,
      warnings: allWarnings,
      errors: allErrors,
    }
  }

  // Helper methods

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) // Limit slug length
  }

  private inferDifficultyLevel(
    series: SeriesJson['series'],
    days: DayModule[],
  ): DifficultyLevel {
    // Check pathway
    if (series.pathway) {
      const pathwayLower = series.pathway.toLowerCase()
      if (pathwayLower.includes('awake') || pathwayLower.includes('beginner'))
        return 'beginner'
      if (pathwayLower.includes('mastery') || pathwayLower.includes('advanced'))
        return 'advanced'
    }

    // Check content complexity
    let totalModules = 0
    let complexModules = 0

    for (const day of days) {
      for (const module of day.modules || []) {
        totalModules++
        if (['vocab', 'insight', 'profile', 'teaching'].includes(module.type)) {
          complexModules++
        }
      }
    }

    const complexityRatio = totalModules > 0 ? complexModules / totalModules : 0

    if (complexityRatio > 0.4) return 'advanced'
    if (complexityRatio > 0.2) return 'intermediate'
    return 'beginner'
  }

  private extractTags(
    series: SeriesJson['series'],
    weekOverview?: SeriesJson['weekOverview'],
    metadata?: SeriesJson['metadata'],
  ): string[] {
    const tags = new Set<string>()

    // Add soul audit keywords
    if (series.soulAuditKeywords) {
      series.soulAuditKeywords.forEach((k) => tags.add(k.toLowerCase()))
    }

    // Add books of focus
    if (series.booksOfFocus) {
      series.booksOfFocus.forEach((b) => tags.add(b.toLowerCase()))
    }

    // Add pathway
    if (series.pathway) {
      tags.add(series.pathway.toLowerCase())
    }

    // Add from metadata
    if (metadata?.soulAuditKeywords) {
      metadata.soulAuditKeywords.forEach((k) => tags.add(k.toLowerCase()))
    }

    if (metadata?.primaryEmotion) {
      tags.add(metadata.primaryEmotion.toLowerCase())
    }

    return Array.from(tags).slice(0, 20) // Limit tags
  }

  private extractDevotionalTags(day: DayModule): string[] {
    const tags = new Set<string>()

    // Add from theme
    if (day.theme) {
      const words = day.theme.toLowerCase().split(/\s+/)
      words.filter((w) => w.length > 4).forEach((w) => tags.add(w))
    }

    // Add scripture book
    const bookMatch = day.anchorVerse.match(/^([123]?\s*[A-Za-z]+)/)
    if (bookMatch) {
      tags.add(bookMatch[1].toLowerCase().trim())
    }

    return Array.from(tags).slice(0, 10)
  }

  private extractFromModules(modules: ContentModule[]): {
    content: string
    contentHtml: string | null
    prayer: string | null
    reflectionQuestions: string[]
    actionStep: string | null
    scriptureText: string | null
    readingTime: number
  } {
    const contentParts: string[] = []
    let prayer: string | null = null
    let reflectionQuestions: string[] = []
    let actionStep: string | null = null
    let scriptureText: string | null = null

    for (const module of modules) {
      switch (module.type) {
        case 'scripture':
          if (module.content.text) {
            scriptureText = module.content.text as string
            contentParts.push(`> ${scriptureText}`)
          }
          break

        case 'teaching':
          if (module.content.body) {
            contentParts.push(module.content.body as string)
          }
          break

        case 'story':
          if (module.content.body) {
            contentParts.push(
              `## ${module.content.title || 'Story'}\n\n${module.content.body}`,
            )
          }
          break

        case 'insight':
          if (module.content.body) {
            contentParts.push(
              `### ${module.content.title || 'Insight'}\n\n${module.content.body}`,
            )
          }
          break

        case 'bridge':
          if (module.content.modernApplication) {
            contentParts.push(`**Today:** ${module.content.modernApplication}`)
          }
          break

        case 'prayer':
          prayer = module.content.text as string
          break

        case 'reflection':
          if (module.content.additionalQuestions) {
            reflectionQuestions = module.content.additionalQuestions as string[]
          }
          if (module.content.prompt) {
            reflectionQuestions.unshift(module.content.prompt as string)
          }
          break

        case 'takeaway':
          actionStep = module.content.commitment as string
          break

        case 'vocab':
          if (module.content.word && module.content.meaning) {
            contentParts.push(
              `**${module.content.word}** (${module.content.transliteration || ''}): ${module.content.meaning}`,
            )
          }
          break
      }
    }

    const content = contentParts.join('\n\n')
    const readingTime = this.calculateReadingTime(content)

    return {
      content,
      contentHtml: this.markdownToHtml(content),
      prayer,
      reflectionQuestions,
      actionStep,
      scriptureText,
      readingTime,
    }
  }

  private extractFromSections(sections: MarkdownSection[]): {
    prayer: string | null
    reflectionQuestions: string[]
    actionStep: string | null
  } {
    let prayer: string | null = null
    const reflectionQuestions: string[] = []
    let actionStep: string | null = null
    let inPrayer = false
    let inReflection = false
    let inAction = false

    for (const section of sections) {
      // Track current section type
      if (section.type === 'heading') {
        const lower = section.content.toLowerCase()
        inPrayer = lower.includes('prayer')
        inReflection =
          lower.includes('reflection') || lower.includes('question')
        inAction =
          lower.includes('action') ||
          lower.includes('commitment') ||
          lower.includes('takeaway')
        continue
      }

      if (section.type === 'prayer' || inPrayer) {
        if (section.content && !prayer) {
          prayer = section.content
        }
      }

      if (inReflection && section.type === 'list') {
        const questions = section.content
          .split('\n')
          .map((line) => line.replace(/^[-*+]\s*|\d+\.\s*/, '').trim())
          .filter((q) => q.endsWith('?'))
        reflectionQuestions.push(...questions)
      }

      if (inAction && section.type === 'paragraph') {
        if (!actionStep) {
          actionStep = section.content
        }
      }
    }

    return { prayer, reflectionQuestions, actionStep }
  }

  private parseScriptureRef(ref: string): {
    reference: string
    version?: string
  } {
    const versionMatch = ref.match(/\(([A-Z]+)\)\s*$/)
    const version = versionMatch ? versionMatch[1] : undefined
    const reference = ref.replace(/\s*\([A-Z]+\)\s*$/, '').trim()

    return { reference, version }
  }

  private calculateReadingTime(content: string): number {
    const words = content.split(/\s+/).length
    return Math.max(1, Math.ceil(words / 200))
  }

  private markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }
}

/**
 * Create a transformer instance
 */
export function createTransformer(logger?: Logger): DataTransformer {
  return new DataTransformer(logger)
}

export default DataTransformer
