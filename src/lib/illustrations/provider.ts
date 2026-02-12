import { NanoBananaIllustrationProvider } from '@/lib/illustrations/nanobanana'

export type IllustrationStylePreset =
  | 'woodblock'
  | 'halftone'
  | 'dither'
  | 'editorial'

export interface GenerateIllustrationInput {
  page: string
  sectionKey: string
  prompt: string
  stylePreset: IllustrationStylePreset
  width: number
  height: number
}

export interface GeneratedIllustration {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
  finalPrompt: string
  provider: string
}

export interface IllustrationProvider {
  name: string
  generate(input: GenerateIllustrationInput): Promise<GeneratedIllustration>
}

export function getIllustrationProvider(): IllustrationProvider {
  return new NanoBananaIllustrationProvider({
    apiKey: process.env.NANOBANANA_API_KEY,
    apiUrl: process.env.NANOBANANA_API_URL,
  })
}
