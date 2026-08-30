'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { V } from '@/data/who-is-god-verses'
import CompareStage from './CompareStage'
import LightSpine from './LightSpine'
import NameStage from './NameStage'
import ProgressRail from './ProgressRail'
import Room from './Room'
import ScrubbedFilm from './ScrubbedFilm'
import StickyStepper from './StickyStepper'

const PLATE = '/images/site/who-is-god'

function Scripture({ k }: { k: keyof typeof V }) {
  const v = V[k]
  return (
    <figure className="wig-scripture">
      <blockquote>{v.text}</blockquote>
      <figcaption>{v.ref}</figcaption>
    </figure>
  )
}

/** Room 02 — God is someone, and speech is the evidence. */
function SomeoneStage() {
  return (
    <StickyStepper
      className="wig-someone-stepper"
      steps={[
        {
          key: 'made',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                The Bible does not open with an argument. It does not try to
                prove God. It just says what he did, in one short line.
              </p>
              <Scripture k="gen1_1" />
            </article>
          ),
        },
        {
          key: 'speaks',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                Three lines later he speaks. That is the whole point. A force
                does not speak. Weather does not speak. Something that speaks
                can be answered.
              </p>
              <Scripture k="gen1_3" />
            </article>
          ),
        },
        {
          key: 'near',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                A man named Paul once had to explain all this to a city that had
                never heard any of it. That is the closest thing in the Bible to
                where you may be standing right now. He did not start with
                rules. He started with how close God is.
              </p>
              <Scripture k="act17_27" />
            </article>
          ),
        },
      ]}
      stageLabel="A dark sea before light"
      stage={(key) => (
        <div className="wig-plate-stage" data-key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${PLATE}/deep.webp`} alt="" />
        </div>
      )}
    />
  )
}

/** Room 03 — the story, in four movements. The centrepiece. */
function StoryStage() {
  const movements = [
    {
      key: 'creation',
      plate: 'deep',
      t: 'It begins good',
      b: 'A world gets made on purpose. Not by accident. God looks at it and calls it good. People are made last, and made like him.',
      v: 'gen1_27' as const,
    },
    {
      key: 'break',
      plate: 'break',
      t: 'It breaks',
      b: 'People decide they would rather be their own god. The trust tears. And everything downstream of it tears too — us from him, us from each other, us from ourselves.',
      v: 'gen3_9' as const,
    },
    {
      key: 'rescue',
      plate: 'rescue',
      t: 'He comes after us',
      b: 'This is the part of the story Jesus is. God does not send a message. He comes himself. He lives the life we could not live and takes what we had coming.',
      v: 'rom5_8' as const,
    },
    {
      key: 'restore',
      plate: 'restore',
      t: 'He puts it right',
      b: 'It does not end with people escaping somewhere else. It ends with God coming down to live here, and everything broken made new.',
      v: 'rev21_5' as const,
    },
  ]
  return (
    <StickyStepper
      className="wig-story-stepper"
      steps={movements.map((m, i) => ({
        key: m.key,
        node: (
          <article className="wig-step">
            <p className="wig-step-n">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="wig-step-title">{m.t}</h3>
            <p className="wig-step-body">{m.b}</p>
            <Scripture k={m.v} />
          </article>
        ),
      }))}
      stageLabel="The four movements of the story"
      stage={(key) => {
        const m = movements.find((x) => x.key === key) ?? movements[0]
        return (
          <div className="wig-plate-stage" data-key={key}>
            {movements.map((x) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={x.key}
                src={`${PLATE}/${x.plate}.webp`}
                alt=""
                data-on={x.key === m.key}
              />
            ))}
          </div>
        )
      }}
    />
  )
}

/** Room 05 — the ninth hour. The one room where the light falls. */
function NinthHourStage() {
  return (
    <StickyStepper
      className="wig-ninth-stepper"
      steps={[
        {
          key: 'problem',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                If the problem were not knowing enough, God could have sent
                facts. If it were bad behaviour, he could have sent rules. He
                had already sent rules. The problem was a broken relationship,
                and you do not fix those with a memo.
              </p>
              <Scripture k="rom3_23" />
            </article>
          ),
        },
        {
          key: 'came',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                So he came himself. That is the line that separates this from
                every other religion. Not that we climbed up. That he came down.
              </p>
              <Scripture k="jhn1_14" />
              <p className="wig-step-body">
                He got hungry. He got tired. He cried at a friend&rsquo;s grave.
                Two words in the Bible say it best.
              </p>
              <Scripture k="jhn11_35" />
            </article>
          ),
        },
        {
          key: 'sixth',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                Then the sky went out. Two of the four gospels stop to tell you
                the time of day.
              </p>
              <Scripture k="mat27_45" />
            </article>
          ),
        },
        {
          key: 'ninth',
          node: (
            <article className="wig-step wig-step-heavy">
              <p className="wig-step-lede">
                At the ninth hour he called out. Not a calm death. A cry, with a
                question in it.
              </p>
              <Scripture k="mrk15_34" />
              <Scripture k="luk23_46" />
            </article>
          ),
        },
        {
          key: 'exchange',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                Here is what Christians say was happening. He took what belonged
                to us. He handed over what belonged to him. It is called the
                exchange.
              </p>
              <Scripture k="2co5_21" />
            </article>
          ),
        },
        {
          key: 'risen',
          node: (
            <article className="wig-step">
              <p className="wig-step-lede">
                Then the grave did not hold. The oldest summary of Christian
                belief we have is older than any of the four gospels, and it is
                four short lines long.
              </p>
              <Scripture k="1co15_3" />
              <Scripture k="1co15_4" />
              <Scripture k="mat28_6" />
            </article>
          ),
        },
      ]}
      stageLabel="A distant hill as darkness comes over the land"
      stage={(key) => (
        <div className="wig-plate-stage wig-plate-dip" data-key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${PLATE}/rescue.webp`} alt="" />
        </div>
      )}
    />
  )
}

