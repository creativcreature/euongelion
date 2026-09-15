'use client'

/**
 * Daily Bread V2 — the procedural scene (SA-142 / F-184).
 *
 * THE POSTER IS THE PAGE. The server renders the scene as an inline SVG of
 * halftone dots sampled from the scene field at t = 0. That is the whole
 * visual for no-JS readers, reduced-motion readers (the OS setting OR the
 * in-app setting), readers without WebGL, and any render outside the
 * AnimationProvider. It is never removed.
 *
 * THE CANVAS IS AN OVERLAY. When motion is allowed, a canvas is created on
 * mount and laid over the poster: WebGL for `riso` / `halftone`, Canvas2D for
 * `ascii` or when WebGL will not come up. It stays transparent until its first
 * frame has actually drawn, so there is never a blank flash. It pauses off
 * screen and in a hidden tab, is capped at 30 fps and DPR 1.5, and survives a
 * lost GPU context by showing the poster until the context is restored.
 *
 * The scene is decorative: the whole figure is aria-hidden. `label` is kept
 * as `data-label` for the archive record.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useAnimation } from '@/providers/AnimationProvider'
import type {
  MotionLevel,
  ProceduralRendererId,
  ProceduralSceneId,
} from '@/lib/daily-bread/types'
import { asciiFrame, drawAsciiFrame } from '@/lib/daily-bread/visual/ascii'
import {
  createFrameGate,
  effectiveDpr,
  shouldAnimate,
} from '@/lib/daily-bread/visual/loop'
import {
  SCENE_PALETTE,
  type ScenePaletteColors,
  type SceneTheme,
} from '@/lib/daily-bread/visual/palette'
import { scenePosterDots } from '@/lib/daily-bread/visual/poster'
import {
  createSceneRenderer,
  type SceneRenderer,
} from '@/lib/daily-bread/visual/webgl'

export interface ProceduralSceneProps {
  scene: ProceduralSceneId
  renderer: ProceduralRendererId
  seed: number
  label: string
  className?: string
  theme?: SceneTheme
  /** The paper's motion level from its composition manifest (default full). */
  motion?: MotionLevel
}

/** ASCII glyph cell, CSS px. */
const ASCII_CELL_W = 11
const ASCII_CELL_H = 17
const ASCII_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, monospace'
/** A frame gap longer than this (a stall, a debugger) does not jump the scene. */
const MAX_FRAME_STEP_MS = 100

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** The theme the page is actually showing, when the caller did not say. */
function detectTheme(el: Element): SceneTheme {
  if (el.closest('.mock-home.is-dark')) return 'dark'
  if (
    document.documentElement.classList.contains('dark') &&
    el.closest('.mock-home')
  ) {
    return 'dark'
  }
  return 'light'
}

/**
 * Seconds of scene time a frame advances (plan §37 motionLevel): `full` is real
 * time, `gentle` half speed (the quiet and prayer-book papers), `still` never
 * animates. Long gaps are capped so a scene never jumps after a pause.
 */
export function sceneTimeStep(deltaMs: number, motion: MotionLevel): number {
  if (motion === 'still' || !(deltaMs > 0)) return 0
  return (Math.min(deltaMs, MAX_FRAME_STEP_MS) / 1000) * (motion === 'gentle' ? 0.5 : 1)
}

