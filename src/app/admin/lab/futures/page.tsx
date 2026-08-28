/**
 * LAB — seven futures, index.
 *
 * Each card states the concept's CLAIM first and what it does second, because
 * the claim is the part worth arguing with. Cost and risk are printed on every
 * card so no option is flattered — including the ones that are more work.
 */
import Link from 'next/link'
import { FUTURES, SURFACES } from '@/lib/lab/futures'

export const dynamic = 'force-dynamic'

export default function FuturesIndex() {
  return (
    <div
      style={{ background: '#0e0e11', minHeight: '100vh', color: '#eceaf0' }}
    >
      <div className="fut-bar">
        <Link href="/admin">← admin</Link>
        <span className="fut-note">
          LAB · seven futures · each treatment runs on the REAL surface
        </span>
      </div>

      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '30px 22px 70px',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        <h1 style={{ fontSize: 22, margin: '0 0 8px', letterSpacing: '.01em' }}>
          Seven futures for the paper
        </h1>
        <p
          style={{
            color: '#8b8b96',
            fontSize: 13.5,
            lineHeight: 1.65,
            maxWidth: 760,
            margin: '0 0 10px',
          }}
        >
          Seven different <em>claims</em> about what this site is — not seven
          filters. Each one runs over today&rsquo;s real edition and a real
          devotional, so you are judging the treatment on the actual thing.
        </p>
        <p
          style={{
            color: '#8b8b96',
            fontSize: 13.5,
            lineHeight: 1.65,
            maxWidth: 760,
            margin: '0 0 28px',
          }}
        >
          <strong style={{ color: '#eceaf0' }}>
            One rule holds across all seven:
          </strong>{' '}
          the Word is never treated. Scripture and devotional prose render clean
          in every concept — the machine carries you to the page, and then the
          page is just a page. Everything else is negotiable.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          {FUTURES.map((c, i) => (
            <div
              key={c.id}
              style={{
                border: '1px solid #26262e',
                borderRadius: 10,
                padding: '16px 18px',
                background: '#131318',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#565663', fontSize: 12 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 style={{ margin: 0, fontSize: 17 }}>{c.name}</h2>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 9,
                    background: c.accent,
                    display: 'inline-block',
                  }}
                />
                <span style={{ flex: 1 }} />
                {SURFACES.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/lab/futures/${c.id}?s=${s.id}`}
                    style={{
                      color: '#06131c',
                      background: '#7fd1ff',
                      borderRadius: 6,
                      padding: '5px 11px',
                      fontSize: 12.5,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {s.label} →
                  </Link>
                ))}
              </div>

              <p
                style={{
                  margin: '11px 0 0',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#e6e4ec',
                }}
              >
                {c.claim}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#9d9daa',
                }}
              >
                {c.how}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#7fd1ff',
                }}
              >
                You can: {c.interaction}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#6f6f7c',
                }}
              >
                Lineage: {c.lineage}
                <br />
                Risk: {c.risk}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
