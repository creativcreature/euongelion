'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { DIVINE_NAMES } from '@/data/who-is-god-names'
import { PERSONS, SHARED_ATTRIBUTES } from '@/data/who-is-god-attributes'
import { V } from '@/data/who-is-god-verses'
import ScrubbedFilm from './ScrubbedFilm'
import { useReveal } from './useReveal'

function Scripture({
  k,
  className,
}: {
  k: keyof typeof V
  className?: string
}) {
  const v = V[k]
  return (
    <figure className={`wig-scripture ${className ?? ''}`}>
      <blockquote>{v.text}</blockquote>
      <figcaption>{v.ref}</figcaption>
    </figure>
  )
}

function Chapter({
  n,
  kicker,
  title,
  children,
  plate,
  id,
}: {
  n: string
  kicker: string
  title: string
  children: React.ReactNode
  plate?: string
  id: string
}) {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="wig-chapter" id={id} data-in="false">
      <div className="wig-chapter-head">
        <p className="wig-num">{n}</p>
        <p className="wig-kicker">{kicker}</p>
        <h2 className="wig-title">{title}</h2>
      </div>
      {plate ? (
        <div className="wig-plate" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plate} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}
      <div className="wig-chapter-body">{children}</div>
    </section>
  )
}

/** The four movements of the story, revealed as you pass them. */
function Movements() {
  const ref = useReveal<HTMLDivElement>(0.1)
  const movements = [
    {
      t: 'Creation',
      s: 'It begins good',
      b: 'A world is made on purpose, by someone, and it is called good. People are made deliberately and made like him.',
      v: 'gen1_27' as const,
    },
    {
      t: 'Rupture',
      s: 'It breaks',
      b: 'People decide they would rather be their own god. The relationship tears, and everything downstream of it tears too — us from him, us from each other, us from ourselves.',
      v: 'gen3_9' as const,
    },
    {
      t: 'Rescue',
      s: 'He comes after us',
      b: 'Instead of leaving, God comes in person. This is the part of the story Jesus is. He lives the life we could not, dies the death we had coming, and does not stay dead.',
      v: 'rom5_8' as const,
    },
    {
      t: 'Restoration',
      s: 'He puts it back',
      b: 'The story does not end with people escaping to heaven. It ends with God coming down to live with us, and everything broken being made new.',
      v: 'rev21_5' as const,
    },
  ]
  return (
    <div ref={ref} className="wig-movements" data-in="false">
      {movements.map((m, i) => (
        <article
          className="wig-movement"
          key={m.t}
          style={{ '--i': i } as React.CSSProperties}
        >
          <p className="wig-movement-index">{String(i + 1).padStart(2, '0')}</p>
          <h3 className="wig-movement-title">{m.t}</h3>
          <p className="wig-movement-sub">{m.s}</p>
          <p className="wig-movement-body">{m.b}</p>
          <Scripture k={m.v} className="wig-scripture-tight" />
        </article>
      ))}
    </div>
  )
}

