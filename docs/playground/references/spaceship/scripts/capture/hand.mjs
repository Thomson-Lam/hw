/** Pointer events per second while the hand moves, near a display's refresh rate. */
const MOVES_PER_SECOND = 60

/**
 * A pointer that moves like a hand: eased in and out along a slight arc, at a speed that suits the distance, so recorded gestures read as human.
 * Every gesture awaits until it is done, so a choreography is plain sequential code.
 */
export function createHand(page) {
  let at = { x: 0, y: 0 }

  return {
    at: () => at,
    moveTo,
    pause: (ms) => page.waitForTimeout(ms),
    async press() {
      await page.mouse.down()
    },
    async release() {
      await page.mouse.up()
    },
    async click() {
      await page.mouse.down()
      await page.waitForTimeout(70)
      await page.mouse.up()
    },
    async doubleClick() {
      await page.mouse.click(at.x, at.y, { clickCount: 1, delay: 50 })
      await page.waitForTimeout(90)
      await page.mouse.click(at.x, at.y, { clickCount: 2, delay: 50 })
    },
    /** Presses, moves to `target` with the button down, then releases. */
    async drag(target, options) {
      await page.mouse.down()
      await moveTo(target, options)
      await page.mouse.up()
    },
  }

  /** Moves along a curve bowed by `arc` (a fraction of the distance) over `ms`, or a duration that grows with the distance. */
  async function moveTo(target, { ms, arc = 0.08, ease = easeInOut } = {}) {
    const from = at
    const length = Math.hypot(target.x - from.x, target.y - from.y)
    const duration = ms ?? 260 + 160 * Math.log2(1 + length / 60)
    const steps = Math.max(1, Math.round((duration / 1000) * MOVES_PER_SECOND))
    const bow = { x: -(target.y - from.y) * arc, y: (target.x - from.x) * arc }
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps)
      const lift = 4 * t * (1 - t)
      at = { x: from.x + (target.x - from.x) * t + bow.x * lift, y: from.y + (target.y - from.y) * t + bow.y * lift }
      const startedAt = performance.now()
      await page.mouse.move(at.x, at.y)
      await page.waitForTimeout(Math.max(0, 1000 / MOVES_PER_SECOND - (performance.now() - startedAt)))
    }
    at = target
  }
}

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const linear = (t) => t