export default function WhoIsGod() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Progressive enhancement gate. Staged entrances start hidden, and that hidden
  // state is scoped in CSS to [data-js="true"] — set only here. Without
  // JavaScript nothing is ever hidden and the page is plain, complete prose.
  useEffect(() => {
    rootRef.current?.setAttribute('data-js', 'true')
  }, [])

  return (
    <div className="wig" ref={rootRef}>
      <a className="wig-skip" href="#room-01">
        Skip the opening film
      </a>
      <LightSpine rootRef={rootRef} />
      <ProgressRail />

      {/* THE DOOR. Not a numbered room — the seven rooms are the story, and this
          is what you pass through to reach them. Three beats hand off across the
          scrub so no part of the track is ever empty; the first build faded to
          0.15 opacity at the halfway mark and stayed there, which is what the
          founder saw as "a completely blank section". */}
      <ScrubbedFilm
        src="/video/who-is-god-genesis.mp4"
        poster="/images/site/series/genesis-two-stories-of-creation.webp"
        track={220}
        beats={[
          'You have heard the words God and Jesus.',
          'This is what they actually mean.',
          'No church words. Nothing you have to agree to. Just scroll.',
        ]}
      />

      <main className="wig-main">
        <Room
          id="room-01"
          n="01"
          kicker="Start here, knowing nothing"
          title="Not a force. Someone."
          light={0.06}
          plate={`${PLATE}/deep.webp`}
        >
          <p className="wig-lede">
            Most explanations of this faith start in the middle. They assume you
            already know what sin means, or why a cross matters. This one does
            not.
          </p>
          <p>
            The first claim is not that a god exists. It is that the one who
            exists is <em>someone</em> — with a mind, a voice, and a character
            you can come to know. You can stop at any point. Nothing here asks
            you to pretend.
          </p>
          <SomeoneStage />
        </Room>

        <Room
          id="room-02"
          n="02"
          kicker="What the Bible actually is"
          title="A story, in four movements"
          light={0.18}
        >
          <p className="wig-lede">
            The Bible is a library. Sixty-six books, written over about 1,500
            years, by kings and farmers and fishermen, a doctor, a tax man. It
            reads like a rulebook only if you open it in the wrong place.
          </p>
          <p>
            Read start to finish it is one story with one plot. Jesus said the
            whole thing was pointing somewhere, and that he was where it
            pointed.
          </p>
          <Scripture k="luk24_27" />
          <StoryStage />
          <p className="wig-aside">
            If you remember one thing from this page, make it the shape:{' '}
            <strong>good, broken, rescued, put right.</strong> Everything else
            hangs on it.
          </p>
        </Room>

        <Room
          id="room-03"
          n="03"
          kicker="How he introduces himself"
          title="He is not given one name"
          light={0.4}
          plate={`${PLATE}/names.webp`}
        >
          <p className="wig-lede">
            Most of the Old Testament was written in Hebrew, which reads right
            to left. God is not given one name in it. He is given many, and each
            one shows up at the moment somebody needed that exact thing to be
            true.
          </p>
          <p>
            These are not titles thought up by scholars. They are mostly what
            people called him after he turned up.
          </p>
          <NameStage />
          <p className="wig-aside">
            One name governs the rest. When Moses asked what to call him, the
            answer was not a description. It was existence itself, spoken in the
            first person.
          </p>
          <Scripture k="exo3_14" />
        </Room>

        <Room
          id="room-04"
          n="04"
          kicker="The part everyone finds strange"
          title="One God. Father, Son, and Spirit."
          light={0.56}
        >
          <p className="wig-lede">
            Christians hold two things at once and refuse to drop either. There
            is one God, not three. And the Father is God, Jesus is God, and the
            Holy Spirit is God.
          </p>
          <p>
            The oneness is not up for grabs. It is the oldest line in Jewish
            prayer, and Jesus quoted it himself.
          </p>
          <Scripture k="deu6_4" />
          <p>
            The word <em>Trinity</em> is not in the Bible. It is later shorthand
            for what the Bible keeps doing anyway. The honest way to see it is
            to put the claims side by side.
          </p>
          <CompareStage />
          <p className="wig-aside">
            Nobody says this is easy. It is less a puzzle to solve than a person
            to meet. And it is the difference between a God who sends help and a
            God who comes himself.
          </p>
        </Room>

        <Room
          id="room-05"
          n="05"
          kicker="The turn in the middle of the story"
          title="The ninth hour"
          light={0.74}
          dip
          plate={`${PLATE}/rescue.webp`}
        >
          <p className="wig-lede">
            The Bible&rsquo;s word for the break is <em>sin</em>. It does not
            mainly mean breaking rules. It means aiming at the wrong thing —
            living as if you were the centre. Its reach is total, which is oddly
            level: nobody is further along than anybody else.
          </p>
          <NinthHourStage />
        </Room>

        <Room
          id="room-06"
          n="06"
          kicker="The word used most and explained least"
          title="What being saved actually means"
          light={0.88}
          plate={`${PLATE}/restore.webp`}
        >
          <p className="wig-lede">
            It is not mainly about going somewhere when you die. It is about a
            broken relationship being mended now, with dying no longer being the
            end of it.
          </p>
          <p>
            The word that matters is <em>gift</em>. Every other system in the
            world is earned. This one is not, and the reason given is plain: so
            that nobody can boast about it.
          </p>
          <Scripture k="eph2_8" />
          <p>
            What is asked back is not a performance. It is trust, said out loud.
            That is all the word <em>faith</em> means. Not being sure of
            everything. Trusting someone.
          </p>
          <Scripture k="rom10_9" />
          <p>
            And what it makes you is not a member or a customer. The word used
            is family.
          </p>
          <Scripture k="jhn1_12" />
          <p>
            If you have spent your life assuming you are too far gone for this,
            sit with the next two lines. They are not a claim that you did
            nothing wrong. They are about what is no longer being counted.
          </p>
          <Scripture k="rom8_1" />
          <Scripture k="psa34_18" />
        </Room>

        {/* ROOM 07 — THE THRESHOLD. Full light, cream paper, navy type. The
            largest light shift on the page happens crossing into it, and it is
            the only transition the reader consciously notices. */}
        <Room
          id="room-07"
          n="07"
          kicker="The threshold"
          title="Where you go from here"
          light={1}
        >
          <p className="wig-lede">
            Nothing here needs deciding tonight. But if any of it landed, there
            are three honest next steps, in order of how much they ask of you.
          </p>
          <ol className="wig-next">
            <li>
              <span className="wig-next-n">01</span>
              <div>
                <h3>Read a little of it yourself</h3>
                <p>
                  Start with the Gospel of John. It is the one written for
                  people on the outside. Five minutes a day is enough.
                </p>
                <Link className="wig-link" href="/daily-bread">
                  Today&rsquo;s reading &rarr;
                </Link>
              </div>
            </li>
            <li>
              <span className="wig-next-n">02</span>
              <div>
                <h3>Take one question at a time</h3>
                <p>
                  Each series answers a single question slowly, without assuming
                  you already agree.
                </p>
                <Link className="wig-link" href="/series">
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
                  listening&rdquo; is a real prayer. Better people than us have
                  prayed it.
                </p>
                <Scripture k="mat11_28" />
              </div>
            </li>
          </ol>

          {/* Seeking Help Georgia, at full section weight. The first build put
              this in a footnote and the founder rejected that. The lit window
              belongs in the brightest room. */}
          <section className="wig-help" aria-labelledby="wig-help-title">
            <div className="wig-help-plate" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${PLATE}/help.webp`} alt="" loading="lazy" />
            </div>
            <div className="wig-help-body">
              <p className="wig-room-kicker">Georgia</p>
              <h3 id="wig-help-title" className="wig-help-title">
                If what you need right now is a phone number, not a devotional.
              </h3>
              <p>
                Some nights the question is not who God is. It is where you are
                going to sleep, or how the power stays on, or whether anyone
                will pick up at three in the morning.
              </p>
              <p>
                We keep a checked list of Georgia help lines. Crisis support. A
                bed tonight. Food. Rent and power. A doctor. A lawyer. Someone
                to talk to.
              </p>
              <p className="wig-help-terms">
                It is free. It is printable. There is no sign-up, and you do not
                have to believe anything to use it.
              </p>
              <Link
                className="wig-link wig-link-strong"
                href="/seeking-help-georgia"
              >
                Seeking help in Georgia &rarr;
              </Link>
            </div>
          </section>

          <p className="wig-close">
            <Scripture k="rom8_39" />
          </p>
        </Room>
      </main>
    </div>
  )
}
