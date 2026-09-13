// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getVerse } from '@/lib/bible/getVerse'
import { COMIC_TEMPLATES } from '@/lib/daily-bread/comic/templates'
import { verifyComicCaptions } from '@/lib/daily-bread/comic/validate'

const lookup = async (ref: string) => (await getVerse(ref, 'BSB')).text

describe('comic captions are verbatim BSB', () => {
  it('every template reference resolves in the BSB corpus', async () => {
    for (const template of COMIC_TEMPLATES) {
      const text = await lookup(template.scriptureReference)
      expect(text.length, template.scriptureReference).toBeGreaterThan(0)
    }
  })

  it('every caption is a substring of its reference text', async () => {
    for (const template of COMIC_TEMPLATES) {
      expect(await verifyComicCaptions(template, lookup), template.id).toEqual(
        [],
      )
    }
  })

  it('catches a caption that is close but not verbatim', async () => {
    const template = COMIC_TEMPLATES.find((t) => t.id === 'the-lost-sheep')!
    const altered = {
      ...template,
      panels: template.panels.map((p) =>
        p.caption ? { ...p, caption: 'go after the one who is lost' } : p,
      ),
    }
    expect(await verifyComicCaptions(altered, lookup)).toHaveLength(1)
  })
})
