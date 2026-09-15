/**
 * Daily Bread V2 — the procedural visual engine (SA-142 / F-184).
 *
 * Pure parts are asserted directly (fields, poster, ASCII, frame gate, shader
 * sources). The WebGL renderer is exercised against a null context (jsdom has
 * no WebGL) and a minimal fake context. The component is rendered in jsdom:
 * poster always, canvas only when motion is allowed and a renderer comes up.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProceduralSceneId } from '@/lib/daily-bread/types'
import {
  fbm,
  hash2,
  normalizeSeed,
  sceneField,
  seedParams,
  valueNoise,
} from '@/lib/daily-bread/visual/field'
import { SCENE_PALETTE, hexToRgb01 } from '@/lib/daily-bread/visual/palette'
import {
  MAX_POSTER_DOTS,
  scenePosterDots,
  scenePosterSvg,
} from '@/lib/daily-bread/visual/poster'
import {
  ASCII_RAMP,
  asciiFrame,
  drawAsciiFrame,
} from '@/lib/daily-bread/visual/ascii'
import {
  createFrameGate,
  effectiveDpr,
  shouldAnimate,
} from '@/lib/daily-bread/visual/loop'
import {
  VERTEX_SHADER,
  fragmentShaderFor,
} from '@/lib/daily-bread/visual/shaders'
import { createSceneRenderer } from '@/lib/daily-bread/visual/webgl'

const motion = vi.hoisted(() => ({ override: null as boolean | null }))

vi.mock('@/providers/AnimationProvider', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/providers/AnimationProvider')>()
  return {
    ...actual,
    useAnimation: () => {
      const real = actual.useAnimation()
      return motion.override === null
        ? real
        : { ...real, shouldAnimate: motion.override }
    },
  }
})

// Imported after the mock is registered.
import ProceduralScene, { sceneTimeStep } from '@/components/daily-bread/visual/ProceduralScene'

const SCENES: ProceduralSceneId[] = [
  'living-water',
  'grain',
  'wilderness-stars',
]
const SEEDS = [0, 7, 1023, 123456789]

/* ── Fields ──────────────────────────────────────────────────────────── */

describe('sceneField', () => {
  it.each(SCENES)('%s is deterministic and stays in [0,1]', (scene) => {
    for (const seed of SEEDS) {
      for (const t of [0, 3.7, 600]) {
        for (let j = 0; j <= 12; j++) {
          for (let i = 0; i <= 24; i++) {
            const x = i / 24
            const y = j / 12
            const a = sceneField(scene, x, y, t, seed)
            const b = sceneField(scene, x, y, t, seed)
            expect(a).toBe(b)
            expect(Number.isFinite(a)).toBe(true)
            expect(a).toBeGreaterThanOrEqual(0)
            expect(a).toBeLessThanOrEqual(1)
          }
        }
      }
    }
  })

  it.each(SCENES)(
    '%s clamps out-of-range input instead of failing',
    (scene) => {
      for (const [x, y, t] of [
        [-1, -1, 0],
        [2, 2, 0],
        [0.5, 0.5, Number.NaN],
      ]) {
        const v = sceneField(scene, x, y, t, 3)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    },
  )

  it.each(SCENES)('%s changes with the seed and with time', (scene) => {
    let seedDiff = 0
    let timeDiff = 0
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < 20; i++) {
        const x = (i + 0.5) / 20
        const y = (j + 0.5) / 10
        seedDiff += Math.abs(
          sceneField(scene, x, y, 0, 2) - sceneField(scene, x, y, 0, 3),
        )
        timeDiff += Math.abs(
          sceneField(scene, x, y, 0, 2) - sceneField(scene, x, y, 9, 2),
        )
      }
    }
    expect(seedDiff).toBeGreaterThan(0.5)
    expect(timeDiff).toBeGreaterThan(0.5)
  })

  it('noise helpers are seeded, deterministic and bounded', () => {
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5))
    expect(hash2(3, 4, 5)).not.toBe(hash2(3, 4, 6))
    for (let i = 0; i < 200; i++) {
      const h = hash2(i, -i, 11)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
      const n = valueNoise(i * 0.37, i * 0.11, 9)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
      const f = fbm(i * 0.21, i * 0.07, 9, 3)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
    }
  })

  it('seeds fold into 0…1023 and place the subject off centre', () => {
    expect(normalizeSeed(1024)).toBe(0)
    expect(normalizeSeed(-5)).toBe(5)
    expect(normalizeSeed(Number.NaN)).toBe(0)
    for (const seed of SEEDS) {
      const { subjectX } = seedParams(seed)
      expect(Math.abs(subjectX - 0.5)).toBeGreaterThan(0.1)
    }
  })
})

