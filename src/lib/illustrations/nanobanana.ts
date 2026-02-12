import type {
  GeneratedIllustration,
  GenerateIllustrationInput,
  IllustrationProvider,
} from './provider'
import { buildIllustrationPrompt } from './prompt-presets'

type NanoBananaConfig = {
  apiKey?: string
  apiUrl?: string
}

interface NanoBananaResponse {
  data?: Array<{ b64_json?: string; mime_type?: string }>
  image_base64?: string
  b64_json?: string
  mime_type?: string
}

export class NanoBananaIllustrationProvider implements IllustrationProvider {
  name = 'nanobanana'

  private readonly apiKey?: string
  private readonly apiUrl?: string

  constructor(config: NanoBananaConfig) {
    this.apiKey = config.apiKey
    this.apiUrl = config.apiUrl
  }

  async generate(
    input: GenerateIllustrationInput,
  ): Promise<GeneratedIllustration> {
    if (!this.apiKey) {
      throw new Error('NANOBANANA_API_KEY is not configured')
    }

    if (!this.apiUrl) {
      throw new Error('NANOBANANA_API_URL is not configured')
    }

    const finalPrompt = buildIllustrationPrompt(input)

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        width: input.width,
        height: input.height,
        response_format: 'b64_json',
        style: input.stylePreset,
      }),
    })

    if (!response.ok) {
      throw new Error(`Nano-Banana generation failed (${response.status})`)
    }

    const payload = (await response.json()) as NanoBananaResponse

    const base64 =
      payload.data?.[0]?.b64_json || payload.image_base64 || payload.b64_json

    if (!base64) {
      throw new Error('Nano-Banana response missing image payload')
    }

    const mimeType =
      payload.data?.[0]?.mime_type || payload.mime_type || 'image/png'

    return {
      buffer: Buffer.from(base64, 'base64'),
      mimeType,
      width: input.width,
      height: input.height,
      finalPrompt,
      provider: this.name,
    }
  }
}
