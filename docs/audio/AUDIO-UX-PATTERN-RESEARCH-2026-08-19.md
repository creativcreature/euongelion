# Audio UX pattern research — 2026-08-19

Companion to `AUDIO-ENGINE-RESEARCH-2026-08-19.md`. That document settles what
renders the audio. This one settles what the audio is played _in_.

Commissioned by the founder: _"use last 30 days skill and mobbin for research and
adhere to it."_ The point of "adhere" is that §5 below is binding on
`docs/plans/AUDIO-FORWARD-STRATEGY.md` — the strategy follows the evidence, not
the other way round.

## Method, and what it could not see

Two independent passes, deliberately different in kind:

- **Mobbin** — 16 iOS screens and 4 recorded flows across ElevenReader, Spotify,
  Blinkist, Headway, The Atlantic, Waking Up, Bloom, Finimize, Calm, Substack,
  Apple News, Apple Podcasts, NYTimes Audio, Neuecast. Shipped product, not
  opinion about product.
- **`/last30days`** — 61 items across 6 sources, window 2026-07-20 to 2026-08-19.

Coverage honesty, because it changes how much weight §2 can carry: **Reddit went
partial at 25 items on an HTTP 429**, X returned nothing, and Polymarket had no
markets. Only 29 of 61 dated items fell in the last 7 days. So the community
evidence below is real but thin, and the absence of a complaint is not evidence
that the complaint does not exist. The Mobbin pass is the load-bearing one; the
community pass is corroboration and one genuine surprise.

## 1. The single most important finding

