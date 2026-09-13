/**
 * Daily Bread V2 — the scene fields.
 *
 * A field answers one question: how much INK belongs at this point? 0 is clean
 * paper, 1 is solid ink. Everything downstream (the GPU halftone, the static
 * SVG poster, the ASCII frame) is a different way of printing the same number,
 * which is why the poster underneath and the live canvas on top line up.
 *
 * Pure and deterministic: no DOM, no Math.random, no Date. The same scene,
 * point, time and seed always give the same density. `shaders.ts` carries the
 * GLSL twin of each field; keep the two in step when a scene changes.
 *
 * Coordinates are normalised: x and y in [0,1], y = 0 at the TOP. The scenes
 * are composed for the default 2:1 frame (`FIELD_ASPECT`).
 */
import type { ProceduralSceneId } from '@/lib/daily-bread/types'

/** The frame the scenes are composed for (width / height). */
export const FIELD_ASPECT = 2

const TAU = Math.PI * 2

/* ── Small maths ─────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function fract(v: number): number {
  return v - Math.floor(v)
}

/* ── Seeded value noise ──────────────────────────────────────────────── */

/** Integer lattice hash → [0,1). Seeded; stable across platforms. */
export function hash2(ix: number, iy: number, seed: number): number {
  let h =
    Math.imul(ix | 0, 0x27d4eb2d) ^
    Math.imul(iy | 0, 0x165667b1) ^
    Math.imul((seed | 0) + 0x632be5ab, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Bilinear value noise with a smoothstep fade, in [0,1). */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return mix(mix(a, b, ux), mix(c, d, ux), uy)
}

/** Fractal sum of value noise, normalised back into [0,1). */
export function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = x
  let fy = y
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(fx, fy, seed + o * 101) * amp
    norm += amp
    amp *= 0.5
    fx *= 2.03
    fy *= 2.03
  }
  return sum / norm
}

/* ── Seed → composition ──────────────────────────────────────────────── */

/**
 * Seeds are folded into 0…1023 so the GPU (which only has floats) derives
 * exactly the same composition as the CPU.
 */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0
  return Math.floor(Math.abs(seed)) % 1024
}

export interface SeedParams {
  /** The folded seed. */
  s: number
  /** Where the one off-centre subject sits, 0…1 across the frame. */
  subjectX: number
  /** A phase offset so two seeds never move in step. */
  phase: number
}

/** The composition decisions a seed makes. Mirrored in GLSL. */
export function seedParams(seed: number): SeedParams {
  const s = normalizeSeed(seed)
  const side = s % 2 === 0 ? 0.68 : 0.32
  const jitter = (fract(s * 0.6180339887) - 0.5) * 0.08
  return { s, subjectX: side + jitter, phase: fract(s * 0.7548776662) * TAU }
}

/* ── The scenes ──────────────────────────────────────────────────────── */

/**
 * Living Water — layered slow waves under a high horizon, with a soft path of
 * light laid across the water from an off-centre source.
 */
function livingWater(x: number, y: number, t: number, p: SeedParams): number {
  const horizon = 0.3
  if (y < horizon) {
    // Sky: negative space. A faint haze gathers toward the horizon and parts
    // over the light.
    const rise = smoothstep(0.18, horizon, y)
    const haze = fbm(x * 3 + t * 0.012, y * 6, p.s + 7, 2)
    let d = 0.13 * rise * rise + (haze - 0.5) * 0.1 * rise
    const gx = (x - p.subjectX) * FIELD_ASPECT
    const gy = y - horizon
    d -= 0.1 * Math.exp(-(gx * gx + gy * gy) / (2 * 0.09 * 0.09))
    return clamp01(d)
  }
  const depth = (y - horizon) / (1 - horizon) // 0 at horizon, 1 at the viewer
  const z = 1 / (depth + 0.08) // perspective: rows crowd toward the horizon
  const drift = fbm(x * 2.5, z * 0.35, p.s + 13, 2)
  const w1 = Math.sin(z * 12 + drift * 4 + p.phase - t * 0.32)
  const w2 = Math.sin(z * 21 + x * 9 + drift * 3 - t * 0.51)
  const w3 = Math.sin(z * 5 - x * 5 + p.phase * 0.5 - t * 0.23)
  const waves = w1 * 0.5 + w2 * 0.3 + w3 * 0.2
  const calm = smoothstep(0, 0.18, depth) // distant water reads as tone
  let d = 0.2 + 0.3 * depth + waves * (0.1 + 0.1 * depth) * calm
  // The light path widens toward the viewer and glitters on the crests.
  const sigma = 0.03 + 0.12 * depth
  const px = x - p.subjectX
  const path = Math.exp(-(px * px) / (2 * sigma * sigma))
  d -= path * (0.12 + 0.34 * smoothstep(0, 0.9, waves))
  // The horizon itself: one thin printed line.
  const hl = (y - horizon) / 0.01
  d += 0.45 * Math.exp(-hl * hl)
  return clamp01(d)
}

/** One foreground stalk's contribution (stem + ear) for column k. */
function stalkInk(
  x: number,
  y: number,
  t: number,
  k: number,
  p: SeedParams,
): number {
  const columns = STALK_COLUMNS
  const baseX = (k + 0.5 + (hash2(k, 11, p.s) - 0.5) * 0.5) / columns
  const top = 0.52 + hash2(k, 17, p.s) * 0.2
  if (y < top - 0.06) return 0
  const lift = clamp01((1 - y) / (1 - top)) // 0 at the ground, 1 at the ear
  const sway =
    0.012 * Math.sin(t * 0.6 + k * 1.3 + p.phase) +
    0.006 * Math.sin(t * 0.37 + k * 0.7)
  const cx = baseX + sway * lift * lift
  const stem =
    y > top ? 0.5 * (1 - smoothstep(0.006, 0.011, Math.abs(x - cx))) : 0
  const ex = (x - cx) / 0.012
  const ey = (y - (top + 0.045)) / 0.06
  const ear = 0.9 * (1 - smoothstep(0.7, 1, ex * ex + ey * ey))
  return Math.max(stem, ear)
}