/* ── Palette ─────────────────────────────────────────────────────────── */

describe('palette', () => {
  it('holds the two-colour riso palette', () => {
    expect(SCENE_PALETTE.light).toEqual({
      paper: '#f5eee3',
      ink: '#1f2a8d',
      spot: '#c4192e',
    })
    expect(SCENE_PALETTE.dark).toEqual({
      paper: '#171b69',
      ink: '#efe5d8',
      spot: '#c4192e',
    })
  })

  it('converts hex to 0…1 channels', () => {
    expect(hexToRgb01('#ffffff')).toEqual([1, 1, 1])
    expect(hexToRgb01('#000')).toEqual([0, 0, 0])
    const [r, g, b] = hexToRgb01('#1f2a8d')
    expect(r).toBeCloseTo(31 / 255)
    expect(g).toBeCloseTo(42 / 255)
    expect(b).toBeCloseTo(141 / 255)
    expect(() => hexToRgb01('blue')).toThrow()
  })
})

/* ── Poster ──────────────────────────────────────────────────────────── */

describe('scene poster', () => {
  it.each(SCENES)('%s poster is deterministic and capped', (scene) => {
    const a = scenePosterDots(scene, 42)
    const b = scenePosterDots(scene, 42)
    expect(a).toEqual(b)
    expect(a.width).toBe(1200)
    expect(a.height).toBe(600)
    expect(a.dots.length).toBeGreaterThan(200)
    expect(a.dots.length).toBeLessThanOrEqual(MAX_POSTER_DOTS)
    for (const dot of a.dots) {
      for (const v of [dot.cx, dot.cy, dot.r]) {
        expect(Number.isFinite(v)).toBe(true)
        expect(Math.round(v * 10) / 10).toBe(v)
      }
      expect(dot.r).toBeGreaterThan(0)
    }
  })

  it('never exceeds the dot cap, even when asked for a fine screen', () => {
    const fine = scenePosterDots('living-water', 5, { cell: 3 })
    expect(fine.dots.length).toBeLessThanOrEqual(MAX_POSTER_DOTS)
    expect(fine.cell).toBeGreaterThan(3)
  })

  it('prints the crimson plate sparingly', () => {
    const { dots } = scenePosterDots('grain', 11)
    const spots = dots.filter((d) => d.spot).length
    expect(spots).toBeGreaterThan(0)
    expect(spots / dots.length).toBeLessThan(0.1)
  })

  it.each(SCENES)('%s SVG string is safe and standalone', (scene) => {
    const svg = scenePosterSvg(scene, 42)
    expect(svg).toBe(scenePosterSvg(scene, 42))
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('viewBox="0 0 1200 600"')
    const tags = new Set(
      Array.from(svg.matchAll(/<\/?([a-zA-Z][\w:-]*)/g), (m) => m[1]),
    )
    expect([...tags].sort()).toEqual(['circle', 'rect', 'svg'])
    expect(svg).not.toMatch(/script/i)
    expect(svg).not.toMatch(/href/i)
    expect(svg).not.toMatch(/\son[a-z]+\s*=/i)
    expect(svg).not.toMatch(/url\(|javascript:|<!|\?>/i)
    // Every attribute value is a number or a hex colour.
    for (const m of svg.matchAll(/\s([a-zA-Z:-]+)="([^"]*)"/g)) {
      const [, name, value] = m
      if (name === 'xmlns') continue
      if (name === 'viewBox') {
        expect(value).toMatch(/^[\d. ]+$/)
        continue
      }
      expect(value).toMatch(/^(-?\d+(\.\d)?|#[0-9a-f]{6})$/)
    }
  })

  it('uses the dark palette when asked', () => {
    const svg = scenePosterSvg('wilderness-stars', 1, { theme: 'dark' })
    expect(svg).toContain('fill="#171b69"')
    expect(svg).toContain('fill="#efe5d8"')
    expect(svg).not.toContain('#f5eee3')
  })
})

/* ── ASCII ───────────────────────────────────────────────────────────── */

describe('ascii renderer', () => {
  it.each(SCENES)('%s frame has the asked dimensions', (scene) => {
    const lines = asciiFrame(scene, 9, 0, 40, 12)
    expect(lines).toHaveLength(12)
    for (const line of lines) {
      expect(line).toHaveLength(40)
      for (const ch of line) expect(ASCII_RAMP).toContain(ch)
    }
    expect(asciiFrame(scene, 9, 0, 40, 12)).toEqual(lines)
  })

  it('handles an empty grid', () => {
    expect(asciiFrame('grain', 1, 0, 0, 0)).toEqual([])
  })

  it('draws paper then glyphs, skipping spaces', () => {
    const calls: string[] = []
    const ctx = {
      fillStyle: '',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(() => calls.push('rect')),
      fillText: vi.fn(() => calls.push('text')),
    } as unknown as CanvasRenderingContext2D
    drawAsciiFrame(ctx, [' @', '. '], {
      width: 100,
      height: 50,
      ink: '#1f2a8d',
      paper: '#f5eee3',
      font: '12px monospace',
    })
    expect(calls).toEqual(['rect', 'text', 'text'])
    expect(ctx.fillText).toHaveBeenCalledWith('@', 75, 12.5)
    expect(ctx.fillText).toHaveBeenCalledWith('.', 25, 37.5)
  })
})

/* ── Loop ────────────────────────────────────────────────────────────── */

describe('frame scheduling', () => {
  function countRenders(gate: ReturnType<typeof createFrameGate>, hz: number) {
    let rendered = 0
    const step = 1000 / hz
    for (let now = 0; now < 1000; now += step) {
      if (gate.shouldRender(now)) rendered++
    }
    return rendered
  }

  it('caps a 60 Hz stream at 30 fps', () => {
    const n = countRenders(createFrameGate(30), 60)
    expect(n).toBeGreaterThanOrEqual(29)
    expect(n).toBeLessThanOrEqual(31)
  })

  it('caps a 144 Hz stream at no more than 30 fps', () => {
    const n = countRenders(createFrameGate(30), 144)
    expect(n).toBeGreaterThanOrEqual(24)
    expect(n).toBeLessThanOrEqual(31)
  })

  it('falls back to 30 fps for a nonsense cap, and reset admits the next frame', () => {
    expect(countRenders(createFrameGate(0), 120)).toBeLessThanOrEqual(31)
    expect(countRenders(createFrameGate(Number.NaN), 120)).toBeLessThanOrEqual(
      31,
    )
    const gate = createFrameGate(30)
    expect(gate.shouldRender(100)).toBe(true)
    expect(gate.shouldRender(110)).toBe(false)
    gate.reset()
    expect(gate.shouldRender(110)).toBe(true)
  })

  it('does not burst after a long pause', () => {
    const gate = createFrameGate(30)
    expect(gate.shouldRender(0)).toBe(true)
    expect(gate.shouldRender(5000)).toBe(true)
    expect(gate.shouldRender(5010)).toBe(false)
  })

  it('caps the device pixel ratio', () => {
    expect(effectiveDpr(3)).toBe(1.5)
    expect(effectiveDpr(1)).toBe(1)
    expect(effectiveDpr(2, 2)).toBe(2)
    expect(effectiveDpr(Number.NaN)).toBe(1)
    expect(effectiveDpr(0)).toBe(1)
  })

  it('animates only when every condition allows', () => {
    for (const reducedMotion of [false, true]) {
      for (const visible of [false, true]) {
        for (const intersecting of [false, true]) {
          for (const contextLost of [false, true]) {
            const expected =
              !reducedMotion && visible && intersecting && !contextLost
            expect(
              shouldAnimate({
                reducedMotion,
                visible,
                intersecting,
                contextLost,
              }),
            ).toBe(expected)
          }
        }
      }
    }
  })
})

/* ── Shaders ─────────────────────────────────────────────────────────── */

describe('shader sources', () => {
  const UNIFORMS = [
    'u_time',
    'u_resolution',
    'u_seed',
    'u_paper',
    'u_ink',
    'u_spot',
    'u_dotScale',
  ]

  it('vertex shader is a plain full-screen pass', () => {
    expect(VERTEX_SHADER).toContain('attribute vec2 a_position')
    expect(VERTEX_SHADER).toContain('gl_Position')
    expect(VERTEX_SHADER).not.toContain('#extension')
  })

  for (const scene of SCENES) {
    for (const renderer of ['riso', 'halftone'] as const) {
      it(`${scene}/${renderer} declares every uniform and no extension`, () => {
        const src = fragmentShaderFor(scene, renderer)
        expect(src).toContain('precision mediump float;')
        expect(src).not.toContain('#extension')
        expect(src).not.toMatch(/#version/)
        expect(src).toContain('gl_FragColor')
        expect(src).toContain('float sceneField(vec2 uv')
        for (const name of UNIFORMS) {
          expect(src).toMatch(
            new RegExp(`uniform\\s+(?:\\w+\\s+)*\\w+\\s+${name}\\s*;`),
          )
        }
        // GLSL ES 1.00 has no implicit int → float: every float const is a float literal.
        expect(src).not.toMatch(/const float \w+ = -?\d+;/)
        if (renderer === 'riso')
          expect(src.startsWith('#define RISO')).toBe(true)
        else expect(src).not.toContain('#define RISO')
        // No stray control characters in the source.
        expect(src).not.toMatch(/[\u0000-\u0008\u000b-\u001f]/)
      })
    }
  }
})

/* ── WebGL renderer ──────────────────────────────────────────────────── */

function fakeGl(opts: { compiles?: boolean; links?: boolean } = {}) {
  const compiles = opts.compiles ?? true
  const links = opts.links ?? true
  let lost = false
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    isContextLost: vi.fn(() => lost),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compiles),
    getShaderInfoLog: vi.fn(() => 'ERROR: 0:1: nope'),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    detachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => links),
    getProgramInfoLog: vi.fn(() => 'link error'),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn((_p: unknown, name: string) => ({ name })),
    useProgram: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    viewport: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
    loseContext: () => {
      lost = true
    },
  }
  return gl
}

