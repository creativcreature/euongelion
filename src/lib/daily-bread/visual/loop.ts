/**
 * Daily Bread V2 — frame scheduling for the live scene.
 *
 * Pure and testable: no DOM. The scene is slow and calm, so there is nothing
 * to gain from 60 or 120 frames a second except a warm phone. The gate holds
 * it to a cap, the DPR ceiling holds the pixel count down, and `shouldAnimate`
 * is the one place that decides whether the loop may run at all.
 */

export const DEFAULT_FPS_CAP = 30
export const DEFAULT_DPR_CAP = 1.5

/** rAF timestamps jitter; a frame this close to due counts as due. */
const FRAME_SLACK_MS = 1

export interface FrameGate {
  shouldRender(nowMs: number): boolean
  reset(): void
}

/**
 * Admit at most `fps` frames per second from a faster rAF stream. The next
 * slot is kept on the original cadence (no drift) and a long pause does not
 * cause a burst of catch-up frames.
 */
export function createFrameGate(fps: number = DEFAULT_FPS_CAP): FrameGate {
  const cap = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS_CAP
  const interval = 1000 / cap
  let last = -1
  return {
    shouldRender(nowMs: number): boolean {
      if (last < 0) {
        last = nowMs
        return true
      }
      const elapsed = nowMs - last
      if (elapsed < 0) {
        // The clock went backwards (a reset timeline). Start again from here.
        last = nowMs
        return true
      }
      if (elapsed + FRAME_SLACK_MS < interval) return false
      // Within one slot: carry the overshoot so the average holds the cap.
      // Past two slots (a stall, a background tab): resync to now instead of
      // letting the next frames through early to catch up.
      last =
        elapsed >= interval * 2
          ? nowMs
          : nowMs - Math.max(0, elapsed - interval)
      return true
    },
    reset(): void {
      last = -1
    },
  }
}

/** The device pixel ratio to render at: never above `cap`, never nonsense. */
export function effectiveDpr(
  devicePixelRatio: number,
  cap: number = DEFAULT_DPR_CAP,
): number {
  const dpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1
  const ceiling = Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_DPR_CAP
  return Math.min(dpr, ceiling)
}

/** The loop runs only when every condition allows it. */
export function shouldAnimate(input: {
  reducedMotion: boolean
  visible: boolean
  intersecting: boolean
  contextLost: boolean
}): boolean {
  return (
    !input.reducedMotion &&
    input.visible &&
    input.intersecting &&
    !input.contextLost
  )
}
