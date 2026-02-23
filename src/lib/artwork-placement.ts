/**
 * artwork-placement.ts
 *
 * Calculates insertion points for artwork images between
 * devotional content modules/panels.
 */

/**
 * Returns indices (0-based) of content sections AFTER which artwork
 * images should be inserted into the devotional reading flow.
 *
 * Strategy:
 *   - First artwork appears after module 1 (index 0)
 *   - Remaining artworks are evenly distributed across the rest
 *   - Never insert after the very last module
 *
 * @param totalModules  Number of content modules/panels
 * @param artworkCount  Number of artwork images to place
 * @returns Array of module indices after which to insert an artwork
 */
export function calculateInsertionPoints(
  totalModules: number,
  artworkCount: number,
): number[] {
  if (artworkCount <= 0 || totalModules <= 1) return []

  const points: number[] = []

  // First artwork always after module 1 (index 0)
  points.push(0)

  if (artworkCount === 1) return points

  // Distribute remaining artworks evenly across remaining modules
  // Avoid placing after the last module
  const remaining = artworkCount - 1
  const availableSlots = totalModules - 2 // exclude first and last
  if (availableSlots <= 0) return points

  const step = (availableSlots + 1) / (remaining + 1)

  for (let i = 1; i <= remaining; i++) {
    const pos = Math.round(step * i)
    // Offset by 1 since we start from module index 1
    const insertAfter = pos
    if (insertAfter < totalModules - 1) {
      points.push(insertAfter)
    }
  }

  return points
}
