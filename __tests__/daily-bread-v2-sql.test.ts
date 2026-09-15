// @vitest-environment node
/**
 * Daily Bread V2 — the migration itself, executed in a real Postgres (PGlite,
 * Postgres 16 compiled to WASM). Serialization, numbering, locking,
 * idempotency, immutability and row-level security are properties of the SQL,
 * so they are tested against the SQL rather than a mock (SA-142 / F-184).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'

const MIGRATION = readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260913000001_daily_bread_v2.sql',
  ),
  'utf8',
)

const PRIVATE_PROVENANCE = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260914000001_daily_bread_v2_private_provenance.sql'),
  'utf8',
)

const ROLLBACK = readFileSync(
  path.join(process.cwd(), 'database/ROLLBACK-2026-09-13-daily-bread-v2.sql'),
  'utf8',
)

async function freshDb(): Promise<PGlite> {
  const db = new PGlite()
  // Mirror the Supabase role model so the REVOKE/GRANT blocks and RLS run.
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    -- Supabase also grants EXECUTE on new functions to the client roles
    -- directly; the migration must survive that (it did not on first apply).
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  `)
  await db.exec(MIGRATION)
  await db.exec(PRIVATE_PROVENANCE)
  return db
}

type Row = Record<string, unknown>
const rows = async (db: PGlite, sql: string, params: unknown[] = []) =>
  (await db.query<Row>(sql, params)).rows

function doc(date: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    editionDate: date,
    quality: 'normal',
    title: `Edition ${date}`,
    deck: 'A deck',
    primaryScripture: { reference: 'John 1:1', text: 'In the beginning', translation: 'BSB' },
    liturgical: { season: 'ordinary' },
    seed: `seed-${date}`,
    composition: { archetype: 'broadsheet' },
    modules: [{ type: 'lead' }],
    assets: {},
    generation: { providers: [] },
    rendererVersion: 'db2-r1',
    ...extra,
  })
}

async function assembleReady(db: PGlite, date: string, origin = 'native') {
  const [acq] = await rows(
    db,
    `select * from daily_bread_acquire_assembly($1::date, 'job', 900, $2)`,
    [date, origin],
  )
  expect(acq.acquired).toBe(true)
  const [ready] = await rows(
    db,
    `select daily_bread_mark_ready($1::date, 'job', $2::jsonb) as r`,
    [date, doc(date)],
  )
  expect(ready.r).toBe('ready')
}

describe('daily bread v2 schema (PGlite)', () => {
  let db: PGlite
  beforeEach(async () => {
    db = await freshDb()
  })

  it('is idempotent: the migration can be pasted twice', async () => {
    await expect(db.exec(MIGRATION)).resolves.toBeDefined()
  })

  it('allocates native issues 1, 2, 3 in publication order and never twice', async () => {
    for (const d of ['2026-09-14', '2026-09-15', '2026-09-16']) {
      await assembleReady(db, d)
    }
    const a = await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const b = await rows(db, `select * from daily_bread_publish('2026-09-15')`)
    const again = await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const c = await rows(db, `select * from daily_bread_publish('2026-09-16')`)
    expect(a[0]).toMatchObject({ result: 'published', issue: 1, volume: 1 })
    expect(b[0]).toMatchObject({ result: 'published', issue: 2, volume: 1 })
    expect(again[0]).toMatchObject({ result: 'already_published', issue: 1 })
    expect(c[0]).toMatchObject({ result: 'published', issue: 3 })
  })

  it('plan §82 lifecycle: draft → assembling → ready → published, and fallback and minimum quality publish like normal', async () => {
    const lifecycle = async (d: string) => (await rows(db, `select lifecycle from daily_bread_editions where edition_date = $1`, [d]))[0]?.lifecycle
    for (const [date, quality] of [['2026-09-14', 'normal'], ['2026-09-15', 'fallback'], ['2026-09-16', 'minimum']] as const) {
      await rows(db, `select * from daily_bread_acquire_assembly($1::date, 'job', 900, 'native')`, [date])
      expect(await lifecycle(date)).toBe('assembling')
      await rows(db, `select daily_bread_mark_ready($1::date, 'job', $2::jsonb) as r`, [date, doc(date, { quality })])
      expect(await lifecycle(date)).toBe('ready')
      const [pub] = await rows(db, `select * from daily_bread_publish($1::date)`, [date])
      expect(pub.result).toBe('published')
      const [row] = await rows(db, `select lifecycle, quality, issue from daily_bread_editions where edition_date = $1`, [date])
      expect(row).toMatchObject({ lifecycle: 'published', quality })
    }
    // A released lease returns the row to draft: the first state of the cycle.
    await rows(db, `select * from daily_bread_acquire_assembly('2026-09-17', 'job', 900, 'native')`)
    await rows(db, `select daily_bread_release_assembly('2026-09-17', 'job')`)
    expect(await lifecycle('2026-09-17')).toBe('draft')
  })

  it('rolls the volume a year after the first native issue', async () => {
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    await assembleReady(db, '2027-09-14')
    const [next] = await rows(db, `select * from daily_bread_publish('2027-09-14')`)
    expect(next).toMatchObject({ issue: 2, volume: 2 })
  })

  it('backfilled editions publish without consuming an issue number', async () => {
    await assembleReady(db, '2026-08-20', 'backfilled')
    const [bf] = await rows(db, `select * from daily_bread_publish('2026-08-20')`)
    expect(bf).toMatchObject({ result: 'published', issue: null, volume: null })
    await assembleReady(db, '2026-09-14')
    const [first] = await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    expect(first.issue).toBe(1)
    await expect(
      db.query(
        `update daily_bread_editions set issue = 7 where edition_date = '2026-08-20'`,
      ),
    ).rejects.toThrow(/backfill_has_no_issue/)
  })

  it('refuses to publish what is not ready, or a date that does not exist', async () => {
    await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'job')`)
    const [notReady] = await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    expect(notReady.result).toBe('not_ready')
    const [missing] = await rows(db, `select * from daily_bread_publish('2030-01-01')`)
    expect(missing.result).toBe('missing')
  })

  it('a second job cannot take a live assembly lease, and only the holder marks ready', async () => {
    const [a] = await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'jobA')`)
    const [b] = await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'jobB')`)
    expect(a.acquired).toBe(true)
    expect(b.acquired).toBe(false)
    const [lost] = await rows(
      db,
      `select daily_bread_mark_ready('2026-09-14', 'jobB', $1::jsonb) as r`,
      [doc('2026-09-14')],
    )
    expect(lost.r).toBe('lock_lost')
  })

  it('an expired lease can be taken over; a released lease returns to draft', async () => {
    await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'jobA', 30)`)
    await db.query(
      `update daily_bread_editions set lock_expires_at = now() - interval '1 second' where edition_date = '2026-09-14'`,
    )
    const [b] = await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'jobB')`)
    expect(b.acquired).toBe(true)
    const [rel] = await rows(db, `select daily_bread_release_assembly('2026-09-14', 'jobB') as r`)
    expect(rel.r).toBe(true)
    const [row] = await rows(db, `select lifecycle, lock_owner from daily_bread_editions`)
    expect(row).toMatchObject({ lifecycle: 'draft', lock_owner: null })
  })

  it('never re-assembles a ready or published edition', async () => {
    await assembleReady(db, '2026-09-14')
    const [again] = await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'job2')`)
    expect(again).toMatchObject({ acquired: false, lifecycle: 'ready' })
  })

  it('a ready edition can be reopened and rebuilt; a published one cannot', async () => {
    await assembleReady(db, '2026-09-14')
    const [re] = await rows(db, `select daily_bread_reopen_ready('2026-09-14') as r`)
    expect(re.r).toBe(true)
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const [no] = await rows(db, `select daily_bread_reopen_ready('2026-09-14') as r`)
    expect(no.r).toBe(false)
  })

  it('rejects a document whose date does not match', async () => {
    await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'job')`)
    await expect(
      db.query(`select daily_bread_mark_ready('2026-09-14', 'job', $1::jsonb)`, [
        doc('2026-09-15'),
      ]),
    ).rejects.toThrow(/document date does not match/)
  })

  it('writes revision 1 at publication and revisions are append-only', async () => {
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const revs = await rows(db, `select revision, reason, snapshot from daily_bread_edition_revisions`)
    expect(revs).toHaveLength(1)
    expect((revs[0].snapshot as Row).issue).toBe(1)
    expect((revs[0].snapshot as Row).title).toBe('Edition 2026-09-14')
    await expect(
      db.query(`update daily_bread_edition_revisions set reason = 'tamper'`),
    ).rejects.toThrow(/immutable/)
    await expect(db.query(`delete from daily_bread_edition_revisions`)).rejects.toThrow(
      /immutable/,
    )
  })

  it('a correction adds a revision without touching the issue number', async () => {
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const [rev] = await rows(
      db,
      `select * from daily_bread_create_revision('2026-09-14', 'typo in deck', $1::jsonb)`,
      [JSON.stringify({ deck: 'Corrected deck' })],
    )
    expect(rev).toMatchObject({ result: 'revised', revision: 2 })
    const [row] = await rows(db, `select issue, deck, active_revision from daily_bread_editions`)
    expect(row).toMatchObject({ issue: 1, deck: 'Corrected deck', active_revision: 2 })
  })

  it('a withdrawn edition keeps its number retired', async () => {
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const [s] = await rows(db, `select daily_bread_supersede('2026-09-14', 'withdrawn for review') as r`)
    expect(s.r).toBe('superseded')
    await assembleReady(db, '2026-09-15')
    const [next] = await rows(db, `select * from daily_bread_publish('2026-09-15')`)
    expect(next.issue).toBe(2)
  })

  it('duplicate native issue numbers are impossible at the index level', async () => {
    await assembleReady(db, '2026-09-14')
    await assembleReady(db, '2026-09-15')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    await rows(db, `select * from daily_bread_publish('2026-09-15')`)
    await expect(
      db.query(`update daily_bread_editions set issue = 1 where edition_date = '2026-09-15'`),
    ).rejects.toThrow(/native_issue_unique/)
  })

  it('anon reads published editions only, cannot write, cannot run the pipeline', async () => {
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    await assembleReady(db, '2026-09-15') // ready, not published
    await db.exec(`SET ROLE anon`)
    const visible = await rows(db, `select slug from daily_bread_editions order by slug`)
    expect(visible.map((r) => r.slug)).toEqual(['2026-09-14'])
    // Plan §27: the paper's public columns stay readable; provenance and leases do not.
    const [paper] = await rows(db, `select slug, issue, title, modules, published_at from daily_bread_editions`)
    expect(paper).toMatchObject({ slug: '2026-09-14', issue: 1 })
    for (const hidden of ['generation', 'lock_owner', 'lock_expires_at', '*']) {
      await expect(db.query(`select ${hidden} from daily_bread_editions`)).rejects.toThrow(/permission denied/)
    }
    await expect(db.query(`select snapshot from daily_bread_edition_revisions`)).rejects.toThrow(/permission denied/)
    await expect(
      db.query(`insert into daily_bread_editions (edition_date, slug) values ('2026-10-01', '2026-10-01')`),
    ).rejects.toThrow(/permission denied/)
    await expect(db.query(`select * from daily_bread_publish('2026-09-15')`)).rejects.toThrow(
      /permission denied/,
    )
    await expect(db.query(`select * from daily_bread_publication_attempts`)).rejects.toThrow(
      /permission denied/,
    )
    await db.exec(`RESET ROLE`)
  })

  it('the service role can run the pipeline functions', async () => {
    await db.exec(`SET ROLE service_role`)
    const [acq] = await rows(db, `select * from daily_bread_acquire_assembly('2026-09-14', 'svc')`)
    expect(acq.acquired).toBe(true)
    await db.exec(`RESET ROLE`)
  })

  it('is reversible: the rollback refuses without confirmation, then removes exactly what the migration made', async () => {
    const objects = async () => ({
      tables: (await rows(db, `select tablename from pg_tables where schemaname = 'public' and tablename like 'daily_bread%' order by 1`)).map((r) => r.tablename),
      functions: (await rows(db, `select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'daily_bread%' order by 1`)).map((r) => r.proname),
    })
    await db.exec(`CREATE TABLE public.unrelated (id int); INSERT INTO public.unrelated VALUES (1);`)
    await assembleReady(db, '2026-09-14')
    await rows(db, `select * from daily_bread_publish('2026-09-14')`)
    const before = await objects()
    expect(before.tables).toEqual(['daily_bread_edition_revisions', 'daily_bread_editions', 'daily_bread_publication_attempts'])
    expect(before.functions).toHaveLength(9)

    await expect(db.exec(ROLLBACK)).rejects.toThrow(/rollback refused/)
    await db.exec('ROLLBACK') // clear the aborted transaction, as psql would
    expect(await objects()).toEqual(before)

    await db.exec(`SET daily_bread.confirm_rollback = 'destroy-archive'; ${ROLLBACK}`)
    expect(await objects()).toEqual({ tables: [], functions: [] })
    expect(await rows(db, `select id from public.unrelated`)).toEqual([{ id: 1 }])

    // And forward again: the migration re-applies cleanly after a rollback.
    await db.exec(MIGRATION)
    expect(await objects()).toEqual(before)
  })
})
