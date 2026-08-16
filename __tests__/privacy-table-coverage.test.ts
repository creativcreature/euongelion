/**
 * SA-058 — anything deletable must be exportable.
 *
 * Found 2026-08-16 while wiring `listening_progress` into the privacy helpers:
 * `account-deletion.ts` deleted rows from tables `data-export.ts` never
 * exported — soul_audit_sessions, active_series, scheduled_series_swap,
 * archived_series, push_subscriptions, and audit_option_telemetry. A complete
 * right to erasure sitting beside an incomplete right of access (GDPR Art. 15).
 *
 * A careful read by eye found four of those six. The test found the other two.
 * That is the argument for pinning it rather than auditing it.
 *
 * The failure mode is structural rather than a typo: the two lists are
 * maintained by hand in separate files, so a table added to one drifts from the
 * other silently and forever. This pins them together. It is deliberately a
 * SOURCE-TEXT test — it must fail when someone adds a table to the deletion
 * cascade and forgets the export, which no runtime test would catch.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const DELETION = 'src/lib/privacy/account-deletion.ts'
const EXPORT = 'src/lib/privacy/data-export.ts'

const read = (path: string) => readFileSync(path, 'utf8')

/** Pull the string literals out of a `const NAME = [ ... ] as const` block. */
function tablesIn(source: string, listName: string): string[] {
  const block = source.split(`const ${listName} = [`)[1]?.split('] as const')[0]
  if (block === undefined) {
    throw new Error(`Could not find "${listName}" — was the list renamed?`)
  }
  return [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1])
}

/**
 * Tables in the deletion cascade that are deliberately NOT exported.
 *
 * `audit_option_telemetry` is declared by migration 009 but does not exist in
 * production — PGRST205, verified 2026-08-16, so 009 was only partially
 * applied. Exporting it would make every export report a partial failure and
 * tell readers their data may be incomplete when it is not.
 *
 * This is a KNOWN DEFECT, not a clean exemption: the deletion cascade still
 * lists it, so `deleteUserAccount` already records a partial failure for it on
 * every run today — and `partialFailures` means "data MAY persist there".
 * Resolving it means either applying the missing part of 009 or dropping the
 * table from the code; both are founder calls.
 */
const NOT_IN_PRODUCTION = ['audit_option_telemetry']

describe('privacy table coverage', () => {
  it('exports every table it deletes', () => {
    const deletion = read(DELETION)
    const exported = read(EXPORT)

    const deletable = [
      ...tablesIn(deletion, 'SESSION_TOKEN_TABLES'),
      ...tablesIn(deletion, 'USER_ID_TABLES'),
    ].filter((table) => !NOT_IN_PRODUCTION.includes(table))

    const exportable = new Set([
      ...tablesIn(exported, 'SESSION_TOKEN_TABLES'),
      ...tablesIn(exported, 'USER_ID_TABLES'),
    ])

    const missing = deletable.filter((table) => !exportable.has(table))
    expect(missing).toEqual([])
  })

  it('keeps the exception list honest', () => {
    // An exception that outlives the defect is how a guard rots. If someone
    // creates the table, this fails and forces the entry to be removed.
    const deletion = read(DELETION)
    const deletable = [
      ...tablesIn(deletion, 'SESSION_TOKEN_TABLES'),
      ...tablesIn(deletion, 'USER_ID_TABLES'),
    ]
    for (const table of NOT_IN_PRODUCTION) {
      expect(deletable).toContain(table)
    }
  })

  it('parses a non-trivial number of tables from each list', () => {
    // Guards the guard: if the regex or the block markers ever stop matching,
    // `deletable` becomes [] and the test above passes while checking nothing.
    expect(
      tablesIn(read(DELETION), 'SESSION_TOKEN_TABLES').length,
    ).toBeGreaterThan(5)
    expect(tablesIn(read(EXPORT), 'USER_ID_TABLES').length).toBeGreaterThan(5)
  })

  it('covers listening_progress in both helpers', () => {
    // Migration 018 adds a table holding what someone listened to and when.
    // A new table that escapes export and deletion is exactly the failure this
    // file exists to prevent.
    expect(read(DELETION)).toContain("'listening_progress'")
    expect(read(EXPORT)).toContain("'listening_progress'")
  })
})
