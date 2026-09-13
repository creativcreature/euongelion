/**
 * Daily Bread V2 — the WebGL1 scene renderer.
 *
 * One full-screen triangle, one fragment shader, no libraries, no extensions,
 * no eval, no workers, no fetches. It either comes up whole or returns null
 * with one console warning, and the caller keeps the static poster. It never
 * throws.
 */
import type { ProceduralSceneId } from '@/lib/daily-bread/types'
import { normalizeSeed } from './field'
import { hexToRgb01, type ScenePaletteColors } from './palette'
import { POSTER_DEFAULTS } from './poster'
import { VERTEX_SHADER, fragmentShaderFor } from './shaders'

export interface SceneRenderer {
  /** Draw one frame at `timeSec`, into a drawing buffer of width × height. */
  render(timeSec: number, width: number, height: number): void
  /** Release the program, shaders and buffer. The context itself is kept. */
  dispose(): void
  readonly gl: WebGLRenderingContext
}

const UNIFORMS = [
  'u_time',
  'u_resolution',
  'u_seed',
  'u_paper',
  'u_ink',
  'u_spot',
  'u_dotScale',
] as const

type UniformName = (typeof UNIFORMS)[number]

/** The smallest dot pitch worth drawing, in device px. */
const MIN_DOT_SCALE = 4

function warn(message: string): void {
  console.warn(`[daily-bread:visual] ${message}`)
}

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): { shader: WebGLShader | null; error: string | null } {
  const shader = gl.createShader(type)
  if (!shader) return { shader: null, error: 'createShader returned null' }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'no info log'
    gl.deleteShader(shader)
    return { shader: null, error: log }
  }
  return { shader, error: null }
}

/**
 * Build a renderer for one scene. Returns null — after a single
 * `console.warn` — when WebGL is unavailable or the program will not build.
 */
export function createSceneRenderer(
  canvas: HTMLCanvasElement,
  scene: ProceduralSceneId,
  renderer: 'riso' | 'halftone',
  seed: number,
  palette: ScenePaletteColors,
): SceneRenderer | null {
  let gl: WebGLRenderingContext | null = null
  try {
    gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    })
  } catch {
    gl = null
  }
  if (!gl || gl.isContextLost()) {
    warn('WebGL is unavailable; keeping the static poster.')
    return null
  }
  const context: WebGLRenderingContext = gl

  const vertex = compile(context, context.VERTEX_SHADER, VERTEX_SHADER)
  if (!vertex.shader) {
    warn(`vertex shader failed to compile: ${vertex.error}`)
    return null
  }
  const fragment = compile(
    context,
    context.FRAGMENT_SHADER,
    fragmentShaderFor(scene, renderer),
  )
  if (!fragment.shader) {
    context.deleteShader(vertex.shader)
    warn(
      `fragment shader (${scene}/${renderer}) failed to compile: ${fragment.error}`,
    )
    return null
  }

  const program = context.createProgram()
  if (!program) {
    context.deleteShader(vertex.shader)
    context.deleteShader(fragment.shader)
    warn('createProgram returned null.')
    return null
  }
  context.attachShader(program, vertex.shader)
  context.attachShader(program, fragment.shader)
  context.linkProgram(program)
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const log = context.getProgramInfoLog(program) ?? 'no info log'
    context.deleteProgram(program)
    context.deleteShader(vertex.shader)
    context.deleteShader(fragment.shader)
    warn(`program failed to link: ${log}`)
    return null
  }

  const buffer = context.createBuffer()
  if (!buffer) {
    context.deleteProgram(program)
    context.deleteShader(vertex.shader)
    context.deleteShader(fragment.shader)
    warn('createBuffer returned null.')
    return null
  }
  // One triangle that covers the whole clip square.
  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    context.STATIC_DRAW,
  )
  const position = context.getAttribLocation(program, 'a_position')

  const locations = {} as Record<UniformName, WebGLUniformLocation | null>
  for (const name of UNIFORMS) {
    locations[name] = context.getUniformLocation(program, name)
  }

  context.useProgram(program)
  const paper = hexToRgb01(palette.paper)
  const ink = hexToRgb01(palette.ink)
  const spot = hexToRgb01(palette.spot)
  context.uniform3f(locations.u_paper, paper[0], paper[1], paper[2])
  context.uniform3f(locations.u_ink, ink[0], ink[1], ink[2])
  context.uniform3f(locations.u_spot, spot[0], spot[1], spot[2])
  context.uniform1f(locations.u_seed, normalizeSeed(seed))

  const vertexShader = vertex.shader
  const fragmentShader = fragment.shader
  let disposed = false

  return {
    gl: context,
    render(timeSec: number, width: number, height: number): void {
      if (disposed || context.isContextLost()) return
      const w = Math.max(1, Math.round(width))
      const h = Math.max(1, Math.round(height))
      // Match the poster's pitch: it is drawn with `slice`, i.e. scaled to
      // cover, so the dot cell scales by the larger of the two ratios.
      const cover = Math.max(
        w / POSTER_DEFAULTS.width,
        h / POSTER_DEFAULTS.height,
      )
      const dotScale = Math.max(MIN_DOT_SCALE, POSTER_DEFAULTS.cell * cover)
      context.viewport(0, 0, w, h)
      context.useProgram(program)
      context.bindBuffer(context.ARRAY_BUFFER, buffer)
      context.enableVertexAttribArray(position)
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
      context.uniform1f(
        locations.u_time,
        Number.isFinite(timeSec) ? timeSec : 0,
      )
      context.uniform2f(locations.u_resolution, w, h)
      context.uniform1f(locations.u_dotScale, dotScale)
      context.drawArrays(context.TRIANGLES, 0, 3)
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      if (context.isContextLost()) return
      context.deleteBuffer(buffer)
      context.detachShader(program, vertexShader)
      context.detachShader(program, fragmentShader)
      context.deleteShader(vertexShader)
      context.deleteShader(fragmentShader)
      context.deleteProgram(program)
    },
  }
}