describe('createSceneRenderer', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
    vi.restoreAllMocks()
  })

  it('returns null with one warning when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    let result: unknown = 'unset'
    expect(() => {
      result = createSceneRenderer(
        canvas,
        'grain',
        'riso',
        1,
        SCENE_PALETTE.light,
      )
    }).not.toThrow()
    expect(result).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toMatch(/^\[daily-bread:visual\] /)
  })

  it('returns null with one warning when getContext throws', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(
      createSceneRenderer(canvas, 'grain', 'halftone', 1, SCENE_PALETTE.light),
    ).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('returns null with one warning when a shader will not compile', () => {
    const canvas = document.createElement('canvas')
    const gl = fakeGl({ compiles: false })
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      gl as unknown as RenderingContext,
    )
    expect(
      createSceneRenderer(
        canvas,
        'living-water',
        'riso',
        1,
        SCENE_PALETTE.light,
      ),
    ).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('returns null with one warning when the program will not link', () => {
    const canvas = document.createElement('canvas')
    const gl = fakeGl({ links: false })
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      gl as unknown as RenderingContext,
    )
    expect(
      createSceneRenderer(
        canvas,
        'living-water',
        'riso',
        1,
        SCENE_PALETTE.light,
      ),
    ).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(gl.deleteProgram).toHaveBeenCalled()
  })

  it('renders and disposes against a working context', () => {
    const canvas = document.createElement('canvas')
    const gl = fakeGl()
    const getContext = vi
      .spyOn(canvas, 'getContext')
      .mockReturnValue(gl as unknown as RenderingContext)
    const r = createSceneRenderer(
      canvas,
      'wilderness-stars',
      'halftone',
      2048 + 5,
      SCENE_PALETTE.dark,
    )
    expect(r).not.toBeNull()
    expect(getContext).toHaveBeenCalledWith('webgl', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    })
    // The seed reaches the GPU folded, exactly as the CPU folds it.
    expect(gl.uniform1f).toHaveBeenCalledWith({ name: 'u_seed' }, 5)
    r!.render(1.25, 1200, 600)
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 1200, 600)
    expect(gl.uniform1f).toHaveBeenCalledWith({ name: 'u_time' }, 1.25)
    expect(gl.uniform1f).toHaveBeenCalledWith({ name: 'u_dotScale' }, 18)
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3)
    r!.dispose()
    r!.dispose()
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1)
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1)
    const draws = gl.drawArrays.mock.calls.length
    r!.render(2, 1200, 600)
    expect(gl.drawArrays.mock.calls.length).toBe(draws)
    expect(warn).not.toHaveBeenCalled()
  })
})

