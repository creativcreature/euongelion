'use client'

import { PERSONS, SHARED_ATTRIBUTES } from '@/data/who-is-god-attributes'
import { V } from '@/data/who-is-god-verses'
import StickyStepper from './StickyStepper'

/**
 * Room 04 — one God, Father, Son and Spirit.
 *
 * The Pudding's sticky-chart stepper: ONE graphic held in the viewport across
 * many states, advanced by text steps. Here the graphic is the comparison
 * itself, and it BUILDS — a row at a time as you read the reason for that row —
 * rather than arriving as a finished table you must decode in one go. That is
 * the difference between a document and an argument.
 *
 * Two claims are held together and neither is dropped: the seven shared
 * attributes are why Christians say one God, and the three sendings are why they
 * do not say one person. The steps walk the first, then the second.
 */
export default function CompareStage() {
  const steps = [
    ...SHARED_ATTRIBUTES.map((a, i) => ({
      key: a.id,
      node: (
        <article className="wig-compare-step">
          <p className="wig-step-n">{String(i + 1).padStart(2, '0')}</p>
          <h3 className="wig-step-title">{a.label}</h3>
          <p className="wig-step-body">{a.plain}</p>
          <p className="wig-step-refs">
            <span>{a.father.ref}</span>
            <span>{a.son.ref}</span>
            <span>{a.spirit.ref}</span>
          </p>
        </article>
      ),
    })),
    {
      key: 'sent',
      node: (
        <article className="wig-compare-step">
          <p className="wig-step-n">08</p>
          <h3 className="wig-step-title">So why not one person?</h3>
          <p className="wig-step-body">
            Because they talk to each other. One sends. One is sent. One is
            given. The difference is not what they are. It is what each one
            does.
          </p>
          <div className="wig-persons">
            {PERSONS.map((p) => (
              <div className="wig-person" key={p.id}>
                <h4>{p.label}</h4>
                <p>{p.plain}</p>
                <p className="wig-step-refs">
                  <span>{p.verse.ref}</span>
                </p>
              </div>
            ))}
          </div>
          <figure className="wig-scripture">
            <blockquote>{V.mat3_17.text}</blockquote>
            <figcaption>
              {V.mat3_17.ref} &mdash; the river, where all three are present at
              once
            </figcaption>
          </figure>
        </article>
      ),
    },
  ]

  return (
    <StickyStepper
      className="wig-compare-stepper"
      steps={steps}
      stageLabel="A table of what Scripture says about the Father, the Son and the Spirit alike"
      stage={(activeKey, activeIndex) => (
        <div className="wig-matrix">
          <div className="wig-matrix-head">
            <span />
            <span>Father</span>
            <span>Son</span>
            <span>Spirit</span>
          </div>
          {SHARED_ATTRIBUTES.map((a, i) => (
            <div
              className="wig-matrix-row"
              key={a.id}
              data-on={i <= activeIndex}
              data-current={a.id === activeKey}
            >
              <span className="wig-matrix-label">{a.label}</span>
              <span className="wig-matrix-cell">{a.father.ref}</span>
              <span className="wig-matrix-cell">{a.son.ref}</span>
              <span className="wig-matrix-cell">{a.spirit.ref}</span>
            </div>
          ))}
          <p className="wig-matrix-foot" data-on={activeIndex >= 6}>
            Every line is said of all three. That is why Christians say one God.
          </p>
        </div>
      )}
    />
  )
}
