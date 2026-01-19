import fs from 'fs';
import path from 'path';
import { Series, Day, Pathway, Module, ModuleType } from './types';

// Path to the series JSON files - try multiple possible locations
function getContentDir(): string {
  const possiblePaths = [
    path.join(process.cwd(), '..', 'content', 'series-json'),
    path.join(process.cwd(), 'content', 'series-json'),
    '/Users/meltmac/Documents/Personal/wkGD/EUONGELION-STARTUP/content/series-json',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to first option
  return possiblePaths[0];
}

const CONTENT_DIR = getContentDir();

// Cache for loaded series
let seriesCache: Series[] | null = null;

/**
 * Transform the raw JSON data to match our Series type
 * Handles both flat (why-jesus.json) and nested (other files) structures
 */
function transformSeries(raw: Record<string, unknown>): Series {
  // Handle flat structure (like why-jesus.json)
  if (raw.slug && raw.days && Array.isArray(raw.days)) {
    // Ensure days have proper structure
    const days: Day[] = (raw.days as Record<string, unknown>[]).map(day => ({
      day_number: day.day_number as number,
      title: day.title as string,
      subtitle: day.subtitle as string | undefined,
      chiasm_position: day.chiasm_position as string | undefined,
      modules: (day.modules as Array<{ type: string; data: Record<string, unknown> }>).map(mod => ({
        type: mod.type as ModuleType,
        data: mod.data,
      } as unknown as Module)),
    }));

    return {
      slug: raw.slug as string,
      title: raw.title as string,
      subtitle: raw.subtitle as string | undefined,
      pathway: raw.pathway as Pathway,
      day_count: raw.day_count as number,
      ecclesiastes_connection: raw.ecclesiastes_connection as string | undefined,
      gospel_presentation: raw.gospel_presentation as string | undefined,
      core_theme: raw.core_theme as string | undefined,
      emotional_tones: raw.emotional_tones as string[] | undefined,
      life_circumstances: raw.life_circumstances as string[] | undefined,
      target_audience: raw.target_audience as string[] | undefined,
      soul_audit_keywords: raw.soul_audit_keywords as string[] | undefined,
      days,
    };
  }

  // Handle nested structure (most files)
  const seriesData = raw.series as Record<string, unknown>;

  let days: Day[] = [];

  // Handle single day format (day + modules at root level)
  if (raw.day && raw.modules && !raw.days) {
    const day = raw.day as Record<string, unknown>;
    const modules = raw.modules as Array<Record<string, unknown>>;

    days = [{
      day_number: (day.number as number) || 1,
      title: day.title as string,
      subtitle: day.theme as string | undefined,
      chiasm_position: undefined,
      modules: modules.map(mod => transformModule(mod)),
    }];
  }
  // Handle days array format
  else if (raw.days && Array.isArray(raw.days)) {
    const rawDays = raw.days as Array<Record<string, unknown>>;

    for (const dayWrapper of rawDays) {
      const day = dayWrapper.day as Record<string, unknown> | undefined;
      const modules = dayWrapper.modules as Array<Record<string, unknown>> | undefined;

      // Skip if day or modules is missing
      if (!day || !modules) {
        continue;
      }

      days.push({
        day_number: (day.number as number) || 1,
        title: (day.title as string) || 'Untitled Day',
        subtitle: day.theme as string | undefined,
        chiasm_position: undefined,
        modules: modules.map(mod => transformModule(mod)),
      });
    }
  }

  return {
    slug: (seriesData.id as string) || '',
    title: (seriesData.title as string) || '',
    subtitle: seriesData.subtitle as string | undefined,
    pathway: (seriesData.pathway as Pathway) || 'Awake',
    day_count: (seriesData.totalDays as number) || days.length,
    ecclesiastes_connection: undefined,
    gospel_presentation: undefined,
    core_theme: seriesData.coreQuestion as string | undefined,
    emotional_tones: undefined,
    life_circumstances: undefined,
    target_audience: undefined,
    soul_audit_keywords: seriesData.soulAuditKeywords as string[] | undefined,
    days,
  };
}

/**
 * Transform a module from the nested format to our flat format
 */
function transformModule(mod: Record<string, unknown>): Module {
  const type = mod.type as ModuleType;
  const content = mod.content as Record<string, unknown>;

  // Transform content fields based on module type
  switch (type) {
    case 'scripture':
      return {
        type,
        data: {
          reference: content.reference as string,
          translation: (content.translation as string) || 'NIV',
          text: content.text as string,
          emphasis: content.emphasis as string[] | undefined,
        },
      } as Module;
    case 'vocab':
      return {
        type,
        data: {
          language: (content.language as string) || 'greek',
          word: content.word as string,
          transliteration: content.transliteration as string,
          pronunciation: content.pronunciation as string,
          strongs: (content.strongsNumber as string) || 'N/A',
          definition: (content.meaning || content.definition) as string,
          root_meaning: ((content.rootMeaning || content.root_meaning) as string) || '',
          usage_note: ((content.usageNote || content.usage_note) as string) || '',
        },
      } as Module;
    case 'teaching':
      return {
        type,
        data: {
          content: ((content.body || content.content) as string) || '',
          pardes_layer: content.pardes_layer as string | undefined,
        },
      } as Module;
    case 'insight':
      return {
        type,
        data: {
          text: ((content.body || content.text) as string) || '',
        },
      } as Module;
    case 'story':
      return {
        type,
        data: {
          title: content.title as string | undefined,
          content: ((content.body || content.content) as string) || '',
        },
      } as Module;
    case 'reflection':
      return {
        type,
        data: {
          question: ((content.prompt || content.question) as string) || '',
          prompt_text: Array.isArray(content.additionalQuestions)
            ? (content.additionalQuestions as string[]).join('\n')
            : ((content.prompt_text as string) || ''),
          allow_save: true,
        },
      } as Module;
    case 'prayer':
      return {
        type,
        data: {
          title: (content.title as string) || 'Prayer',
          text: ((content.body || content.text) as string) || '',
          scripture_echo: content.scripture_echo as string | undefined,
        },
      } as Module;
    case 'takeaway':
      return {
        type,
        data: {
          title: (content.title as string) || 'Key Takeaway',
          text: ((content.body || content.text) as string) || '',
          action: (content.action || content.challenge) as string | undefined,
        },
      } as Module;
    case 'bridge':
      return {
        type,
        data: {
          ancient: ((content.ancientTruth || content.ancient) as string) || '',
          modern: ((content.modernApplication || content.modern) as string) || '',
          connection: ((content.connectionPoint || content.connection) as string) || '',
          question: content.question as string | undefined,
        },
      } as Module;
    case 'comprehension':
      return {
        type,
        data: {
          question: (content.question as string) || '',
          options: (content.options as Array<{ text: string; correct: boolean }>) || [],
          explanation: (content.explanation as string) || '',
        },
      } as Module;
    case 'interactive':
      return {
        type,
        data: {
          interaction_type: (content.interaction_type as string) || 'choice',
          prompt: (content.prompt as string) || '',
          options: (content.options as string[]) || [],
          follow_up: content.follow_up as string | undefined,
        },
      } as Module;
    case 'resource':
      return {
        type,
        data: {
          title: (content.title as string) || '',
          url: content.url as string | undefined,
          description: content.description as string | undefined,
          type: content.type as string | undefined,
        },
      } as Module;
    default:
      return {
        type,
        data: content as unknown,
      } as Module;
  }
}

/**
 * Load all series from the JSON files
 */
export function getAllSeries(): Series[] {
  if (seriesCache) {
    return seriesCache;
  }

  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`Content directory not found: ${CONTENT_DIR}`);
    return [];
  }

  const files = fs.readdirSync(CONTENT_DIR);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  const series: Series[] = [];

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(CONTENT_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const raw = JSON.parse(content);
      const transformed = transformSeries(raw);
      if (transformed.slug && transformed.days.length > 0) {
        series.push(transformed);
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  // Sort by pathway and then by title
  series.sort((a, b) => {
    const pathwayOrder: Record<Pathway, number> = { Sleep: 1, Awake: 2, Shepherd: 3 };
    const pathwayDiff = pathwayOrder[a.pathway] - pathwayOrder[b.pathway];
    if (pathwayDiff !== 0) return pathwayDiff;
    return a.title.localeCompare(b.title);
  });

  seriesCache = series;
  return series;
}

/**
 * Get series grouped by pathway
 */
export function getSeriesByPathway(): Record<Pathway, Series[]> {
  const allSeries = getAllSeries();

  return {
    Sleep: allSeries.filter(s => s.pathway === 'Sleep'),
    Awake: allSeries.filter(s => s.pathway === 'Awake'),
    Shepherd: allSeries.filter(s => s.pathway === 'Shepherd'),
  };
}

/**
 * Get a single series by slug
 */
export function getSeriesBySlug(slug: string): Series | undefined {
  const allSeries = getAllSeries();
  return allSeries.find(s => s.slug === slug);
}

/**
 * Get a specific day from a series
 */
export function getDay(slug: string, dayNumber: number): Day | undefined {
  const series = getSeriesBySlug(slug);
  if (!series) return undefined;
  return series.days.find(d => d.day_number === dayNumber);
}

/**
 * Get all series slugs (for static generation)
 */
export function getAllSeriesSlugs(): string[] {
  const allSeries = getAllSeries();
  return allSeries
    .filter(s => s && s.slug)
    .map(s => s.slug);
}

/**
 * Get all day paths (for static generation)
 */
export function getAllDayPaths(): { slug: string; day: string }[] {
  const allSeries = getAllSeries();
  const paths: { slug: string; day: string }[] = [];

  for (const series of allSeries) {
    if (!series || !series.slug || !series.days) continue;
    for (const day of series.days) {
      if (!day || day.day_number === undefined) continue;
      paths.push({
        slug: series.slug,
        day: String(day.day_number),
      });
    }
  }

  return paths;
}

/**
 * Get total day count across all series
 */
export function getTotalDayCount(): number {
  const allSeries = getAllSeries();
  return allSeries.reduce((total, series) => total + series.day_count, 0);
}
