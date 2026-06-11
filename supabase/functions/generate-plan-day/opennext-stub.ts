// Deno stand-in for '@opennextjs/cloudflare' (mapped via deno.json imports).
//
// The corpus loaders (getVerse, reference-index-loader, lexicon) try the
// Cloudflare ASSETS binding first and fall back to fs / self-fetch when it's
// unavailable. In the Supabase Edge runtime there is no Cloudflare context,
// so this stub throws — which is exactly the signal the loaders' try/catch
// expects before falling through to self-fetch.
export async function getCloudflareContext(): Promise<never> {
  throw new Error('not-on-cloudflare')
}
