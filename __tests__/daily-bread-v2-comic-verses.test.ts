// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getVerse } from '@/lib/bible/getVerse'
import type { Edition } from '@/lib/edition/store'
import { composeComic } from '@/lib/daily-bread/comic/chain'
import { COMIC_TEMPLATES } from '@/lib/daily-bread/comic/templates'
import { verifyComicCaptions } from '@/lib/daily-bread/comic/validate'
import type { PrimaryScripture } from '@/lib/daily-bread/types'

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

  it('a generated script that writes blank captions on the other panels is accepted (gpt-5-nano, 2026-09-14)', async () => {
    const template = COMIC_TEMPLATES.find((t) => t.id === 'the-lost-sheep')!
    const verse = await getVerse(template.scriptureReference, 'BSB')
    let blankIndex = 0
    const reply = {
      title: template.title,
      scriptureReference: template.scriptureReference,
      panels: template.panels.map((p) => (p.caption ? p : { ...p, caption: blankIndex++ === 0 ? '' : null })),
    }
    const out = await composeComic({
      dateSlug: '2026-09-15',
      scripture: { reference: template.scriptureReference, text: verse.text } as PrimaryScripture,
      liveItems: {} as Edition,
      frameTemplateId: template.id,
      recentComicIds: [],
      recentEditionDates: [],
      providers: [
        {
          id: 'openai',
          model: 'gpt-5-nano',
          available: () => true,
          generate: async () => ({ text: JSON.stringify(reply), model: 'gpt-5-nano' }),
        },
      ],
      lookup: async (ref) => {
        const v = await getVerse(ref, 'BSB')
        return { canonical: ref, text: v.text }
      },
      repo: { getEdition: async () => null },
      sleep: async () => {},
    })
    expect(out.level).toBe('generated-script')
    expect(out.module?.script?.panels.filter((p) => 'caption' in p)).toHaveLength(1)
  })
})
