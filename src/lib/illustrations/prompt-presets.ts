import type {
  GenerateIllustrationInput,
  IllustrationStylePreset,
} from './provider'

const STYLE_DIRECTIVES: Record<IllustrationStylePreset, string> = {
  woodblock:
    'woodblock / linocut engraving style, strong contour lines, vintage print texture, no glow, no gradients',
  halftone:
    'newspaper halftone treatment, coarse screen dots, blue-ink press look, subtle registration imperfections',
  dither:
    'dithered monochrome editorial image, high contrast, print-era texture, restrained tonal range',
  editorial:
    'editorial illustration for long-form reading, cinematic but restrained, high legibility composition',
}

export function buildIllustrationPrompt(
  input: GenerateIllustrationInput,
): string {
  const base = [
    'Create a print-style illustration for Euangelion.',
    `Page context: ${input.page}.`,
    `Section: ${input.sectionKey}.`,
    `Creative direction: ${STYLE_DIRECTIVES[input.stylePreset]}.`,
    'Tone: reverent, honest, hopeful, spiritually grounded.',
    'Color treatment: blue ink on paper, with realistic print texture.',
    'Avoid UI text overlays; keep composition clear for headline + body copy nearby.',
    `Narrative seed: ${input.prompt}`,
  ]

  return base.join(' ')
}
