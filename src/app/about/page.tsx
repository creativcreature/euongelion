import StaticInfoPage from '@/components/StaticInfoPage'

export const metadata = {
  title: 'About | Euangelion',
  description:
    'Daily devotionals for the cluttered, hungry soul. Ancient depth, modern clarity. Built on 30+ historic Christian voices.',
  alternates: { canonical: '/about' },
}

/**
 * /about — third-person institutional voice per founder direction
 * 2026-05-07: "Euangelion and me are separate site-wise. The site
 * should largely be 3rd-person." A separate founder bio surface
 * (likely /about/founder or a homepage callout) can be added later
 * when the founder is ready to show himself.
 *
 * Source claim is "30+ historic Christian voices" rather than a
 * specific number per the morning deck — defensible and grows with
 * the catalog without becoming wrong.
 */
export default function AboutPage() {
  return (
    <StaticInfoPage
      breadcrumb="ABOUT"
      kicker="ABOUT EUANGELION"
      title="Daily devotionals for the cluttered, hungry soul."
      sections={[
        {
          title: 'What Euangelion is',
          body: [
            'Euangelion is a Christian devotional product built for honest reflection, grounded scripture, and sustained rhythm. It exists to help people find their next faithful step in a way that is sustainable, theologically anchored, and never performative.',
            'The name comes from the Greek for "good news." The product is shaped by the conviction that the gospel does its own work when given honest space to land.',
          ],
        },
        {
          title: 'How it works',
          body: [
            'A user shares what they are wrestling with — what is heavy, unclear, or simply present. The Soul Audit matches the reflection to three curated devotional paths and explains why each one fits.',
            'Once a path is chosen, the user reads one devotional per day for the length of the series. Each day is grounded in scripture, written from the historic Christian tradition, and short enough to sustain — most days are five to seven minutes.',
            'Reading position, journal entries, and bookmarks sync across devices when signed in. There is no streak counter. There is no guilt loop.',
          ],
        },
        {
          title: 'What grounds the writing',
          body: [
            'Every devotional is built on top of the historic Christian tradition. The reference library draws on 30+ voices spanning church history — from Augustine and Calvin to Spurgeon, Tozer, à Kempis, Brother Lawrence, Bunyan, Owen, Murray, Pascal, Chesterton, and the early apologists.',
            "AI is used as a composer and arranger, not as an author. When AI assists a devotional, it weaves the tradition's own words into the day's reading. The user always sees what source informed what passage.",
          ],
        },
        {
          title: 'What it believes',
          body: [
            "Euangelion is anchored in the Apostles' Creed and the Nicene Creed — the historic creedal centre of Christian faith. It welcomes Protestant, Catholic, and Orthodox readers.",
            'It does not take positions on contested intra-tradition doctrine (sacraments, ecclesiology, predestination specifics, eschatological detail, Marian theology). The product is here for the gospel, not for tribal lines.',
          ],
        },
        {
          title: 'What it costs',
          body: [
            'Free. The full curated catalog — 65+ series, 175+ devotionals, the Soul Audit, three matched recommendations — is free for everyone, always. No "lite" version.',
            'Optional support unlocks AI-composed personal devotional plans written for a specific reflection. Pricing is published at /pricing once it ships publicly.',
          ],
        },
        {
          title: 'Privacy',
          body: [
            'Your reflection is read once to compose your edition — processed in the moment, never stored, never used to train AI, never shared with third-party analytics or trackers. Anonymous-session data is hard-deleted after 30 days. Authenticated users can export or permanently delete their data from /settings at any time.',
            'See /privacy for the full policy.',
          ],
        },
      ]}
    />
  )
}
