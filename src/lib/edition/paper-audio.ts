/**
 * The whole paper, read aloud (SA-114 / F-158).
 *
 * Founder: "Ideally the page has a full audio for the day as well, for all
 * the written non interactive sections of daily bread."
 *
 * The audio is rendered through Voicebox (the ruled voice for The Daily
 * Bread) by scripts/edition/render-paper-audio.sh and uploaded to Supabase
 * Storage; this manifest read is the page's only dependency. A day with no
 * rendered track simply has no listen-to-the-paper item — honest absence,
 * never a broken player.
 */

export interface PaperAudioEntry {
  src: string
  duration: number
  words: number
}

export async function getPaperAudio(
  dateIso: string,
): Promise<PaperAudioEntry | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  try {
    const res = await fetch(
      `${base}/storage/v1/object/public/edition-assets/pipeline/paper-audio.json`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    const manifest = (await res.json()) as Record<string, PaperAudioEntry>
    return manifest[dateIso] ?? null
  } catch {
    return null
  }
}