/* ── Component ───────────────────────────────────────────────────────── */

type Observed = { disconnect: ReturnType<typeof vi.fn> }

describe('<ProceduralScene />', () => {
  const originalMatchMedia = window.matchMedia
  const originalRaf = window.requestAnimationFrame
  const originalCaf = window.cancelAnimationFrame
  const originalIO = globalThis.IntersectionObserver
  const originalRO = globalThis.ResizeObserver
  let observers: Observed[] = []
  let rafQueue: Map<number, FrameRequestCallback>
  let rafId = 0

  function mockMatchMedia(reduce: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
  }

  function flushFrames(times: number, startMs = 16) {
    for (let n = 0; n < times; n++) {
      const pending = Array.from(rafQueue.entries())
      rafQueue.clear()
      for (const [, cb] of pending) cb(startMs + n * 40)
    }
  }

  beforeEach(() => {
    observers = []
    rafQueue = new Map()
    rafId = 0
    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafId += 1
      rafQueue.set(rafId, cb)
      return rafId
    })
    window.cancelAnimationFrame = vi.fn((id: number) => {
      rafQueue.delete(id)
    })
    class IO {
      disconnect = vi.fn()
      constructor() {
        observers.push(this)
      }
      observe() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    }
    class RO {
      disconnect = vi.fn()
      constructor() {
        observers.push(this)
      }
      observe() {}
      unobserve() {}
    }
    globalThis.IntersectionObserver =
      IO as unknown as typeof IntersectionObserver
    globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    motion.override = null
    window.matchMedia = originalMatchMedia
    window.requestAnimationFrame = originalRaf
    window.cancelAnimationFrame = originalCaf
    globalThis.IntersectionObserver = originalIO
    globalThis.ResizeObserver = originalRO
    vi.restoreAllMocks()
  })

  it('renders the decorative poster with no provider and no canvas', () => {
    mockMatchMedia(false)
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    const { container } = render(
      <ProceduralScene
        scene="living-water"
        renderer="riso"
        seed={7}
        label="Slow waves under a high horizon"
      />,
    )
    const figure = container.querySelector('figure')
    expect(figure).not.toBeNull()
    expect(figure).toHaveClass('db2-scene')
    expect(figure).toHaveAttribute('aria-hidden', 'true')
    expect(figure).toHaveAttribute('data-scene', 'living-water')
    expect(figure).toHaveAttribute('data-renderer', 'riso')
    expect(figure).toHaveAttribute(
      'data-label',
      'Slow waves under a high horizon',
    )
    expect(container.querySelector('figcaption')).toBeNull()
    const svg = container.querySelector('svg.db2-scene-poster')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(scenePosterDots('living-water', 7).dots.length)
    expect(circles.length).toBeGreaterThan(200)
    expect(container.querySelector('canvas')).toBeNull()
    expect(getContext).not.toHaveBeenCalled()
  })

  it('keeps the poster and creates no canvas when the OS asks for reduced motion', () => {
    mockMatchMedia(true)
    motion.override = true
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    const { container, unmount } = render(
      <ProceduralScene scene="grain" renderer="ascii" seed={3} label="Wheat" />,
    )
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(200)
    expect(container.querySelector('canvas')).toBeNull()
    expect(getContext).not.toHaveBeenCalled()
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    expect(() => unmount()).not.toThrow()
  })

  it('a still paper keeps the poster; a gentle paper moves at half speed (plan §37 motionLevel)', () => {
    mockMatchMedia(false)
    motion.override = true
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    const { container } = render(
      <ProceduralScene scene="grain" renderer="riso" seed={3} label="Wheat" motion="still" />,
    )
    expect(container.querySelector('canvas')).toBeNull()
    expect(getContext).not.toHaveBeenCalled()
    expect(sceneTimeStep(40, 'full')).toBeCloseTo(0.04)
    expect(sceneTimeStep(40, 'gentle')).toBeCloseTo(0.02)
    expect(sceneTimeStep(40, 'still')).toBe(0)
    // A long pause never jumps the scene, at any speed.
    expect(sceneTimeStep(5_000, 'full')).toBeCloseTo(0.1)
    expect(sceneTimeStep(5_000, 'gentle')).toBeCloseTo(0.05)
  })

  it('keeps the poster when the in-app setting turns motion off', () => {
    mockMatchMedia(false)
    motion.override = false
    const { container } = render(
      <ProceduralScene scene="grain" renderer="riso" seed={3} label="Wheat" />,
    )
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('keeps the poster when neither WebGL nor Canvas2D is available', () => {
    mockMatchMedia(false)
    motion.override = true
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = render(
      <ProceduralScene
        scene="wilderness-stars"
        renderer="halftone"
        seed={3}
        label="Stars"
      />,
    )
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(200)
  })

  it('falls back to the Canvas2D ASCII overlay, fades it in after a frame, and cleans up', () => {
    mockMatchMedia(false)
    motion.override = true
    const ctx = {
      fillStyle: '',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      type: string,
    ) =>
      type === '2d' ? ctx : null) as unknown as HTMLCanvasElement['getContext'])
    const { container, unmount } = render(
      <ProceduralScene
        scene="living-water"
        renderer="riso"
        seed={9}
        label="Water"
        theme="dark"
      />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas).toHaveClass('db2-scene-canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).not.toHaveClass('is-live')
    // The poster is still underneath.
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(200)

    act(() => flushFrames(3))
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(canvas).toHaveClass('is-live')
    expect(ctx.fillStyle).toBe(SCENE_PALETTE.dark.ink)

    expect(observers.length).toBeGreaterThanOrEqual(2)
    unmount()
    expect(canvas!.isConnected).toBe(false)
    for (const o of observers) expect(o.disconnect).toHaveBeenCalled()
    expect(rafQueue.size).toBe(0)
  })

  it('pauses while the tab is hidden and resumes when it returns', () => {
    mockMatchMedia(false)
    motion.override = true
    const ctx = {
      fillStyle: '',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      type: string,
    ) =>
      type === '2d' ? ctx : null) as unknown as HTMLCanvasElement['getContext'])
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible')
    const { unmount } = render(
      <ProceduralScene scene="grain" renderer="ascii" seed={1} label="Wheat" />,
    )
    expect(rafQueue.size).toBe(1)
    visibility.mockReturnValue('hidden')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rafQueue.size).toBe(0)
    visibility.mockReturnValue('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rafQueue.size).toBe(1)
    unmount()
    expect(rafQueue.size).toBe(0)
  })
})