It is not a layout finding. It is this thread:
[How aggressive Trim Silence may affect podcast retention](https://www.reddit.com/r/pocketcasts/comments/1vj1z2r/how_aggressive_trim_silence_may_affect_podcast/)
(r/pocketcasts, 20 comments), where listeners split hard over whether an app is
allowed to edit the pauses out of spoken audio.

> "I trust the podcaster to deliver the content at a speed and with the pauses
> ideal for listening to. It is disrespectful to mess with that."
> — u/ggommezz, 12 upvotes

> "1x with medium since medium became a thing. I don't care about retention as
> much as enjoyment, I listen to podcasts to relax and unwind, not to speedrun."
> — u/_HeDoesntRow_, 8 upvotes

And the other camp, which is _the founder's own stated use case_:

> "I consume non-fiction podcasts pretty much universally at 3x, with Trim
> Silence on mild. These podcasts are just background noise for me while I'm
> working."
> — u/Capable_Tea_001, 5 upvotes

For a general podcast app this is a preferences toggle. For this product it is a
theological question. The renderer's `PAUSE_AFTER` grammar is not dead air to be
reclaimed — it is the space after a Scripture line, the beat before a prayer.
Silence is content here.

**Ruling this implies:** ship playback speed (both camps want it, and the founder
is squarely in the 3x camp), default it to 1x, and **never ship trim-silence** —
not as a default, not as a toggle. A toggle is an invitation to destroy the
pacing the renderer was built to protect.

## 2. What else the last 30 days actually said

**Long-form is what people put on to work to, and they consume it as a series.**
[Podcast Series You Can't Put Down](https://www.reddit.com/r/podcasts/comments/1vryxh5/podcast_series_you_cant_put_down_any_genre/)
(84 pts, 120 comments): _"I usually like to throw a podcast on when working, and
I love podcast series that suck me in and I can't stop listening to since it
makes the time fly by."_ The unit of listening is the **series**, not the
episode. That is an argument for continuous play across a series or plan as the
default behaviour, not a per-devotional one-off.

**Sitting still and listening is the hard part.**
[What are your go-to games to play when listening to audiobooks/podcasts?](https://www.reddit.com/r/GirlGamers/comments/1vlcaol/what_are_your_goto_games_to_play_when_listening/)
(64 pts, 76 comments): _"Due to my ADHD, I find it really hard to just sit still
and listen... any of my creative hobbies gets me too distracted and I stop paying
attention."_ People are actively hunting for something to occupy the hands so the
ears can stay. Our read-along highlight (§3) is the on-screen version of that
anchor, and it is the thing this product can do that a podcast app cannot.

**Synthetic voice disclosure is becoming a live norm, this month.**
[How important is it to you to know if your fave podcast is involved with AI?](https://www.reddit.com/r/podcasting/comments/1vqqe3e/how_important_is_it_to_you_to_know_if_your_fave/)
(54 comments, posted 2026-08-17) — a hobbyist weighing an explicit "AI Assisted"
disclaimer. Our narration will be a Chatterbox clone of the founder's own voice.
That is the most defensible case there is, but it is still synthesis, and the
audience norm is forming right now. **Open question for the founder** — see §6.

## 3. The now-playing anatomy, as actually shipped

Near-universal across the 16 screens:

| Convention                                        | Seen in                                                                                                                                                                                                                                                                                          | Our state                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Time reads **remaining**, not elapsed             | [Spotify](https://mobbin.com/screens/c9cb0602-c90a-4e10-9e03-14be4407c20c) ("3hrs 43min left · 1% complete", −0:35), [Blinkist](https://mobbin.com/screens/83e3ffb8-e435-4bf8-ab66-c38b44c5c010) (−23:26), [Waking Up](https://mobbin.com/screens/727fa102-0893-49bf-870f-3080b6247c05) (−04:05) | ✅ shipped (F-131)                                                                |
| Speed as a persistent chip in/above the transport | [Headway](https://mobbin.com/screens/ff4a5f03-7d42-4f57-a251-dfa5e3961a00) ("1.5x speed"), [Finimize](https://mobbin.com/screens/0eac6a74-48ca-4a6a-bbb7-54b299e03e2a) ("Speed: 1.2x"), Spotify, Blinkist, Atlantic                                                                              | ⚠ panel only                                                                      |
| Sleep timer as a first-class transport icon       | ElevenReader, Apple Podcasts, NYTimes Audio (moon glyph)                                                                                                                                                                                                                                         | ⚠ exists, not chapter-aware                                                       |
| Chapter prev/next flanking the skip pair          | Blinkist, Headway, [Atlantic](https://mobbin.com/screens/34b88ad6-d3af-43cc-bcf6-b48a2e69a5d2)                                                                                                                                                                                                   | ❌ sheet only                                                                     |
| Asymmetric skip (−15/+30)                         | [ElevenReader](https://mobbin.com/screens/26aca08b-79f8-437d-bf44-613fc27b74d5), Apple Podcasts                                                                                                                                                                                                  | symmetric −15/+15, which is also common (Blinkist, Finimize, Atlantic) — leave it |
| Transcript / captions as a named affordance       | [Bloom](https://mobbin.com/screens/5240f656-4b64-4512-a5e1-378ef9d2da10) (CC button + caption line), Apple Podcasts ("View Transcript" in overflow)                                                                                                                                              | n/a — our text IS the page                                                        |

**ElevenReader is the closest shipped analogue to what we are building.** Its
now-playing screen is not artwork and a scrubber — it is the chapter text itself,
with the sentence currently being spoken highlighted, and the transport docked at
the bottom. That is our "reading rule", executed as the whole surface. It is
worth studying directly rather than paraphrasing.

## 4. Mini player and queue grammar

**The mini bar is a dismissible card above the tab bar.** Every example docks it
as a rounded card, not a full-bleed strip: [Calm](https://mobbin.com/screens/2deebcbc-5868-46ca-9142-39b5a38bfd28)
(above a floating pill tab bar), [Substack](https://mobbin.com/screens/ed1782c9-dc26-4cb6-b9e2-d3b5e820f627),
[Apple News](https://mobbin.com/screens/45fa86e0-fc2d-499d-9cc5-875ac437bf7a),
Neuecast, ElevenReader.

Two of them — Substack and Apple News — put an explicit **✕ on the mini bar**.
Apple News's is literally `[−15] [pause] [✕]`. **Ours has no dismiss.** A bar that
follows you across every route with no way to close it stops being a transport and
becomes chrome you cannot escape. This is the one clear defect the pattern sweep
found in our current build.

**Apple News also ships a dedicated `Audio` tab in the primary tab bar.** That is
what "audio-forward" looks like when a text publisher commits to it.

**"Continue listening" is a rail, not a button.** ElevenReader's home leads with
_"The Wizard of Oz — 21% · 5 min left"_. Progress and remaining time, not a bare
Resume.

**The queue has a settled vocabulary** ([NYTimes Audio](https://mobbin.com/flows/817a6017-b6a8-48dd-ab54-773570ac8e42),
[Apple Podcasts](https://mobbin.com/flows/da3c83e1-fa23-453d-8693-b95ead0c9928)):

- Section header **"UP NEXT IN YOUR QUEUE"**.
- Row = artwork · uppercase show eyebrow · title · `38 MIN · APR 19` · **drag
  handle** on the right. Reorder is drag; the row lifts with a shadow.
- Directly beneath, **"RECOMMENDED FOR YOU"** with a `+` per row. Adding is one
  tap from a browse list, never buried.
- Empty state is a bordered card **with a route out**: _"Your queue is empty.
  Explore more in the Listen Tab."_
- Apple Podcasts adds **"Play Next"** to the overflow menu and confirms with a
  **"Playing Next" HUD toast**. Its menu grouping is worth copying: Download /
  Save / Share as an icon row, then Play Next / Mark as Played, then View
  Transcript / Go to Episode / Go to Show.

## 5. Binding deltas for `AUDIO-FORWARD-STRATEGY.md`

Item 0 is a defect in what ships today and outranks the rest. Items 1-4 are
corrections to the shipped transport, ordered cheapest first; 5-9 are what
"audio-forward" actually requires.

0. **Fix seeking before adding any surface that encourages it.** Verified live
   2026-08-19: a `GET` with `Range: bytes=1000000-1000999` against
   `/audio/bible-365-day-1.m4a` returns `HTTP 200` and the whole 7.4 MB body,
   even though the response advertises `accept-ranges: bytes`. Every scrub, and
   every chapter jump from the sheet we already ship, refetches the entire
   track. Chapters and queues both multiply seeking, so this outranks all nine
   items below.
1. **Add a dismiss to the mini bar.** It is the only place our shipped transport
   diverges from every studied example that persists across routes.
2. **Surface speed in the transport**, not only in the panel. Both sides of the
   §1 split need it reachable while listening.
3. **Never ship trim-silence.** Record it as a decision so a future session does
   not add it as an obvious win. Default speed stays 1x.
4. **Make the sleep timer chapter-aware** — "stop at the end of this section".
   2026 audiobook convention is a natural stopping point rather than a hard cut,
   and we already have measured chapter timestamps, so this is nearly free.
5. **Hoist the player above the route boundary.** BBC's
   [persistent player prototype for BBC Sounds](https://medium.com/bbc-product-technology/sounds-web-next-a-persistent-player-prototype-for-bbc-sounds-bf996ef0c332)
   is the same problem: keep one document alive under client-side routing so
   playback survives navigation. On App Router that means the player lives in a
   layout, not a page. The existing Media Session wiring must survive the move —
   it is what buys lock-screen and hardware-key control.
6. **The series is the playlist.** Continuous play through a series or an active
   plan, because the evidence says people put long-form on to work to and consume
   it as a run, not as singles.
7. **Build the queue with the settled vocabulary** from §4 — "Up next", drag
   handles, `+` on browse rows, a routed empty state, a "Playing next" toast.
   Deviating here costs recognition for nothing.
8. **Lead surfaces with a "Continue listening" rail** carrying percent complete
   and time left.
9. **Keep the read-along highlight as the differentiator.** It is the answer to
   the attention thread in §2, and it is the one thing a podcast app structurally
   cannot do with our content.

## 6. Open question for the founder

**Do we disclose that the narration is synthesised?** The voice will be the
founder's own, cloned with consent from his own recordings — the strongest
possible position. But r/podcasting is actively debating disclosure norms _this
month_, and a devotional audience has a sharper-than-average sensitivity to
authenticity. Options, cheapest to most conservative: say nothing; a line in the
Audio Edition panel ("Read in the founder's voice, rendered"); or a short note on
an About/Audio page. This is a trust posture, not an engineering call, so it is
not mine to decide.

## Provenance

- `/last30days` raw evidence: `~/Documents/Last30Days/podcast-and-audiobook-app-listening-experience-raw-v3.md`
  (61 items, 6 sources, includes the WebSearch supplement appendix).
- Mobbin: 16 iOS screens, 4 flows, linked inline above.
- Companion: `docs/audio/AUDIO-ENGINE-RESEARCH-2026-08-19.md` (what renders the audio).
- Strategy this binds: `docs/plans/AUDIO-FORWARD-STRATEGY.md` (see the verified
  correction at its §0 — the catalogue is 100% delivered in production, not 31%;
  the real exposure is durability, since 380 tracks are gitignored and exist only
  on this machine).
