/**
 * Author colophon — a 4-line credit at the end of every devotional.
 * Editorial closer, treats the reading like a movie credit.
 *
 * All fields optional. If nothing is provided, renders just the
 * ornament + "Euangelion" wordmark line.
 */
export default function AuthorColophon({
  writer,
  editor,
  composedDate,
  translation,
}: {
  writer?: string
  editor?: string
  composedDate?: string
  translation?: string
}) {
  return (
    <footer className="author-colophon" aria-label="Author credits">
      <p className="author-colophon-ornament" aria-hidden="true">
        ❦
      </p>
      <p className="author-colophon-line">
        <strong>Euangelion</strong> · A daily reading
      </p>
      {writer && (
        <p className="author-colophon-line">
          Written by <strong>{writer}</strong>
        </p>
      )}
      {editor && (
        <p className="author-colophon-line">
          Edited by <strong>{editor}</strong>
        </p>
      )}
      {translation && (
        <p className="author-colophon-line">
          Scripture: <strong>{translation}</strong>
        </p>
      )}
      {composedDate && (
        <p className="author-colophon-line">
          Composed <strong>{composedDate}</strong>
        </p>
      )}
    </footer>
  )
}
