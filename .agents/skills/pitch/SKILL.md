---
name: pitch
description: Use whenever the founder asks for a pitch, proposal, idea write-up, brainstorm document, option deck, or visual illustration for Euangelion — publishes to the founder's pitch site (euangelion.app/admin/pitches). NEVER create a Codex artifact for a Euangelion pitch.
---

# The Pitch Site — every pitch, one place (founder ruling 2026-08-20)

Founder: "Im sick of having a million artifacts. I need a site i can see
things on respond on, that archives all the pitch pages... its now the place
ALL euangelion pitches land from ANY session."

## The contract

0. **SHOW, don't describe — IN LITERAL CONTEXT (founder rulings
   2026-08-20):** "I need to see LITERAL representations of the things" and
   "stop embedding pitches in iframes and such, they need to actually exist
   in the page as actual content... I need to see the designs in literal
   context." The rules:
   - Visuals: generate the real image and embed it (upload media to the
     public `edition-assets` bucket under `pitch-media/`).
   - Interactive/feature pitches: build a REAL admin-gated route in the
     site under `/admin/lab/<experiment>` using the site's actual shell,
     styles, and (where possible) real content — commit + deploy it — and
     link it from the pitch. NO iframes, NO phone-frame chrome, NO
     `--mode=demo` (deprecated), NO simulated design layers.
   - The pitch page itself stays the discussion + verdict surface.

1. **Never** deliver a Euangelion pitch, proposal, or visual illustration as
   a Codex artifact, a bare chat wall-of-text, or a loose HTML file. It
   goes to the pitch site.
2. Author the pitch as **Markdown or self-contained HTML** (inline styles
   fine; images as absolute URLs or data URIs; the site renders your HTML
   inside an admin-only page).
3. Publish it:

   ```bash
   cd /Users/jamesparker/Documents/app-projects/external/euangelion
   set -a; source .env.local; set +a
   node scripts/pitches/publish-pitch.mjs <your-file.md|.html> \
     --title="The pitch title" \
     --slug=stable-kebab-slug \
     --tags=comma,separated \
     --session="short-session-name"
   ```

4. Reply to the founder with the pitch URL:
   `https://euangelion.app/admin/pitches/<slug>` — they read and respond
   there (verdict buttons + comments).
5. **Revisions update in place**: re-publish with the SAME `--slug`. One
   page per idea, forever. Never fork a second page for a revision.
6. **Check for the founder's responses** before re-asking in chat:
   the response thread lives at
   `pitches/responses/<slug>.json` in the private `pitches` Storage bucket
   (read it with the service key), or ask the founder to look at the page.

## Concurrency (multiple sessions at once)

The system is concurrent-safe BY DESIGN: one Storage object per pitch, no
shared index file (the site lists the bucket). Publish freely in parallel —
just pick a slug that is yours. If a slug you wanted is taken by a
DIFFERENT idea, pick another slug; never overwrite someone else's pitch.

## Naming

- Slug: stable, descriptive kebab-case (`daily-bread-scroll-hole-brainstorm`).
- Session flag: a short name for your session's theme (`comics-voice`,
  `audio-pipeline`) so the founder can tell threads apart.
