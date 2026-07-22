# Known Traps — every failure mode hit on the reference build

Each entry: the trap, how it bit, the guard. All are from the actual prayer-of-jabez ship (2026-07-12).

## Rendering & runtime

1. **Client-render drops are invisible to curl.** The day JSONs were perfect over HTTP while the reader painted empty panels (normalizeModule discarded flat string `content`). Guard: rendered-DOM assertions (vitest + RTL against `ModuleRenderer` with the real day-data shapes) are REQUIRED verification for any new module shape; `__tests__/module-renderer-flat-content.test.tsx` is the standing regression suite. (At the time, the reader wrapped every module in a bordered panel, so null renders shipped visible empty boxes; the boxes were removed 2026-07-22 — null renders now ship silent gaps, which are HARDER to spot, so the DOM assertion matters more, not less.)
2. **CSP blocks new embed hosts silently.** `frame-src` allowed only Cloudflare/Stripe; the first-ever video modules played as blank iframes. Guard: any new third-party surface (frames, connects, workers) gets its host added in `next.config.ts` CSP BEFORE shipping content that uses it; verify with `curl -sI <page> | grep -io "frame-src[^;]*"`.
3. **Edge cache serves the old broken page after the fix deploys.** Pages cache `s-maxage=3600, stale-while-revalidate`. Guard: after deploy, warm every affected URL (request once → wait ~10s → verify a fix marker per URL). In zsh use an array loop (`for u in "${urls[@]}"`) — unquoted `$URLS` does NOT word-split in zsh. Browsers may also hold local cache — a reload clears it.

## Content authoring

4. **Corpus casing is part of verbatim.** This repo's KJV prints "the Lord"; BSB prints "the LORD". Quoting KJV with "the LORD" is a verbatim error the editor will catch. Guard: always paste from the corpus pull, never retype.
5. **YLT ships `<FI>…<Fi>` markers** in the corpus text. Strip or avoid block-quoting YLT.
6. **Validator counts differently than intuition.** Only teaching/scripture/vocab/bridge/story/insight/recap/sabbath modules count toward word bands, and identifier-ish fields are skipped. Draft ~15-20% over your per-module estimates; recompute `totalWords` with the validator's own rules.
7. **The banned-phrase regexes are aggressive**: `it's not X, it's Y` matches structurally; rhetorical-question-then-answer is an editor-level kill; "in today's" is fine only when not followed by "world". Grep before the validator does.
8. **Editor findings that contradict verified research** usually mean the source pack is missing the verification, not that the text is wrong. Fix by adding the verified detail TO the pack (Müller's coin amounts were verified all along; the pack hadn't carried them).
9. **Famous devotional stories are often folklore.** Verify against the primary text before drafting around them; the primary sources usually contain a better, dated, first-person incident.

## Generation

10. **Image safety filter false-positives**: "newborn baby" → `status: "nsfw"`. Reframe the subject ("swaddled bundle"). Budget for 1-2 retries per batch (filter kills + style drift).
11. **Higgsfield concurrency cap is 8** on the current plan — batch and poll; excess submissions error with a rate-limit message, not a queue.
12. **BibleProject retitled its catalog** — remembered titles find re-uploads. oEmbed-verify every ID; reject non-official channels even with identical content.

## Repo & process

13. **Parallel sessions share this working tree.** Mid-build, another session committed to the same branch, took F-080, and swept an untracked file into its commit. Guard: claim SA/F ids at write-time from the canonical registries; stage by explicit file list; re-check `git status` before every commit; don't touch `docs/run/DECISIONS.md` or other sessions' working files (stash-around if a checkout requires it).
14. **CHANGELOG contains phantom decision ids** (ad-hoc "SA-029/SA-030" fix labels from May 2026). `docs/production-decisions.yaml` is the only registry that counts.
15. **Two verifiers hard-code counts**: `scripts/check-feature-prd-integrity.mjs` pins the registry size; `__tests__/series-data.test.ts` pins the series count. Bump both with every new PRD/series.
16. **`npm run build` regenerates `src/data/devotional-teasers.ts`** and reformats it wholesale. Diff for entries lost (must be zero) and gained (must be exactly your new days) before committing.
17. **Auto-deploy on push is unreliable** — `npm run deploy` is the real path, after the 4-check identity gate. Deploying ships the whole tree: surface to the founder what else rides along (parallel sessions' commits) and let them choose the merge path.
18. **Reader routes are double-mounted** (`/devotional/[slug]` main + legacy `/wake-up/devotional/[slug]`). Users see the main-site links; verify both while the legacy mount exists. Retirement is a pinned founder task — don't fold it into a content ship.