/** The names. Click one; it opens. Keyboard and screen-reader complete. */
function TheNames() {
  const ref = useReveal<HTMLDivElement>(0.08)
  const [open, setOpen] = useState<string>(DIVINE_NAMES[0].id)
  return (
    <div ref={ref} className="wig-names" data-in="false">
      <ul className="wig-names-list">
        {DIVINE_NAMES.map((n, i) => {
          const isOpen = open === n.id
          return (
            <li key={n.id} className="wig-name" data-open={isOpen}>
              <button
                type="button"
                className="wig-name-btn"
                aria-expanded={isOpen}
                aria-controls={`name-panel-${n.id}`}
                onClick={() => setOpen(isOpen ? '' : n.id)}
                style={{ '--i': i } as React.CSSProperties}
              >
                <span className="wig-name-heb" lang="he" dir="rtl">
                  {n.hebrew}
                </span>
                <span className="wig-name-meta">
                  <span className="wig-name-translit">{n.translit}</span>
                  <span className="wig-name-gloss">{n.gloss}</span>
                </span>
                <span className="wig-name-mark" aria-hidden="true" />
              </button>
              <div
                id={`name-panel-${n.id}`}
                className="wig-name-panel"
                role="region"
                aria-label={`About ${n.translit}`}
                hidden={!isOpen}
              >
                <p className="wig-name-note">{n.note}</p>
                <figure className="wig-scripture wig-scripture-tight">
                  <blockquote>{n.verse.text}</blockquote>
                  <figcaption>{n.verse.ref}</figcaption>
                </figure>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The comparison. Two questions, honestly answered side by side. */
function Comparison() {
  const ref = useReveal<HTMLDivElement>(0.06)
  const [view, setView] = useState<'shared' | 'distinct'>('shared')
  return (
    <div ref={ref} className="wig-compare" data-in="false">
      <div className="wig-toggle" role="tablist" aria-label="Compare the three">
        <button
          role="tab"
          type="button"
          aria-selected={view === 'shared'}
          className="wig-toggle-btn"
          onClick={() => setView('shared')}
        >
          What is the same
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={view === 'distinct'}
          className="wig-toggle-btn"
          onClick={() => setView('distinct')}
        >
          What is different
        </button>
      </div>

      {view === 'shared' ? (
        <>
          <p className="wig-compare-lede">
            Every one of these is said in Scripture about the Father, about
            Jesus, and about the Spirit. That is the whole reason Christians say{' '}
            <em>one</em> God rather than three.
          </p>
          <div className="wig-table-scroll">
            <table className="wig-table">
              <caption className="sr-only">
                Attributes Scripture applies to the Father, the Son and the Holy
                Spirit alike
              </caption>
              <thead>
                <tr>
                  <th scope="col">Attribute</th>
                  <th scope="col">The Father</th>
                  <th scope="col">The Son</th>
                  <th scope="col">The Spirit</th>
                </tr>
              </thead>
              <tbody>
                {SHARED_ATTRIBUTES.map((a) => (
                  <tr key={a.id}>
                    <th scope="row">
                      <span className="wig-attr-label">{a.label}</span>
                      <span className="wig-attr-plain">{a.plain}</span>
                    </th>
                    <td>
                      <span className="wig-cell-ref">{a.father.ref}</span>
                      <span className="wig-cell-text">{a.father.text}</span>
                    </td>
                    <td>
                      <span className="wig-cell-ref">{a.son.ref}</span>
                      <span className="wig-cell-text">{a.son.text}</span>
                    </td>
                    <td>
                      <span className="wig-cell-ref">{a.spirit.ref}</span>
                      <span className="wig-cell-text">{a.spirit.text}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <p className="wig-compare-lede">
            They are not three names for one person wearing three hats. They
            speak to each other, send each other, and love each other. The
            difference is not what they are — it is what each one does.
          </p>
          <div className="wig-persons">
            {PERSONS.map((p, i) => (
              <article
                className="wig-person"
                key={p.id}
                style={{ '--i': i } as React.CSSProperties}
              >
                <h3 className="wig-person-title">{p.label}</h3>
                <p className="wig-person-body">{p.plain}</p>
                <figure className="wig-scripture wig-scripture-tight">
                  <blockquote>{p.verse.text}</blockquote>
                  <figcaption>{p.verse.ref}</figcaption>
                </figure>
              </article>
            ))}
          </div>
          <div className="wig-once">
            <p className="wig-once-kicker">All three, in one moment</p>
            <p className="wig-once-body">
              At the river where Jesus was baptised, all three are present at
              once, doing different things. It is the clearest picture in the
              Bible of what Christians mean.
            </p>
            <Scripture k="mat3_16" />
            <Scripture k="mat3_17" />
          </div>
        </>
      )}
    </div>
  )
}

export default function WhoIsGod() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Progressive enhancement gate. The staged entrances start at opacity 0, and
  // that hidden state is scoped in CSS to [data-js="true"] — set only once this
  // effect runs. Without JavaScript (or before hydration, or if the bundle
  // fails) the attribute is absent, no element is ever hidden, and the whole
  // page reads as plain scrolling prose. The animation is the enhancement; the
  // words are never contingent on it.
  useEffect(() => {
    rootRef.current?.setAttribute('data-js', 'true')
  }, [])

  return (
    <div className="wig" ref={rootRef}>
      <a className="wig-skip" href="#wig-start">
        Skip the opening film
      </a>

      <ScrubbedFilm
        src="/video/who-is-god-genesis.mp4"
        poster="/images/site/series/genesis-two-stories-of-creation.webp"
        track={320}
      >
        <p className="wig-hero-kicker">An introduction, from the beginning</p>
        <h1 className="wig-hero-title">
          You have heard the words <em>God</em> and <em>Jesus</em>.
          <span>This is what they actually mean.</span>
        </h1>
        <p className="wig-hero-sub">
          No church background assumed. No jargon left undefined. Nothing you
          have to agree to. Just scroll.
        </p>
        <p className="wig-hero-hint" aria-hidden="true">
          Scroll
        </p>
      </ScrubbedFilm>

      <main id="wig-start" className="wig-main">
        <Chapter
          id="honest"
          n="01"
          kicker="Before anything else"
          title="Start here, knowing nothing"
        >
          <p className="wig-lede">
            Most explanations of Christianity start in the middle. They assume
            you already know what sin means, what a gospel is, why a cross
            matters. This one does not.
          </p>
          <p>
            Here is the shape of what follows. There is a God. He is not a vague
            force — he is someone, with a name, who speaks. That God is one, and
            yet Christians talk about him as Father, Son and Spirit, which we
            will take slowly. The Bible is not a rulebook; it is his story, and
            it has four movements. Jesus is the turn in the middle of it. And
            salvation — the word that gets used most and explained least — is
            what happens when that story reaches you.
          </p>
          <p>You can stop at any point. Nothing here asks you to pretend.</p>
        </Chapter>

        <Chapter
          id="someone"
          n="02"
          kicker="What kind of thing are we talking about"
          title="Not a force. Someone."
          plate="/images/site/series/what-is-christianity.webp"
        >
          <p className="wig-lede">
            The first claim is not that a god exists. It is that the one who
            exists is a <em>person</em> — with intentions, speech, and a
            character you can come to know.
          </p>
          <p>
            The Bible opens without argument. It does not try to prove him. It
            simply says what he did, and the sentence is deliberately plain.
          </p>
          <Scripture k="gen1_1" />
          <p>
            Three verses later he speaks, and speech is the point. A force does
            not speak. Something that speaks can be answered.
          </p>
          <Scripture k="gen1_3" />
          <p>
            He is described as being outside of time and not tiring, which is a
            way of saying he is not one more thing inside the universe — he is
            the reason there is a universe at all.
          </p>
          <Scripture k="isa40_28" />
          <p>
            And when a Christian named Paul explained this to a city full of
            people who had never heard any of it — the closest situation in the
            Bible to where you may be standing — he did not start with rules
            either. He started with nearness.
          </p>
          <Scripture k="act17_27" />
        </Chapter>

        <Chapter
          id="story"
          n="03"
          kicker="What the Bible actually is"
          title="A story, in four movements"
          plate="/images/site/series/the-word-before-words.webp"
        >
          <p className="wig-lede">
            The Bible is a library — 66 documents, written across roughly 1,500
            years, by kings, farmers, fishermen, a doctor, a tax collector. It
            reads like a rulebook only if you open it in the wrong place.
          </p>
          <p>
            Read from end to end it is one story with one plot. Jesus himself
            said the whole thing was pointing somewhere, and that he was where
            it pointed.
          </p>
          <Scripture k="luk24_27" />
          <Movements />
          <p className="wig-aside">
            If you only remember one thing from this page, make it the shape:{' '}
            <strong>good, broken, rescued, restored.</strong> Everything else in
            Christianity hangs on that frame.
          </p>
        </Chapter>

        <Chapter
          id="names"
          n="04"
          kicker="His names, in the language they were written in"
          title="Naming is how he introduces himself"
          plate="/images/site/series/in-the-beginning-week-1.webp"
        >
          <p className="wig-lede">
            Most of the Old Testament was written in Hebrew, which reads right
            to left. God is not given one name in it. He is given many, and each
            one arrives at a moment when someone needed exactly that thing to be
            true.
          </p>
          <p>
            That is the pattern worth noticing: these are not titles invented by
            theologians. They are mostly what people called him after he showed
            up. Open any of them.
          </p>
          <TheNames />
          <p className="wig-aside">
            One name governs all the others. When Moses asked what to call him,
            the answer was not a description — it was existence itself, spoken
            in the first person.
          </p>
          <Scripture k="exo3_14" />
        </Chapter>

        <Chapter
          id="three"
          n="05"
          kicker="The part everyone finds strange"
          title="One God. Father, Son, and Spirit."
          plate="/images/site/series/he-cannot-deny-himself.webp"
        >
          <p className="wig-lede">
            Christians insist on two things at once, and refuse to drop either.
            There is one God — not three. And the Father is God, Jesus is God,
            and the Holy Spirit is God.
          </p>
          <p>
            The oneness is not negotiable. It is the oldest line in Jewish
            prayer, and Jesus quoted it himself.
          </p>
          <Scripture k="deu6_4" />
          <p>
            The word <em>Trinity</em> is not in the Bible. It is a later
            shorthand for what the Bible keeps doing anyway. The honest way to
            see it is to put the claims side by side — what is said of all three
            alike, and what is said of only one.
          </p>
          <Comparison />
          <p className="wig-aside">
            Nobody claims this is easy. It is not a puzzle to be solved so much
            as a person to be met — and it is the difference between a God who
            sends help and a God who comes himself.
          </p>
        </Chapter>

        <Chapter
          id="jesus"
          n="06"
          kicker="The turn in the middle of the story"
          title="Why Jesus, and not just good advice"
          plate="/images/site/series/why-jesus.webp"
        >
          <p className="wig-lede">
            If the problem were ignorance, God could have sent information. If
            it were bad behaviour, he could have sent rules. He had already sent
            rules. The problem was a broken relationship, and relationships are
            not repaired by memos.
          </p>
          <p>
            The Bible&rsquo;s word for the break is <em>sin</em>. It does not
            mainly mean rule-breaking. It means aiming at the wrong thing —
            living as though you were the centre. Its reach is total, which is
            oddly levelling: nobody is further along than anybody else.
          </p>
          <Scripture k="rom3_23" />
          <p>
            So God did not send a message. He came in person. That is the claim
            that separates Christianity from every other religion: not that we
            climbed up, but that he came down.
          </p>
          <Scripture k="jhn1_14" />
          <p>
            He lived an ordinary human life — hungry, tired, tempted, grieving —
            without ever aiming at the wrong thing.
          </p>
          <Scripture k="heb4_15" />
          <p>
            And then he did the thing the whole story had been leaning toward.
            He took the consequence that belonged to us, and handed over what
            belonged to him. Christians call this the exchange.
          </p>
          <Scripture k="2co5_21" />
          <p>
            Then the grave did not hold. The earliest summary of Christian
            belief we have — older than any of the four Gospels — is four short
            clauses long.
          </p>
          <Scripture k="1co15_3" />
          <Scripture k="1co15_4" />
        </Chapter>

        <Chapter
          id="salvation"
          n="07"
          kicker="The word used most and explained least"
          title="What salvation actually is"
          plate="/images/site/series/what-is-the-gospel.webp"
        >
          <p className="wig-lede">
            Salvation is not primarily about going somewhere when you die. It is
            about a relationship being restored now, with dying no longer being
            the end of it.
          </p>
          <p>
            The critical word is <em>gift</em>. Every other system in the world
            is earned. This one specifically is not — and the reason given is
            that otherwise it would become something to boast about.
          </p>
          <Scripture k="eph2_8" />
          <Scripture k="eph2_9" />
          <p>
            What is asked in return is not a performance. It is trust, said out
            loud — which is what the word <em>faith</em> means. Not certainty
            about everything. Trust in someone.
          </p>
          <Scripture k="rom10_9" />
          <p>
            And what it makes you is not a member or a customer. The word used
            is family.
          </p>
          <Scripture k="jhn1_12" />
          <p>
            If you have spent your life assuming you are too far gone for this,
            the sentence below is the one to sit with. It is not a promise that
            you did nothing wrong. It is a promise about what is no longer being
            counted.
          </p>
          <Scripture k="rom8_1" />
        </Chapter>

        <Chapter
          id="next"
          n="08"
          kicker="If you want to keep going"
          title="What you could do next"
        >
          <p className="wig-lede">
            Nothing here needs a decision tonight. But if any of it landed,
            there are three honest next steps, in order of how much they ask of
            you.
          </p>
          <ol className="wig-next">
            <li>
              <span className="wig-next-n">01</span>
              <div>
                <h3>Read a little of it yourself</h3>
                <p>
                  Start with the Gospel of John — it is the one written for
                  people outside. Five minutes a day is genuinely enough.
                </p>
                <Link className="wig-next-link" href="/daily-bread">
                  Today&rsquo;s reading &rarr;
                </Link>
              </div>
            </li>
            <li>
              <span className="wig-next-n">02</span>
              <div>
                <h3>Take one question at a time</h3>
                <p>
                  These series each answer a single question slowly, without
                  assuming you already agree.
                </p>
                <Link className="wig-next-link" href="/series">
                  Browse the series &rarr;
                </Link>
              </div>
            </li>
            <li>
              <span className="wig-next-n">03</span>
              <div>
                <h3>Say something honest</h3>
                <p>
                  Prayer is not a formula and there are no special words.
                  &ldquo;I do not know if you are there, but I am
                  listening&rdquo; is a real prayer, and it has been prayed by
                  better people than you and me.
                </p>
              </div>
            </li>
          </ol>
          <p className="wig-aside wig-aside-final">
            And if what you need right now is not a devotional but a phone
            number — food, a bed tonight, the power bill, a doctor, someone at
            three in the morning — that is here too, free, with nothing to
            believe first.{' '}
            <Link className="wig-next-link" href="/seeking-help-georgia">
              Seeking help in Georgia &rarr;
            </Link>
          </p>
        </Chapter>
      </main>
    </div>
  )
}
