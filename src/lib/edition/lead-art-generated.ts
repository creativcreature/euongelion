/**
 * The generated daily lead plate (SA-114 / F-158). Founder: "the main
 * image for the Daily Bread needs to be created from /imagen not one
 * onfile." scripts/edition/generate-lead-art.mjs draws one per edition;
 * this reads the manifest. Missing day = the caller falls back to the
 * Vasari pick, then series art — honest absence, never a broken plate.
 */

export interface GeneratedLeadArt {
  src: string
  width: number
  height: number
  subject: string
  alt: string
}

export async function getGeneratedLeadArt(
  dateIso: string,
): Promise<GeneratedLeadArt | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  try {
    const res = await fetch(
      `${base}/storage/v1/object/public/edition-assets/pipeline/lead-art.json`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    const manifest = (await res.json()) as Record<string, GeneratedLeadArt>
    return manifest[dateIso] ?? null
  } catch {
    return null
  }
}
