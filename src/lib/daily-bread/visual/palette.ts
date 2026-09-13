/**
 * The Daily Bread V2 scene palette — two-colour risograph.
 *
 * Light: deep cobalt ink on cream stock. Dark: cream ink on navy stock. One
 * crimson spot, printed sparingly as a misregistered second plate. There is no
 * grey anywhere in this file on purpose: tone is dot size, never a tint.
 *
 * These hex values mirror the live tokens (`--mock-paper`, `--mock-blue`,
 * `--mock-ink`, `--color-crimson`). They exist as literals only because the
 * GPU and the server-rendered OG poster cannot read CSS custom properties.
 */

export interface ScenePaletteColors {
  paper: string
  ink: string
  spot: string
}

export const SCENE_PALETTE: {
  readonly light: ScenePaletteColors
  readonly dark: ScenePaletteColors
} = {
  light: { paper: '#f5eee3', ink: '#1f2a8d', spot: '#c4192e' },
  dark: { paper: '#171b69', ink: '#efe5d8', spot: '#c4192e' },
}

export type SceneTheme = keyof typeof SCENE_PALETTE

/** `#rgb` or `#rrggbb` → linear-free [0,1] channels, as GLSL uniforms want. */
export function hexToRgb01(hex: string): [number, number, number] {
  const raw = hex.trim().replace(/^#/, '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`[daily-bread:visual] not a hex colour: ${hex}`)
  }
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
