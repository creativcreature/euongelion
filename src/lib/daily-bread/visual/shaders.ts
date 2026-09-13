/**
 * Daily Bread V2 — GLSL ES 1.00 sources for the live scene.
 *
 * WebGL1 only, no extensions, no libraries. Each fragment shader is the GPU
 * twin of `field.ts` followed by a halftone screen that matches the poster's
 * (`HALFTONE_SCREEN` in `poster.ts`): a lattice rotated 15°, one dot per cell
 * sized by the density at the cell centre. Every pixel checks its four
 * nearest cells, because a dense dot reaches past its own cell.
 *
 * The hash differs from the CPU one (GLSL ES 1.00 has no integer bit ops), so
 * the texture of the noise is not bit-identical with the poster. The
 * composition — horizon, subject, light, seed-driven placement — is.
 *
 * Uniforms: u_time (s), u_resolution (device px), u_seed (folded 0…1023),
 * u_paper / u_ink / u_spot (rgb 0…1), u_dotScale (cell size, device px).
 */
import type { ProceduralSceneId } from '@/lib/daily-bread/types'
import { FIELD_ASPECT } from './field'
import { HALFTONE_SCREEN } from './poster'

/** Always a GLSL float literal (`1` is an int in GLSL ES 1.00). */
function glf(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

export const VERTEX_SHADER = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const HEADER = `precision mediump float;
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define HP highp
#else
#define HP mediump
#endif

uniform HP float u_time;
uniform HP vec2 u_resolution;
uniform HP float u_seed;
uniform vec3 u_paper;
uniform vec3 u_ink;
uniform vec3 u_spot;
uniform HP float u_dotScale;

const float TAU = 6.28318530718;
const float ASPECT = ${glf(FIELD_ASPECT)};

HP vec2 g_seedOff;
float g_subjectX;
float g_phase;

HP float hash12(HP vec2 p) {
  HP vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

HP vec2 layer(float k) {
  return g_seedOff + vec2(k * 17.13, k * 9.71);
}

float vnoise(HP vec2 p, float k) {
  HP vec2 q = p + layer(k);
  HP vec2 i = floor(q);
  vec2 f = q - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(HP vec2 p, float k) {
  return (vnoise(p, k) * 0.5 + vnoise(p * 2.03, k + 1.0) * 0.25) / 0.75;
}

float fbm3(HP vec2 p, float k) {
  return (
    vnoise(p, k) * 0.5 +
    vnoise(p * 2.03, k + 1.0) * 0.25 +
    vnoise(p * 4.1209, k + 2.0) * 0.125
  ) / 0.875;
}

float gauss(float r2, float sigma) {
  return exp(-r2 / (2.0 * sigma * sigma));
}
`

const LIVING_WATER = `
float sceneField(vec2 uv, HP float t) {
  float x = uv.x;
  float y = uv.y;
  const float H = 0.3;
  if (y < H) {
    float rise = smoothstep(0.18, H, y);
    float haze = fbm2(vec2(x * 3.0 + t * 0.012, y * 6.0), 7.0);
    float sd = 0.13 * rise * rise + (haze - 0.5) * 0.1 * rise;
    float gx = (x - g_subjectX) * ASPECT;
    float gy = y - H;
    sd -= 0.1 * gauss(gx * gx + gy * gy, 0.09);
    return clamp(sd, 0.0, 1.0);
  }
  float depth = (y - H) / (1.0 - H);
  float z = 1.0 / (depth + 0.08);
  float drift = fbm2(vec2(x * 2.5, z * 0.35), 13.0);
  float w1 = sin(z * 12.0 + drift * 4.0 + g_phase - t * 0.32);
  float w2 = sin(z * 21.0 + x * 9.0 + drift * 3.0 - t * 0.51);
  float w3 = sin(z * 5.0 - x * 5.0 + g_phase * 0.5 - t * 0.23);
  float waves = w1 * 0.5 + w2 * 0.3 + w3 * 0.2;
  float calm = smoothstep(0.0, 0.18, depth);
  float d = 0.2 + 0.3 * depth + waves * (0.1 + 0.1 * depth) * calm;
  float sigma = 0.03 + 0.12 * depth;
  float px = x - g_subjectX;
  float path = gauss(px * px, sigma);
  d -= path * (0.12 + 0.34 * smoothstep(0.0, 0.9, waves));
  float hl = (y - H) / 0.01;
  d += 0.45 * exp(-hl * hl);
  return clamp(d, 0.0, 1.0);
}
`

const GRAIN = `
const float STALK_COLUMNS = 18.0;

float stalkInk(float x, float y, HP float t, float k) {
  float baseX = (k + 0.5 + (hash12(vec2(k, 11.0) + g_seedOff) - 0.5) * 0.5) / STALK_COLUMNS;
  float top = 0.52 + hash12(vec2(k, 17.0) + g_seedOff) * 0.2;
  if (y < top - 0.06) return 0.0;
  float lift = clamp((1.0 - y) / (1.0 - top), 0.0, 1.0);
  float sway = 0.012 * sin(t * 0.6 + k * 1.3 + g_phase) + 0.006 * sin(t * 0.37 + k * 0.7);
  float cx = baseX + sway * lift * lift;
  float stem = y > top ? 0.5 * (1.0 - smoothstep(0.006, 0.011, abs(x - cx))) : 0.0;
  float ex = (x - cx) / 0.012;
  float ey = (y - (top + 0.045)) / 0.06;
  float ear = 0.9 * (1.0 - smoothstep(0.7, 1.0, ex * ex + ey * ey));
  return max(stem, ear);
}

float sceneField(vec2 uv, HP float t) {
  float x = uv.x;
  float y = uv.y;
  const float H = 0.36;
  const float SUN_R = 0.1;
  float sunY = H - 0.13;
  float sx = (x - g_subjectX) * ASPECT;
  if (y < H) {
    float sy = y - sunY;
    float r = sqrt(sx * sx + sy * sy);
    float up = 1.0 - y / H;
    float sd = 0.14 + 0.22 * up * up;
    sd -= 0.1 * gauss(r * r, 0.2);
    float disc = 1.0 - smoothstep(SUN_R - 0.004, SUN_R + 0.004, r);
    sd = mix(sd, 0.0, disc);
    float shl = (y - H) / 0.007;
    sd += 0.3 * exp(-shl * shl);
    return clamp(sd, 0.0, 1.0);
  }
  float depth = (y - H) / (1.0 - H);
  float gust = sin(x * 6.0 - depth * 3.0 - t * 0.4 + g_phase) * 0.5 + 0.5;
  float rows = fbm2(vec2(x * 18.0, depth * 9.0 + t * 0.05), 23.0);
  float d = 0.18 + 0.24 * depth + (rows - 0.5) * 0.2;
  d -= 0.12 * smoothstep(0.55, 1.0, gust);
  float back = 1.0 - depth;
  d -= 0.2 * gauss(sx * sx, 0.25) * back * back;
  float k = floor(x * STALK_COLUMNS);
  float stalks = 0.0;
  for (int n = 0; n < 3; n++) {
    stalks = max(stalks, stalkInk(x, y, t, k + float(n) - 1.0));
  }
  d = max(d, stalks);
  float hl = (y - H) / 0.007;
  d += 0.3 * exp(-hl * hl);
  return clamp(d, 0.0, 1.0);
}
`

const WILDERNESS_STARS = `
float sceneField(vec2 uv, HP float t) {
  float x = uv.x;
  float y = uv.y;
  float px = (x - g_subjectX) * ASPECT;
  float peak = gauss(px * px, 0.22);
  float ridge = 0.8 - 0.14 * peak + (fbm3(vec2(x * 6.0, 0.5), 29.0) - 0.5) * 0.09;
  float land = smoothstep(ridge - 0.004, ridge + 0.004, y);

  float fall = min(1.0, y / 0.8);
  float sky = 0.64 - 0.26 * fall * fall;
  float slope = g_subjectX > 0.5 ? 0.55 : -0.55;
  float off = y - (0.3 + slope * (x - g_subjectX));
  float bandDist = off / sqrt(1.0 + slope * slope);
  float band = gauss(bandDist * bandDist, 0.1);
  float cloud = fbm3(vec2(x * 4.0 + y * 2.0, y * 5.0), 41.0);
  sky -= band * (0.12 + 0.22 * cloud);

  const float COLS = 34.0;
  const float ROWS = 17.0;
  float ci = floor(x * COLS);
  float cj = floor(y * ROWS);
  float chance = hash12(vec2(ci, cj) + layer(53.0));
  if (chance > 0.8 - 0.15 * band) {
    float jx = 0.25 + hash12(vec2(ci, cj) + layer(59.0)) * 0.5;
    float jy = 0.25 + hash12(vec2(ci, cj) + layer(61.0)) * 0.5;
    float b = hash12(vec2(ci, cj) + layer(67.0));
    float dx = (x - (ci + jx) / COLS) * ASPECT;
    float dy = y - (cj + jy) / ROWS;
    float radius = 0.006 + 0.012 * b * b;
    float twinkle = 0.75 + 0.25 * sin(t * (0.4 + b * 0.8) + b * TAU * 4.0);
    sky -= 0.9 * twinkle * gauss(dx * dx + dy * dy, radius);
  }
  float ly = y - 0.2;
  sky -= 0.95 * gauss(px * px + ly * ly, 0.024);

  float ground = 0.95 + (vnoise(vec2(x * 40.0, y * 20.0), 71.0) - 0.5) * 0.08;
  return clamp(mix(sky, ground, land), 0.0, 1.0);
}
`

const SCENE_SOURCES: Record<ProceduralSceneId, string> = {
  'living-water': LIVING_WATER,
  grain: GRAIN,
  'wilderness-stars': WILDERNESS_STARS,
}

function screenMain(): string {
  const angle = (HALFTONE_SCREEN.angleDeg * Math.PI) / 180
  const [spotLo, spotHi] = HALFTONE_SCREEN.spotBand
  const [mx, my] = HALFTONE_SCREEN.misregCells
  return `
const float ANGLE = ${glf(angle)};
const float R_MAX = ${glf(HALFTONE_SCREEN.rMax)};
const float MIN_DENSITY = ${glf(HALFTONE_SCREEN.minDensity)};
const float SPOT_RATE = ${glf(HALFTONE_SCREEN.spotRate)};
const float SPOT_LO = ${glf(spotLo)};
const float SPOT_HI = ${glf(spotHi)};
const vec2 MISREG = vec2(${glf(mx)}, ${glf(my)});
const float AA = 0.75;

void main() {
  g_seedOff = vec2(fract(u_seed * 0.6180339887) * 97.0, fract(u_seed * 0.7548776662) * 89.0);
  g_subjectX = (mod(u_seed, 2.0) < 0.5 ? 0.68 : 0.32) + (fract(u_seed * 0.6180339887) - 0.5) * 0.08;
  g_phase = fract(u_seed * 0.7548776662) * TAU;

  // Top-left origin, matching the poster and the field (y = 0 at the top).
  HP vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  HP float cell = max(u_dotScale, 3.0);
  float c = cos(ANGLE);
  float s = sin(ANGLE);
  // screen = R(a) * lattice, so lattice = R(-a) * screen.
  HP vec2 q = vec2(c * px.x + s * px.y, -s * px.x + c * px.y) / cell;
  HP vec2 base = floor(q - 0.5);

  float ink = 0.0;
  float spot = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      HP vec2 id = base + vec2(float(i), float(j));
      HP vec2 lc = (id + 0.5) * cell;
      HP vec2 sc = vec2(c * lc.x - s * lc.y, s * lc.x + c * lc.y);
      vec2 uv = clamp(sc / u_resolution, 0.0, 1.0);
      float d = sceneField(uv, u_time);
      float r = sqrt(d) * R_MAX * cell;
      float present = step(MIN_DENSITY, d);
      ink = max(ink, present * (1.0 - smoothstep(r - AA, r + AA, length(px - sc))));
#ifdef RISO
      float pick = hash12(id + g_seedOff * 1.37 + 17.0);
      if (pick < SPOT_RATE && d > SPOT_LO && d < SPOT_HI) {
        HP vec2 spotCentre = sc + MISREG * cell;
        spot = max(spot, 1.0 - smoothstep(r - AA, r + AA, length(px - spotCentre)));
      }
#endif
    }
  }

#ifdef RISO
  // Paper grain steps (never glides): a new speck pattern 1.5 times a second.
  HP float stepT = floor(u_time * 1.5);
  float grainN = hash12(floor(px / 2.0) + vec2(stepT * 7.31, stepT * 3.17) + g_seedOff);
  float speck = step(0.998, grainN) * (1.0 - spot);
  // Ink saturation varies across the sheet, the way a drum lays it down.
  float sat = vnoise(px / (cell * 9.0), 83.0);
  vec3 inkColour = mix(u_ink, u_paper, 0.1 * sat);
  vec3 colour = mix(u_paper, u_spot, spot);
  colour = mix(colour, inkColour, max(ink, speck));
#else
  vec3 colour = mix(u_paper, u_ink, ink);
#endif
  gl_FragColor = vec4(colour, 1.0);
}
`
}

/** The complete fragment shader for one scene printed by one renderer. */
export function fragmentShaderFor(
  scene: ProceduralSceneId,
  renderer: 'riso' | 'halftone',
): string {
  const define = renderer === 'riso' ? '#define RISO\n' : ''
  return define + HEADER + SCENE_SOURCES[scene] + screenMain()
}
