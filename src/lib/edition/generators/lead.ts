/**
 * The Sunday lead — a net-new feature weekly (SA-090 / F-136).
 *
 * Founder-locked hybrid: rotation Monday–Saturday (the page's existing
 * pickTodaySlug logic, untouched), one genuinely new feature each SUNDAY,
 * composed through generateGroundedDay — the same verbatim-scripture,
 * grounded-lexicon, BM25-commentary pipeline that composes custom plans.
 * Full quality or nothing (Rule 8); the result lands as a DRAFT and passes
 * the founder's queue before it prints.
 *
 * The 52 briefs below are the year's editorial calendar for the Sunday
 * paper: our own voice choosing theme and text — the composition itself is
 * grounded by the pipeline.
 */
import { generateGroundedDay } from '@/lib/soul-audit/grounded-weave'
import type { EditionItem } from '../kinds'

interface LeadBrief {
  theme: string
  scriptureReference: string
  /** The reader-condition this speaks to — the weave's 'struggle' input. */
  struggle: string
}

/** One brief per ISO week, 52 weeks. Ordered so the great feasts land near
 * their season without pretending to be a lectionary. */
export const SUNDAY_BRIEFS: LeadBrief[] = [
  {
    theme: 'Beginnings that start in the dark',
    scriptureReference: 'Genesis 1:1-5',
    struggle: 'starting over when nothing feels new',
  },
  {
    theme: 'The God who calls by name',
    scriptureReference: 'Exodus 3:1-6',
    struggle: 'feeling anonymous and overlooked',
  },
  {
    theme: 'Bread you did not bake',
    scriptureReference: 'Exodus 16:13-21',
    struggle: 'the anxiety of providing for yourself',
  },
  {
    theme: 'The Lord is my shepherd',
    scriptureReference: 'Psalm 23:1-6',
    struggle: 'exhaustion that rest does not fix',
  },
  {
    theme: 'A clean heart, created',
    scriptureReference: 'Psalm 51:1-12',
    struggle: 'guilt that apology has not moved',
  },
  {
    theme: 'Deep calls to deep',
    scriptureReference: 'Psalm 42:1-8',
    struggle: 'a faith that has gone quiet',
  },
  {
    theme: 'Wings like eagles',
    scriptureReference: 'Isaiah 40:28-31',
    struggle: 'burnout and the myth of pushing through',
  },
  {
    theme: 'The suffering servant',
    scriptureReference: 'Isaiah 53:1-6',
    struggle: 'wondering whether God understands pain',
  },
  {
    theme: 'New every morning',
    scriptureReference: 'Lamentations 3:19-26',
    struggle: 'grief that has settled in to stay',
  },
  {
    theme: 'Dry bones can live',
    scriptureReference: 'Ezekiel 37:1-10',
    struggle: 'a situation past all reasonable hope',
  },
  {
    theme: 'Rend your heart',
    scriptureReference: 'Joel 2:12-13',
    struggle: 'the difference between regret and return',
  },
  {
    theme: 'What does the Lord require',
    scriptureReference: 'Micah 6:6-8',
    struggle: 'religion that has become performance',
  },
  {
    theme: 'The word became flesh',
    scriptureReference: 'John 1:1-14',
    struggle: 'a God who feels abstract and far away',
  },
  {
    theme: 'Blessed are the poor in spirit',
    scriptureReference: 'Matthew 5:1-12',
    struggle: 'feeling disqualified from the spiritual life',
  },
  {
    theme: 'Do not worry about tomorrow',
    scriptureReference: 'Matthew 6:25-34',
    struggle: 'anxiety about what has not happened yet',
  },
  {
    theme: 'Come to me, all who are weary',
    scriptureReference: 'Matthew 11:28-30',
    struggle: 'carrying more than you were built for',
  },
  {
    theme: 'The sower went out',
    scriptureReference: 'Matthew 13:1-9',
    struggle: 'effort that seems to produce nothing',
  },
  {
    theme: 'Lord, save me',
    scriptureReference: 'Matthew 14:22-33',
    struggle: 'faith failing exactly when it is needed',
  },
  {
    theme: 'Forgive seventy times seven',
    scriptureReference: 'Matthew 18:21-35',
    struggle: 'an offence you cannot put down',
  },
  {
    theme: 'The least of these',
    scriptureReference: 'Matthew 25:31-40',
    struggle: 'faith that never leaves the head',
  },
  {
    theme: 'He is not here; he is risen',
    scriptureReference: 'Matthew 28:1-10',
    struggle: 'wondering whether any of it is true',
  },
  {
    theme: 'The friend through the roof',
    scriptureReference: 'Mark 2:1-12',
    struggle: 'needing help you cannot ask for',
  },
  {
    theme: 'Who touched me?',
    scriptureReference: 'Mark 5:25-34',
    struggle: 'a long private suffering nobody knows about',
  },
  {
    theme: 'I believe; help my unbelief',
    scriptureReference: 'Mark 9:14-24',
    struggle: 'doubt inside faith',
  },
  {
    theme: 'What do you want me to do for you?',
    scriptureReference: 'Mark 10:46-52',
    struggle: 'not knowing what to pray for',
  },
  {
    theme: 'The widow’s two coins',
    scriptureReference: 'Mark 12:41-44',
    struggle: 'feeling your contribution is too small to matter',
  },
  {
    theme: 'Good news of great joy',
    scriptureReference: 'Luke 2:8-20',
    struggle: 'joy that feels naive in a hard world',
  },
  {
    theme: 'The nets on the other side',
    scriptureReference: 'Luke 5:1-11',
    struggle: 'competence exhausted, told to try again',
  },
  {
    theme: 'The good Samaritan',
    scriptureReference: 'Luke 10:25-37',
    struggle: 'compassion fatigue and drawn lines',
  },
  {
    theme: 'One thing is necessary',
    scriptureReference: 'Luke 10:38-42',
    struggle: 'busyness as a way of not being present',
  },
  {
    theme: 'Teach us to pray',
    scriptureReference: 'Luke 11:1-13',
    struggle: 'not knowing how to pray at all',
  },
  {
    theme: 'The rich fool’s barns',
    scriptureReference: 'Luke 12:13-21',
    struggle: 'security that is really hoarding',
  },
  {
    theme: 'The prodigal and the elder brother',
    scriptureReference: 'Luke 15:11-32',
    struggle: 'resenting grace given to someone else',
  },
  {
    theme: 'One came back',
    scriptureReference: 'Luke 17:11-19',
    struggle: 'a life without gratitude in it',
  },
  {
    theme: 'The tax collector’s prayer',
    scriptureReference: 'Luke 18:9-14',
    struggle: 'comparing your soul to other people’s',
  },
  {
    theme: 'Zacchaeus, come down',
    scriptureReference: 'Luke 19:1-10',
    struggle: 'being known for the worst thing you did',
  },
  {
    theme: 'The road to Emmaus',
    scriptureReference: 'Luke 24:13-35',
    struggle: 'God present but unrecognized',
  },
  {
    theme: 'Born again — a teacher’s question',
    scriptureReference: 'John 3:1-17',
    struggle: 'religion learned young that no longer fits',
  },
  {
    theme: 'Water at the well',
    scriptureReference: 'John 4:7-26',
    struggle: 'thirsts that nothing has satisfied',
  },
  {
    theme: 'Do you want to be healed?',
    scriptureReference: 'John 5:1-9',
    struggle: 'an identity built around the wound',
  },
  {
    theme: 'Bread of life',
    scriptureReference: 'John 6:32-40',
    struggle: 'consuming much and being fed by none of it',
  },
  {
    theme: 'The light of the world',
    scriptureReference: 'John 8:12',
    struggle: 'walking in the dark of a long decision',
  },
  {
    theme: 'The good shepherd knows his own',
    scriptureReference: 'John 10:11-18',
    struggle: 'feeling like one of a crowd to God',
  },
  {
    theme: 'Jesus wept',
    scriptureReference: 'John 11:32-44',
    struggle: 'grief and the God who shows up late',
  },
  {
    theme: 'Unless a grain of wheat falls',
    scriptureReference: 'John 12:23-26',
    struggle: 'losses that might be plantings',
  },
  {
    theme: 'Let not your hearts be troubled',
    scriptureReference: 'John 14:1-7',
    struggle: 'fear of what comes next',
  },
  {
    theme: 'Abide in the vine',
    scriptureReference: 'John 15:1-11',
    struggle: 'productivity without connection',
  },
  {
    theme: 'Do you love me? Feed my sheep',
    scriptureReference: 'John 21:15-19',
    struggle: 'coming back after a public failure',
  },
  {
    theme: 'They devoted themselves',
    scriptureReference: 'Acts 2:42-47',
    struggle: 'faith attempted alone',
  },
  {
    theme: 'Nothing can separate us',
    scriptureReference: 'Romans 8:31-39',
    struggle: 'the fear of finally being abandoned',
  },
  {
    theme: 'The greatest of these',
    scriptureReference: '1 Corinthians 13:1-13',
    struggle: 'gifts outrunning love',
  },
  {
    theme: 'A new heaven and a new earth',
    scriptureReference: 'Revelation 21:1-7',
    struggle: 'hope that everything broken stays broken',
  },
]

