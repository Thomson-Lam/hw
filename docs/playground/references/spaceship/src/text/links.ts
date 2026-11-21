import type { Point } from "../point.ts"

type Circle = { center: Point; radius: number }
type Segment = [Point, Point]

export function circleOf(element: Element): Circle {
  const { x, y, width, height } = element.getBoundingClientRect()
  return { center: { x: x + scrollX + width / 2, y: y + scrollY + height / 2 }, radius: width / 2 }
}

/** SVG path data drawing each segment; skips missing ones. */
export function pathOf(segments: (Segment | undefined)[]) {
  return segments.map((segment) => (segment ? `M${segment[0].x},${segment[0].y}L${segment[1].x},${segment[1].y}` : "")).join("")
}

/** The straight line between the circumferences of `from` and `to`; undefined if they touch. A point is a circle of radius 0. */
export function linkBetween(from: Circle, to: Circle): Segment | undefined {
  const length = distance(from.center, to.center)
  if (length <= from.radius + to.radius) return
  const along = (reach: number) => ({
    x: from.center.x + ((to.center.x - from.center.x) * reach) / length,
    y: from.center.y + ((to.center.y - from.center.y) * reach) / length,
  })
  return [along(from.radius), along(length - to.radius)]
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