/** How many near stalks stand across the frame. */
const STALK_COLUMNS = 18

/** Grain — a wheat field of swaying stalks under a low, off-centre sun. */
function grain(x: number, y: number, t: number, p: SeedParams): number {
  const horizon = 0.36
  const sunR = 0.1
  const sunY = horizon - 0.13
  const sx = (x - p.subjectX) * FIELD_ASPECT
  if (y < horizon) {
    const sy = y - sunY
    const r = Math.sqrt(sx * sx + sy * sy)
    const up = 1 - y / horizon
    // The sky darkens away from the light; the sun is clean paper.
    let d = 0.14 + 0.22 * up * up
    d -= 0.1 * Math.exp(-(r * r) / (2 * 0.2 * 0.2))
    const disc = 1 - smoothstep(sunR - 0.004, sunR + 0.004, r)
    d = mix(d, 0, disc)
    const hl = (y - horizon) / 0.007
    d += 0.3 * Math.exp(-hl * hl)
    return clamp01(d)
  }
  const depth = (y - horizon) / (1 - horizon)
  // Wind rolls light across the heads in slow bands.
  const gust = Math.sin(x * 6 - depth * 3 - t * 0.4 + p.phase) * 0.5 + 0.5
  const rows = fbm(x * 18, depth * 9 + t * 0.05, p.s + 23, 2)
  let d = 0.18 + 0.24 * depth + (rows - 0.5) * 0.2
  d -= 0.12 * smoothstep(0.55, 1, gust)
  // Backlight: the field is brightest under the sun.
  const back = 1 - depth
  d -= 0.2 * Math.exp(-(sx * sx) / (2 * 0.25 * 0.25)) * back * back
  // The near stalks stand in front of the field.
  const k = Math.floor(x * STALK_COLUMNS)
  let stalks = 0
  for (let n = k - 1; n <= k + 1; n++) {
    stalks = Math.max(stalks, stalkInk(x, y, t, n, p))
  }
  d = Math.max(d, stalks)
  const hl = (y - horizon) / 0.007
  d += 0.3 * Math.exp(-hl * hl)
  return clamp01(d)
}

/**
 * Wilderness Stars — a night sky of stars with a faint milky band, over a dark
 * ridge that rises to one off-centre peak.
 */
function wildernessStars(
  x: number,
  y: number,
  t: number,
  p: SeedParams,
): number {
  const px = (x - p.subjectX) * FIELD_ASPECT
  const peak = Math.exp(-(px * px) / (2 * 0.22 * 0.22))
  const ridge = 0.8 - 0.14 * peak + (fbm(x * 6, 0.5, p.s + 29, 3) - 0.5) * 0.09
  const land = smoothstep(ridge - 0.004, ridge + 0.004, y)

  // Sky: heaviest ink overhead, lifting toward a faint glow on the ridge.
  const fall = Math.min(1, y / 0.8)
  let sky = 0.64 - 0.26 * fall * fall
  // The milky band crosses the sky above the peak.
  const slope = p.subjectX > 0.5 ? 0.55 : -0.55
  const off = y - (0.3 + slope * (x - p.subjectX))
  const bandDist = off / Math.sqrt(1 + slope * slope)
  const band = Math.exp(-(bandDist * bandDist) / (2 * 0.1 * 0.1))
  const cloud = fbm(x * 4 + y * 2, y * 5, p.s + 41, 3)
  sky -= band * (0.12 + 0.22 * cloud)

  // Stars: one chance per lattice cell, likelier inside the band.
  const cols = 34
  const rows = 17
  const ci = Math.floor(x * cols)
  const cj = Math.floor(y * rows)
  const chance = hash2(ci, cj, p.s + 53)
  if (chance > 0.8 - 0.15 * band) {
    const jx = 0.25 + hash2(ci, cj, p.s + 59) * 0.5
    const jy = 0.25 + hash2(ci, cj, p.s + 61) * 0.5
    const b = hash2(ci, cj, p.s + 67)
    const dx = (x - (ci + jx) / cols) * FIELD_ASPECT
    const dy = y - (cj + jy) / rows
    const radius = 0.006 + 0.012 * b * b
    const twinkle = 0.75 + 0.25 * Math.sin(t * (0.4 + b * 0.8) + b * TAU * 4)
    sky -=
      0.9 * twinkle * Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius))
  }
  // The one bright star, above the peak: the single light in the frame.
  const lx = px
  const ly = y - 0.2
  sky -= 0.95 * Math.exp(-(lx * lx + ly * ly) / (2 * 0.024 * 0.024))

  const ground = 0.95 + (valueNoise(x * 40, y * 20, p.s + 71) - 0.5) * 0.08
  return clamp01(mix(sky, ground, land))
}

/**
 * Ink density in [0,1] for a scene at normalised (x, y), time `t` seconds.
 * Same inputs → same output, always.
 */
export function sceneField(
  scene: ProceduralSceneId,
  x: number,
  y: number,
  t: number,
  seed: number,
): number {
  const p = seedParams(seed)
  const cx = clamp01(x)
  const cy = clamp01(y)
  const time = Number.isFinite(t) ? t : 0
  switch (scene) {
    case 'living-water':
      return livingWater(cx, cy, time, p)
    case 'grain':
      return grain(cx, cy, time, p)
    case 'wilderness-stars':
      return wildernessStars(cx, cy, time, p)
  }
}