/** ISO week number (1-53), UTC. */
export function isoWeekUTC(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
}

/**
 * Sundays only: compose the week's net-new lead as a DRAFT. Any other day
 * returns [] — rotation carries the front page and needs no row.
 *
 * Requires ANTHROPIC_API_KEY (the weave calls the brain router); the runner
 * surfaces a missing key as a loud failure, not a skipped section.
 */
export async function generateLead(date: Date): Promise<EditionItem<'lead'>[]> {
  if (date.getUTCDay() !== 0) return []

  const brief = SUNDAY_BRIEFS[(isoWeekUTC(date) - 1) % SUNDAY_BRIEFS.length]
  const result = await generateGroundedDay({
    struggle: brief.struggle,
    scriptureReference: brief.scriptureReference,
    theme: brief.theme,
    dayNumber: 1,
    totalDays: 1,
  })

  if (!result.verification.ok) {
    throw new Error(
      `Sunday lead failed grounded verification: ${result.verification.issues.join('; ')}`,
    )
  }

  const c = result.content
  // The weave's movement structure, laid out as the feature's body. Scripture
  // is quoted verbatim from the corpus by the pipeline itself.
  const body = [
    c.hookA,
    c.textB,
    c.centerC,
    c.christConnectionBPrime,
    c.returnAPrime,
  ]
    .filter(Boolean)
    .join('\n\n')

  return [
    {
      kind: 'lead',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'draft',
      payload: {
        mode: 'authored',
        title: c.title,
        standfirst: brief.theme,
        body,
        scriptureReference: c.scriptureReference,
        pullQuotes: c.reflectionQuestions.slice(0, 2),
      },
    },
  ]
}
