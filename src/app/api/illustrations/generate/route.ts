import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getIllustrationProvider,
  type GenerateIllustrationInput,
  type IllustrationStylePreset,
} from '@/lib/illustrations/provider'

const MAX_PROMPT_CHARS = 500
const MAX_REQUESTS_PER_MINUTE = 12
const STYLE_PRESETS = new Set<IllustrationStylePreset>([
  'woodblock',
  'halftone',
  'dither',
  'editorial',
])

const requestWindow = new Map<string, { count: number; resetAt: number }>()

const FALLBACK_ASSETS: Record<string, string> = {
  'home:hero': '/images/illustrations/euangelion-homepage-engraving-04.svg',
  'home:flow': '/images/illustrations/euangelion-homepage-engraving-05.svg',
  'home:featured': '/images/illustrations/euangelion-homepage-engraving-06.svg',
  'home:faq': '/images/illustrations/euangelion-homepage-engraving-07.svg',
  'wake-up:hero': '/images/illustrations/euangelion-homepage-engraving-08.svg',
  'series:hero': '/images/illustrations/euangelion-homepage-engraving-09.svg',
  'devotional:milestone':
    '/images/illustrations/euangelion-homepage-engraving-10.svg',
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/\s+/g, ' ').slice(0, MAX_PROMPT_CHARS)
}

function getClientId(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function enforceRateLimit(clientId: string): boolean {
  const now = Date.now()
  const current = requestWindow.get(clientId)

  if (!current || current.resetAt <= now) {
    requestWindow.set(clientId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (current.count >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }

  current.count += 1
  requestWindow.set(clientId, current)
  return true
}

function getFallbackAsset(page: string, sectionKey: string): string {
  return (
    FALLBACK_ASSETS[`${page}:${sectionKey}`] ||
    '/images/illustrations/placeholder-ink-block.svg'
  )
}

function extForMime(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('svg')) return 'svg'
  return 'png'
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  if (!enforceRateLimit(clientId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a minute.' },
      { status: 429 },
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const page = sanitizeText(payload.page)
  const sectionKey = sanitizeText(payload.sectionKey)
  const prompt = sanitizeText(payload.prompt)
  const rawStyle = sanitizeText(payload.stylePreset)

  const stylePreset: IllustrationStylePreset = STYLE_PRESETS.has(
    rawStyle as IllustrationStylePreset,
  )
    ? (rawStyle as IllustrationStylePreset)
    : 'editorial'

  const width = clamp(Number(payload.width) || 1400, 512, 2048)
  const height = clamp(Number(payload.height) || 980, 512, 2048)

  if (!page || !sectionKey || !prompt) {
    return NextResponse.json(
      { error: 'page, sectionKey, and prompt are required' },
      { status: 400 },
    )
  }

  const provider = getIllustrationProvider()
  const input: GenerateIllustrationInput = {
    page,
    sectionKey,
    prompt,
    stylePreset,
    width,
    height,
  }

  const fallbackAsset = getFallbackAsset(page, sectionKey)

  try {
    const generated = await provider.generate(input)
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({
        source: 'user-supplied',
        status: 'fallback_storage_unconfigured',
        provider: generated.provider,
        assetUrl: fallbackAsset,
        metadataId: null,
      })
    }

    const bucket = 'illustrations'
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => {
      return null
    })

    const extension = extForMime(generated.mimeType)
    const path = `${page}/${sectionKey}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    const upload = await supabase.storage
      .from(bucket)
      .upload(path, generated.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: generated.mimeType,
      })

    if (upload.error) {
      return NextResponse.json({
        source: 'user-supplied',
        status: 'fallback_upload_failed',
        provider: generated.provider,
        assetUrl: fallbackAsset,
        metadataId: null,
      })
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path)
      .data.publicUrl

    let metadataId: string | null = null
    const metadataInsert = await supabase
      .from('generated_illustrations')
      .insert({
        page,
        section_key: sectionKey,
        style_preset: stylePreset,
        prompt: generated.finalPrompt,
        provider: generated.provider,
        asset_url: publicUrl,
        width: generated.width,
        height: generated.height,
        status: 'generated',
      })
      .select('id')
      .single()

    if (!metadataInsert.error) {
      metadataId = (metadataInsert.data as { id?: string } | null)?.id || null
    }

    return NextResponse.json({
      source: 'generated',
      status: 'ok',
      provider: generated.provider,
      assetUrl: publicUrl,
      metadataId,
    })
  } catch (error) {
    console.error('illustrations.generate.error', {
      page,
      sectionKey,
      stylePreset,
      message: error instanceof Error ? error.message : 'unknown',
    })

    return NextResponse.json({
      source: 'user-supplied',
      status: 'fallback_generation_failed',
      provider: provider.name,
      assetUrl: fallbackAsset,
      metadataId: null,
    })
  }
}
