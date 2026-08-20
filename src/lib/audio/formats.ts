/**
 * Listening formats — the breadth axis.
 *
 * Until now the system had exactly two shapes of audio, and neither was
 * modelled: a devotional read aloud, and a scripture day read aloud. Both are
 * reading material with a voice attached, both are discovered through
 * `SERIES_DATA`, and both are about eleven minutes long. The measured catalogue
 * shows what that costs — 550 tracks, median 11.1 minutes, nothing over 28 and
 * almost nothing under 5. Every piece assumes the same occasion.
 *
 * A format is the missing noun. It says how long a piece runs, what someone is
 * doing while it plays, and — critically — whether it needs a written twin at
 * all. Three of the formats below are audio-native: they would be poor as
 * reading, and no amount of restructuring the devotional corpus produces them.
 *
 * WHAT THIS FILE DOES NOT DO: invent content. A format declared here with no
 * delivered pieces reports `delivered: 0` and every surface renders nothing for
 * it, exactly as `/daily-bread` renders no Listen control on a day whose
 * reading has no track (SA-098). A control that plays silence is worse than an
 * absent control, and a format populated with placeholder pieces to make a plan
 * item look closed is worse than both.
 */
import { getNarrationTrack } from '@/lib/audio/tracks'
import type { Activity } from '@/lib/audio/occasion'

export const LISTENING_FORMATS = [
  'devotional',
  'scripture-day',
  'office',
  'night',
  'lectio',
  'scripture-whole',
] as const

export type ListeningFormat = (typeof LISTENING_FORMATS)[number]

export interface FormatMeta {
  id: ListeningFormat
  /** How the format names itself to a listener. */
  title: string
  /** The occasion it exists for, in the listener's words. */
  occasion: string
  /** Typical run, in minutes, as [floor, ceiling]. */
  minutes: [number, number]
  /** Activities this format actually suits. */
  activities: readonly Activity[]
  /**
   * True when the format has no written twin — it is not a reading with a
   * voice attached, and could not be published as text without becoming a
   * different, worse thing.
   */
  audioNative: boolean
}

export const FORMAT_META: Record<ListeningFormat, FormatMeta> = {
  devotional: {
    id: 'devotional',
    title: 'A reading',
    occasion: 'Morning, or the commute',
    minutes: [7, 20],
    activities: ['commuting', 'working', 'walking'],
    audioNative: false,
  },
  'scripture-day': {
    id: 'scripture-day',
    title: 'A day of scripture',
    occasion: 'The daily habit',
    minutes: [10, 12],
    activities: ['commuting', 'working', 'walking', 'resting'],
    audioNative: false,
  },
  office: {
    id: 'office',
    title: 'The Office',
    occasion: 'The gap between things',
    minutes: [3, 6],
    activities: ['working', 'walking', 'resting'],
    audioNative: true,
  },
  night: {
    id: 'night',
    title: 'Night',
    occasion: 'Falling asleep',
    minutes: [30, 60],
    activities: ['resting'],
    audioNative: true,
  },
  lectio: {
    id: 'lectio',
    title: 'Lectio',
    occasion: 'Sitting still, deliberately',
    minutes: [10, 20],
    activities: ['resting'],
    audioNative: true,
  },
  'scripture-whole': {
    id: 'scripture-whole',
    title: 'A book, end to end',
    occasion: 'The long drive, or deep work',
    minutes: [40, 90],
    activities: ['commuting', 'working'],
    audioNative: false,
  },
}

/**
 * A piece of audio that belongs to a format rather than to a series day.
 *
 * Declared here, delivered by the render pipeline — the same split `SERIES_DATA`
 * and the manifest already use. A programme lists the pieces it intends to
 * have; `getNarrationTrack` decides which of them exist. That way a piece
 * appears the moment it is rendered, and there is never a second list to drift
 * out of step with the audio on disk.
 */
export interface AudioNativePiece {
  slug: string
  title: string
  format: ListeningFormat
  /** The programme it belongs to, for the player's second line. */
  context: string
}

/**
 * The audio-native catalogue.
 *
 * DELIBERATELY EMPTY. The Office, Night and Lectio are new writing and new
 * recording — the founder's voice, and in Night's case a score. That work has
 * not happened, and the honest state of a format whose content does not exist
 * is zero pieces, not invented ones. Every consumer below already handles an
 * empty set by rendering nothing.
 *
 * To deliver a piece: render it into the manifest under the slug named here,
 * and add its declaration. Nothing else needs to change.
 */
export const AUDIO_NATIVE_PIECES: readonly AudioNativePiece[] = []

/** The declared pieces of a format that actually have audio. */
export function deliveredPieces(format: ListeningFormat): AudioNativePiece[] {
  return AUDIO_NATIVE_PIECES.filter(
    (piece) =>
      piece.format === format && getNarrationTrack(piece.slug) !== null,
  )
}

/**
 * What each format currently has, measured rather than asserted.
 *
 * `declared` minus `delivered` is the honest size of the content gap, and it is
 * the number that should appear in any status report about listening breadth.
 */
export function formatCoverage(): Array<{
  format: ListeningFormat
  meta: FormatMeta
  declared: number
  delivered: number
}> {
  return LISTENING_FORMATS.map((format) => ({
    format,
    meta: FORMAT_META[format],
    declared: AUDIO_NATIVE_PIECES.filter((p) => p.format === format).length,
    delivered: deliveredPieces(format).length,
  }))
}
