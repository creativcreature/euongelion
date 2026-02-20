import { describe, expect, it } from 'vitest'
import {
  clampScriptureSnippet,
  scriptureLeadFromFramework,
  scriptureLeadPartsFromFramework,
} from '@/lib/scripture-reference'

describe('scriptureLeadFromFramework', () => {
  it('returns verse text with reference when framework includes both', () => {
    expect(
      scriptureLeadFromFramework(
        'John 14:27 - Peace I give you, not as the world gives',
      ),
    ).toBe('Peace I give you, not as the world gives (John 14:27)')
  })

  it('handles multiple references with verse text', () => {
    expect(
      scriptureLeadFromFramework(
        'Luke 17:21 + Matthew 6:33 - The kingdom is in your midst. Seek it first.',
      ),
    ).toBe(
      'The kingdom is in your midst. Seek it first. (Luke 17:21 + Matthew 6:33)',
    )
  })

  it('returns normalized reference text when no verse fragment is present', () => {
    expect(scriptureLeadFromFramework('  Psalm   23:1  ')).toBe('Psalm 23:1')
  })
})

describe('scriptureLeadPartsFromFramework', () => {
  it('returns reference and snippet separately', () => {
    expect(
      scriptureLeadPartsFromFramework(
        'John 14:27 - Peace I give you, not as the world gives',
      ),
    ).toEqual({
      reference: 'John 14:27',
      snippet: 'Peace I give you, not as the world gives',
    })
  })

  it('handles empty frameworks safely', () => {
    expect(scriptureLeadPartsFromFramework('')).toEqual({
      reference: '',
      snippet: '',
    })
  })
})

describe('clampScriptureSnippet', () => {
  it('truncates deterministically with ellipsis', () => {
    expect(
      clampScriptureSnippet(
        'Seek first the kingdom of God and his righteousness, and all these things will be added to you.',
        42,
      ),
    ).toBe('Seek first the kingdom of God and his r...')
  })
})