export default function ProceduralScene({
  scene,
  renderer,
  seed,
  label,
  className,
  theme,
  motion = 'full',
}: ProceduralSceneProps) {
  const figureRef = useRef<HTMLElement | null>(null)
  const { shouldAnimate: appAllowsMotion } = useAnimation()
  // Plan §52: live frame → static poster → CSS texture → typography. A poster
  // that cannot be drawn (a scene this renderer version does not know, in an
  // older frozen edition) drops to the texture tier instead of breaking the page.
  const poster = useMemo(() => {
    try {
      return scenePosterDots(scene, seed)
    } catch {
      return null
    }
  }, [scene, seed])
  const posterPalette = SCENE_PALETTE[theme ?? 'light']

  useEffect(() => {
    const figureEl = figureRef.current
    // No provider reads as shouldAnimate=false: the poster stays, by design.
    // A `still` paper keeps the poster too.
    if (!figureEl || !poster || !appAllowsMotion || motion === 'still') return
    if (typeof window.matchMedia !== 'function') return
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    if (motionQuery.matches) return
    if (typeof window.requestAnimationFrame !== 'function') return
    const figure: HTMLElement = figureEl

    let disposed = false
    let reducedMotion = false
    let visible = document.visibilityState !== 'hidden'
    let intersecting = true
    let contextLost = false
    let raf = 0
    let lastNow = 0
    let sceneTime = 0
    let live = false
    let cssWidth = 0
    let cssHeight = 0
    let dpr = 1
    let activeTheme: SceneTheme = theme ?? detectTheme(figure)
    const gate = createFrameGate(30)

    let canvas: HTMLCanvasElement | null = null
    let gl: SceneRenderer | null = null
    let ctx2d: CanvasRenderingContext2D | null = null

    const palette = (): ScenePaletteColors => SCENE_PALETTE[activeTheme]

    function newCanvas(): HTMLCanvasElement {
      const el = document.createElement('canvas')
      el.className = 'db2-scene-canvas'
      el.setAttribute('aria-hidden', 'true')
      return el
    }

    function onContextLost(event: Event) {
      event.preventDefault()
      contextLost = true
      stop()
      // Resources died with the context; there is nothing left to delete.
      gl = null
      setLive(false)
    }

    function onContextRestored() {
      if (disposed || !canvas) return
      contextLost = false
      gl = createSceneRenderer(
        canvas,
        scene,
        renderer === 'halftone' ? 'halftone' : 'riso',
        seed,
        palette(),
      )
      if (gl) update()
    }

    /** Bring up a renderer; false means the poster is all there will be. */
    function build(): boolean {
      if (renderer !== 'ascii') {
        const glCanvas = newCanvas()
        const made = createSceneRenderer(
          glCanvas,
          scene,
          renderer,
          seed,
          palette(),
        )
        if (made) {
          canvas = glCanvas
          gl = made
          canvas.addEventListener('webglcontextlost', onContextLost)
          canvas.addEventListener('webglcontextrestored', onContextRestored)
          return true
        }
      }
      // A canvas that ever held a WebGL context cannot give a 2D one, so the
      // Canvas2D path always starts from a fresh element.
      const flatCanvas = newCanvas()
      let flat: CanvasRenderingContext2D | null = null
      try {
        flat = flatCanvas.getContext('2d')
      } catch {
        flat = null
      }
      if (!flat) {
        console.warn(
          '[daily-bread:visual] Canvas2D is unavailable; keeping the static poster.',
        )
        return false
      }
      canvas = flatCanvas
      ctx2d = flat
      return true
    }

    function setLive(next: boolean) {
      if (!canvas || live === next) return
      live = next
      canvas.classList.toggle('is-live', next)
    }

    function measure() {
      if (!canvas) return
      cssWidth = figure.clientWidth
      cssHeight = figure.clientHeight
      dpr = effectiveDpr(window.devicePixelRatio)
      const w = Math.max(1, Math.round(cssWidth * dpr))
      const h = Math.max(1, Math.round(cssHeight * dpr))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
    }

    function draw(t: number): boolean {
      if (!canvas) return false
      if (gl) {
        gl.render(t, canvas.width, canvas.height)
        return !gl.gl.isContextLost()
      }
      if (ctx2d) {
        const cols = Math.max(8, Math.floor(cssWidth / ASCII_CELL_W))
        const rows = Math.max(4, Math.floor(cssHeight / ASCII_CELL_H))
        const colours = palette()
        const fontPx = Math.max(6, Math.round(ASCII_CELL_H * dpr * 0.92))
        drawAsciiFrame(ctx2d, asciiFrame(scene, seed, t, cols, rows), {
          width: canvas.width,
          height: canvas.height,
          ink: colours.ink,
          paper: colours.paper,
          font: `${fontPx}px ${ASCII_FONT_STACK}`,
        })
        return true
      }
      return false
    }

    function canRun(): boolean {
      return (
        !disposed &&
        cssWidth > 0 &&
        cssHeight > 0 &&
        shouldAnimate({ reducedMotion, visible, intersecting, contextLost })
      )
    }

    function frame(now: number) {
      raf = 0
      if (!canRun()) return
      raf = window.requestAnimationFrame(frame)
      if (!gate.shouldRender(now)) return
      if (lastNow > 0) {
        sceneTime += sceneTimeStep(now - lastNow, motion)
      }
      lastNow = now
      if (draw(sceneTime)) setLive(true)
    }

    function start() {
      if (raf || !canRun()) return
      lastNow = 0
      gate.reset()
      raf = window.requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) window.cancelAnimationFrame(raf)
      raf = 0
    }

    function update() {
      if (canRun()) start()
      else stop()
    }

    if (!build() || !canvas) return
    const liveCanvas: HTMLCanvasElement = canvas
    figure.appendChild(liveCanvas)
    measure()

    const onVisibility = () => {
      visible = document.visibilityState !== 'hidden'
      update()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onMotionChange = () => {
      reducedMotion = motionQuery.matches
      if (reducedMotion) setLive(false)
      update()
    }
    motionQuery.addEventListener?.('change', onMotionChange)

    let intersection: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'function') {
      intersection = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        intersecting = entry.isIntersecting
        update()
      })
      intersection.observe(figure)
    }

    let resize: ResizeObserver | null = null
    const onWindowResize = () => {
      measure()
      update()
    }
    if (typeof ResizeObserver === 'function') {
      resize = new ResizeObserver(onWindowResize)
      resize.observe(figure)
    } else {
      window.addEventListener('resize', onWindowResize)
    }

    // Follow the reader's theme when the caller did not pin one.
    let themeWatch: MutationObserver | null = null
    if (!theme && typeof MutationObserver === 'function') {
      themeWatch = new MutationObserver(() => {
        const next = detectTheme(figure)
        if (next === activeTheme) return
        activeTheme = next
        if (gl && canvas && !contextLost) {
          gl.dispose()
          gl = createSceneRenderer(
            canvas,
            scene,
            renderer === 'halftone' ? 'halftone' : 'riso',
            seed,
            palette(),
          )
          if (!gl) {
            stop()
            setLive(false)
            return
          }
        }
        // A paused loop still repaints once, so the canvas never shows the
        // old palette when it resumes.
        if (!raf) draw(sceneTime)
      })
      themeWatch.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
      const home = figure.closest('.mock-home')
      if (home) {
        themeWatch.observe(home, {
          attributes: true,
          attributeFilter: ['class'],
        })
      }
    }

    update()

    return () => {
      disposed = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      motionQuery.removeEventListener?.('change', onMotionChange)
      intersection?.disconnect()
      resize?.disconnect()
      window.removeEventListener('resize', onWindowResize)
      themeWatch?.disconnect()
      liveCanvas.removeEventListener('webglcontextlost', onContextLost)
      liveCanvas.removeEventListener('webglcontextrestored', onContextRestored)
      gl?.dispose()
      gl = null
      ctx2d = null
      liveCanvas.remove()
    }
  }, [appAllowsMotion, poster, scene, renderer, seed, theme, motion])

  const classes = className ? `db2-scene ${className}` : 'db2-scene'

  return (
    <figure
      ref={figureRef}
      className={classes}
      data-scene={scene}
      data-renderer={renderer}
      data-label={label}
      data-theme={theme}
      aria-hidden="true"
    >
      {poster ? (
        <svg
          className="db2-scene-poster"
          viewBox={`0 0 ${poster.width} ${poster.height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
          fill={posterPalette.ink}
        >
          <rect
            className="db2-scene-paper"
            width={poster.width}
            height={poster.height}
            fill={posterPalette.paper}
          />
          {poster.dots.map((dot, i) =>
            dot.spot ? (
              <circle
                key={i}
                className="db2-scene-spot"
                cx={dot.cx}
                cy={dot.cy}
                r={dot.r}
                fill={posterPalette.spot}
              />
            ) : (
              <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} />
            ),
          )}
        </svg>
      ) : (
        <span className="db2-scene-texture" data-fallback="texture" />
      )}
      {/* The typography tier: shown by CSS when colours and images are stripped
          (forced colours, print), so the band still says what it was. */}
      <span className="db2-scene-type">{label}</span>
    </figure>
  )
}
