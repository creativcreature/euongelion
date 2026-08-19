/**
 * The Daily Bread — The Question (SA-092).
 *
 * One reflection question a day. This bank is OUR OWN editorial voice —
 * written once, in the PRACTICES register (plain, un-preachy, one sentence,
 * genuinely askable), and shipped founder-reviewed exactly the way the
 * PRACTICES array shipped. The generator only SELECTS; re-printing shipped
 * editorial is not a new claim needing new review, which is why the rows
 * publish directly. A net-new question pipeline (LLM or otherwise) must NOT
 * reuse this path — it would be invented voice landing as drafts in the
 * review queue.
 *
 * DETERMINISM: days-since-epoch modulo the bank — consecutive days walk
 * consecutive indexes, so no question repeats within `bank.length` days.
 */
import type { EditionItem, QuestionPayload } from '../kinds'

/**
 * The bank. Every question is one sentence, askable of anyone, and answerable
 * only honestly — no question here has a right answer.
 */
export const QUESTION_BANK: readonly string[] = [
  'What did you skim past this morning that deserved a second look?',
  'Which worry have you been carrying that you have never said out loud?',
  'Who was kind to you this week, and did they hear about it?',
  'What are you pretending not to know?',
  'What do you reach for first each morning, and what does that say about what you trust?',
  'Which person in your life is hardest to pray for right now?',
  'What would change about today if you believed rest was allowed?',
  'What did you say yes to this week that you should have said no to?',
  'Where did you see something good yesterday that you forgot to name?',
  'What are you waiting for God to do that you have not yet asked for plainly?',
  'Which of your plans would survive being prayed about honestly?',
  'Who taught you to pray, and what did they get right?',
  'What would you attempt today if failure did not embarrass you?',
  'Which verse do you avoid because it knows you too well?',
  'What are you calling busyness that is actually avoidance?',
  'When did you last change your mind about something that matters?',
  'What do you want that you have never told anyone?',
  'Whose forgiveness are you still living without?',
  'What did you learn the hard way that someone younger needs to hear gently?',
  'Where does your mind go when it is finally quiet?',
  'Which small obedience have you been postponing until it feels bigger?',
  'What are you holding onto that was given to you to hand on?',
  'When you say you have no time, what are you actually protecting?',
  'What grief have you scheduled around instead of sitting with?',
  'Which conversation are you rehearsing instead of having?',
  'What would generosity look like at the scale of your actual budget?',
  'Who gets your leftover attention, and do they know it?',
  'What did you once believe eagerly that you now believe carefully?',
  'Where are you strong in a way that has quietly become a weakness?',
  'What would you pray for if you believed the answer might be yes?',
  'Which of your habits would you defend the hardest, and why that one?',
  'What is one thing you know is true that your schedule contradicts?',
  'When did you last let someone help you?',
  'What are you tired of that rest has not fixed?',
  'Which stranger stayed with you this week, and what were they carrying?',
  'What do you keep calling a season that has become a settlement?',
  'What would slowing down actually cost you?',
  'Who in your life is easiest to overlook because they are always there?',
  'Which apology have you polished so long it has expired?',
  'Which fear runs more of your calendar than you admit?',
  'What did today already give you that you have not acknowledged?',
  'What question do you hope nobody asks you this week?',
  'Where have you settled for being right instead of being kind?',
  'What promise did you make that only you remember?',
  'Which part of your day would you never put in words when you pray?',
  'What have you decided is impossible without ever attempting it?',
] as const

/** Days since 1970-01-01 UTC. The rotation index. */
function daysSinceEpoch(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(ms)) throw new Error('question: invalid Date')
  if (ms < 0) {
    throw new Error(
      'question: the rotation is only defined from 1970-01-01 forward',
    )
  }
  return Math.floor(ms / 86_400_000)
}

/** Which question the day carries. Exported for the tests. */
export function questionForDate(date: Date): string {
  return QUESTION_BANK[daysSinceEpoch(date) % QUESTION_BANK.length]
}

/** The day's question. Slot 0, published — shipped pre-reviewed editorial,
 * selected not written (see the file comment). */
export async function generateQuestion(
  date: Date,
): Promise<EditionItem<'question'>[]> {
  const payload: QuestionPayload = { question: questionForDate(date) }

  return [
    {
      kind: 'question',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
