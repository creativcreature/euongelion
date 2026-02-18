# BUILD STORY: Euangelion

_How a SCAD-trained designer built a production-grade devotional app in 11 days using AI as a full engineering team._

---

## The Problem

I know many Christians who struggle with reading the Bible. With engaging with the Word. I was one of them. I'd start a devotional plan, get behind, and the guilt of catching up made it harder to come back. Every solution I tried — apps, books, reading plans — never stuck. The format was wrong, the design was uninspiring, and the experience felt like homework instead of nourishment.

So I started making my own.

## The Validation

**Phase 1: Google Docs.** I began writing devotionals with AI assistance — structured Scripture engagement with teaching, vocabulary, and prayer. When I shared them, people valued them. But the format was difficult to read, and getting them to people was a logistics problem.

**Phase 2: Substack.** I moved to Substack. That worked — distribution solved, audience growing. But styling each devotional took hours. Formatting burden became the bottleneck. I was spending more time on presentation than on the content itself.

**Phase 3: The Realization.** I needed a dedicated platform. Not a blog. Not a PDF. A real product — designed for the reading experience, built for the content model, and beautiful enough that people would want to return. I knew the technology could build it for me.

**The Proof:** I've shown the app to people and their eyes light up. Not polite interest — genuine excitement. "This exists? Where do I download it?" That reaction — from real people, unprompted — told me this was worth building for real.

## The Builder

I'm a SCAD-trained (Savannah College of Art and Design) fine arts and graphic design graduate. I'm a creative director and visual designer — not a coder. My coding experience was basic at best.

But I know what good looks like. I know how typography should feel. I know how a reading experience should flow. I know what makes someone trust a product enough to come back tomorrow.

What I didn't have was an engineering team.

## The Method

**AI as a full engineering team.** Claude became my engineer, my QA team, my DevOps, and my technical architect. I direct — I describe what the experience should feel like, what the layout should achieve, what the interaction should communicate. The AI translates that creative direction into production code.

This isn't "no-code." This isn't drag-and-drop. This is a designer leading an AI engineering team to build a real Next.js application with a real database, real authentication, real tests, and real production infrastructure. The same stack a funded startup would use.

**Governance as QA.** Because I don't have a QA team reviewing PRs, I built a production governance system — 50 feature PRDs, a tracking spine of 11 mandatory documents, automated verification scripts, a feature scorecard, and 879 tests across 52 test files. The system catches what a human team would catch. It's not over-engineering — it's the minimum discipline required for a solo builder shipping production software.

## The Build

### Timeline

**11 days of active development.** February 6–16, 2026.

| Date   | What Shipped                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Feb 6  | Foundation: Next.js 16, tooling, content migration, Wake-Up Magazine (7 series)                                         |
| Feb 7  | Database: Supabase, auth, sessions. Deployment: euangelion.app live                                                     |
| Feb 8  | Full MVP: Soul Audit, devotional modules, day-gating, settings, legal pages. Real MVP rebuild: 26 series, hybrid reader |
| Feb 9  | Content pipeline rebuild. Typography overhaul. Production relaunch (Phases 5-11)                                        |
| Feb 10 | Typography Masterclass: Instrument Serif + Inter, mixed headlines, sacred illumination                                  |
| Feb 11 | Newspaper-style homepage redesign. 28 commits in one day — the most intense design iteration session                    |
| Feb 12 | Soul Audit curation flow. Real-time module personalization. Mobile polish                                               |
| Feb 13 | Curated audit refinement. Auth callback fixes                                                                           |
| Feb 14 | Production governance system. 50 feature PRDs. Shell layout. 38 commits — the infrastructure day                        |
| Feb 15 | Feature scorecard execution. Accessibility, billing, iOS readiness, App Store contracts. 35 commits                     |
| Feb 16 | Shadow Advisory Board. Build story documentation. Strategic review                                                      |

### By the Numbers

| Metric                     | Count       |
| -------------------------- | ----------- |
| Total commits              | 146         |
| Source files               | 193         |
| React components           | 57          |
| Library modules            | 37          |
| Custom hooks               | 7           |
| Test files                 | 52          |
| Tests passing              | 879         |
| Devotional JSON files      | 120         |
| Series (content libraries) | 26          |
| CSS (design system)        | 3,988 lines |
| Documentation files        | 184         |
| Feature PRDs               | 50          |
| Database migrations        | 14 files    |
| Content files              | 431         |

### What's Built

**A complete devotional platform:**

- **Landing page** — newspaper-style masthead, featured series carousel, inline Soul Audit
- **Soul Audit** — AI-curated personality assessment that matches users to their starting devotional series based on what they're wrestling with. Three personalized options with Scripture-first previews. Typed reroll. Save-for-later.
- **Devotional reader** — hybrid cinematic layout: full-width Scripture, vocabulary, and prayer modules; continuous column for teaching content. Drop caps, pull quotes, ornamental dividers.
- **26 series** — 7 original Wake-Up series + 19 migrated from Substack. 120 devotional days.
- **Typography system** — Instrument Serif (display/reading), Inter (UI), Industry (navigation). OpenType features, baseline grid, multi-column layouts.
- **Navigation** — sticky desktop bar, mobile hamburger slide-out, breadcrumbs
- **PWA** — installable, offline-capable, service worker
- **Authentication** — magic link auth via Supabase
- **Settings, Privacy, Terms** — legal pages, account management
- **Production governance** — 50 PRDs, 11 tracking spine documents, automated verification scripts, feature scorecard with gap-to-10 analysis
- **Accessibility** — WCAG 2.1 AA targets, keyboard navigation, screen reader semantics, contrast compliance
- **iOS readiness** — safe-area handling, App Store submission contracts

## The Lesson

**For designers who have ideas:**

You don't need to learn to code. You don't need a technical co-founder. You don't need to raise money to hire engineers.

You need to know what good looks like. You need to be able to describe what you want with precision — the same precision you'd use in a design spec or a creative brief. And you need AI that can translate that direction into production code.

I built a production-grade application — the kind of thing that would take a small team months and tens of thousands of dollars — in 11 days. Not a prototype. Not a mockup. A real product with a real database, real tests, and real users about to start using it.

The design skills are the hard part. The taste, the judgment, the understanding of what makes a product feel trustworthy and worth returning to — that's what you bring. The code is the easy part now.

**If you have an idea that's been sitting in your head, on a napkin, in a Figma file — you can build it. In a day if it's basic. In a week if it's ambitious. In two weeks if it's a real product.**

## Current State

**Version 0.7.0.** Live at [euangelion.app](https://euangelion.app).

Targeting **Easter 2026** for public launch — the most meaningful date to ship a devotional product.

Feature scorecard ranges 4-8/10 across all categories with defined paths to 10/10. The core experience works. The polish phase is underway.

## What's Next

1. **Easter 2026 launch** — protected deadline, non-negotiable
2. **Real hero images** — AI-generated series artwork via Gemini pipeline
3. **Progress sync** — Supabase-backed reading progress (currently localStorage)
4. **Content expansion** — fill remaining devotional days across all 26 series
5. **App Store submission** — iOS shell via Capacitor/PWA wrapper
6. **Community feedback** — real users, real data, real iteration

---

_This is a build story in progress. The product is not done. But the proof of concept is clear: a designer with taste, domain expertise, and AI can build production software that competes with funded teams. The advantage isn't technical — it's creative direction applied to technology._
