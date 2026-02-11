/**
 * Gold ornamental divider between modules.
 * Thin gold rules with a centered ornament (cross, diamond, or dot).
 */
export default function OrnamentDivider({
  ornament = '\u2726',
}: {
  ornament?: string
}) {
  return (
    <div className="ornament-divider" aria-hidden="true">
      <span className="ornament">{ornament}</span>
    </div>
  )
}
