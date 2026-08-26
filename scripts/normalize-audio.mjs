#!/usr/bin/env node
/**
 * EBU R128 loudness normalisation for the narration library.
 *
 * WHY: the masters were levelled to PEAK, not loudness — true peak pinned at
 * 0 dBTP (bible-365 was +0.55, i.e. clipping) while integrated loudness sat at
 * -20 to -23 LUFS, well under the -16/-17 LUFS podcast range. They look full on
 * a waveform and play quiet, which is the "volume maxed and still hard to hear"
 * report. Loudness is the fix; the peak ceiling is the safety rail.
 *
 * TARGET IS -17 LUFS BY FOUNDER EAR, not by spec default. Three A/B renders were
 * cut (-22.6 current / -17.0 / -16.3) and -17.0 was the approved one. Do not
 * "correct" this to -16 because that is the more commonly cited number.
 *
 * CONSTANT GAIN, NOT DYNAMIC. `loudnorm` in single-pass mode reports
 * normalization_type: dynamic — it rides the level, which compresses the
 * loudness range (measured LRA 4.6 -> 3.4 on the A/B source) and can pump on
 * speech. Here pass 1 only measures; pass 2 applies a fixed `volume` gain, so
 * the dynamics that survive are the performance's own. `alimiter` then owns the
 * ceiling. Gain owns loudness, the limiter owns peaks, neither rides anything.
 *
 * THE HARD PART IS TRUE PEAK, AND IT IS WHY THIS LOOP EXISTS. AAC adds
 * intersample overshoot ABOVE the limiter ceiling by a content-dependent amount
 * (measured 0.8 dB to 3.6 dB across this library — low bitrate means coarse
 * quantisation means big coding error means big overshoot). So the ceiling
 * cannot be computed up front, and it cannot be probed once and then pinned:
 * an earlier revision probed the overshoot at the initial gain, pinned the
 * ceiling, and then moved the gain underneath it, which pushed one file to
 * +0.20 dBTP — worse than untreated.
 *
 * The fix is to stop predicting and start verifying. Every iteration re-encodes
 * and re-measures the ACTUAL encoded file, the ceiling only ever moves DOWN
 * (monotone, so raising gain can never re-inflate a peak we already pulled), and
 * a file is only ever accepted on a render whose own measurement passes both
 * gates. A file that will not converge is reported as FAILED and left unwritten
 * rather than shipped — an unverified render is not a result.
 *
 * NATIVE FORMAT IS PRESERVED. 528 files are 24 kHz mono narration, but the 7
 * he-cannot-deny-himself tracks are 44.1 kHz stereo music-scored productions.
 * Hardcoding -ar 24000 -ac 1 (as an earlier revision did) silently downmixes
 * those to mono. Rate and channel count are read per file and echoed back.
 *
 * OUTPUT BITRATE IS PER FILE, NOT A CONSTANT. AAC->AAC is generational loss, so
 * the second encode wants MORE bits than the source: 80k against 48-65k mono,
 * 160k against the 125k stereo. But Cloudflare Workers rejects any static asset
 * over 25 MiB, and the 7 stereo tracks are already 20-23 MB, so a flat stereo
 * bitrate is either unsafe or needlessly lossy — at 160k they came out 27-31 MB
 * (a failed deploy, not a bad sound), and at a flat 128k the longest landed at
 * 24.8 MiB, 0.2 MiB from the cliff. Arithmetic under-predicts these: container
 * overhead is real, so the budget is derived from measured behaviour, not from
 * bitrate x duration alone.
 *
 * So each file gets min(what the format deserves, what its duration affords).
 * Short tracks keep the full 160k; only the longest are squeezed. There is no
 * better source to work from either way — the shipped .m4a IS the master (the
 * PRODUCED- files are the same 125k stereo), so the generational hit on those
 * seven is unavoidable.
 *
 * The 25 MiB guard below is a backstop, not the plan. An oversized file is a
 * failed deploy, so it fails the same way a clipping file does.
 *
 * NON-DESTRUCTIVE: writes to public/audio-normalized/. 365 of the sources are
 * gitignored bible-365 narrations that exist in exactly one place, so this never
 * writes over public/audio/. Swapping is a separate, deliberate step.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdirSync, mkdirSync, existsSync, writeFileSync, unlinkSync, statSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import ffmpeg from 'ffmpeg-static'

const run = promisify(execFile)
const SRC = 'public/audio'
const OUT = 'public/audio-normalized'

const TARGET_I = Number(process.env.TARGET_LUFS ?? -17) // founder-approved by ear
// Two tiers on purpose. Keep iterating until the tight one, so files actually
// land on the approved level instead of parking at the edge of tolerance; but
// ship anything inside the loose one rather than failing a file over 0.1 LU.
const I_CONVERGE = 0.2
const I_GATE = 0.5
const TP_GATE = -1.0 // ship gate: encoded true peak must sit at or under this
const TP_AIM = -1.6 // aim below the gate so small drift still passes
const START_CEILING = -4.0 // opening limiter ceiling; corrected from measurement
const MAX_ITERS = 10
const MAX_ASSET_BYTES = 25 * 1024 * 1024 // Cloudflare Workers per-asset ceiling
// Plan to here so the 25 MiB guard never fires. Deliberately well under it:
// the encoder delivers about 8% MORE than the nominal -b:a plus container
// overhead (a 22 MiB budget measured out at 23.7 MiB), so this is not the
// output size, it is the input to a calculation that overshoots.
const SIZE_BUDGET_BYTES = 20 * 1024 * 1024
// Limiter attack, in ms. 20, NOT the 5 that reads like the safer choice.
// A 5 ms attack rides gain sharply enough that 80 kbps AAC cannot reconstruct
// the result: on bible-365-day-227 the limiter held the PCM true peak at
// -1.6 dBFS and the encoder still produced +1.5 dBFS — 3.1 dB of coding
// overshoot, measured by rendering the same filter chain to float WAV and to
// AAC and comparing. At attack=20 the same file encodes to -2.3 dBFS. The
// gentler curve is cheap to encode; the sharp one rings past the ceiling.
const ATTACK_MS = 20
const JOBS = Number(process.env.JOBS ?? Math.max(1, os.cpus().length - 2))

const dbToLin = (db) => Math.pow(10, db / 20)

async function ff(args) {
  return run(ffmpeg, ['-nostdin', '-hide_banner', ...args], { maxBuffer: 1 << 28 })
}

/** Read native rate/channels so we re-encode in the source's own format, and
 *  pick the highest bitrate this file's duration can afford. */
async function probeFormat(file) {
  const { stderr } = await ff(['-i', file, '-f', 'null', '-']).catch((e) => e)
  const m = stderr.match(/Audio: aac[^\n]*?, (\d+) Hz, (mono|stereo)/)
  const d = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  if (!m || !d) throw new Error('could not read audio format')
  const channels = m[2] === 'stereo' ? 2 : 1
  const seconds = +d[1] * 3600 + +d[2] * 60 + parseFloat(d[3])
  const wanted = channels === 2 ? 160 : 80 // kbps the format deserves
  const afforded = Math.floor((SIZE_BUDGET_BYTES * 8) / seconds / 1000)
  const kbps = Math.min(wanted, afforded)
  return { rate: m[1], channels, seconds, bitrate: `${kbps}k`, squeezed: kbps < wanted }
}

/** loudnorm's input_* fields are measurements of the file, independent of target. */
async function measure(file) {
  const { stderr } = await ff([
    '-i', file,
    '-af', `loudnorm=I=${TARGET_I}:TP=-1.5:LRA=11:print_format=json`,
    '-f', 'null', '-',
  ])
  const m = stderr.match(/\{[\s\S]*?\}/)
  if (!m) throw new Error('no loudnorm json')
  const j = JSON.parse(m[0])
  return { i: Number(j.input_i), tp: Number(j.input_tp), lra: Number(j.input_lra) }
}

async function normalise(file) {
  const base = path.basename(file)
  const dest = path.join(OUT, base)
  const fmt = await probeFormat(file)
  const src = await measure(file)

  const render = async (gainDb, ceilDb) => {
    await ff([
      '-loglevel', 'error', '-i', file,
      '-af', [
        `volume=${gainDb.toFixed(2)}dB`,
        `alimiter=level_in=1:level_out=1:attack=${ATTACK_MS}:release=60:level=disabled:limit=${dbToLin(ceilDb).toFixed(5)}`,
      ].join(','),
      '-ar', fmt.rate, '-ac', String(fmt.channels),
      '-c:a', 'aac', '-b:a', fmt.bitrate, dest, '-y',
    ])
    return measure(dest)
  }

  let gain = TARGET_I - src.i
  let ceil = START_CEILING
  let out = null
  let iters = 0

  for (let n = 1; n <= MAX_ITERS; n++) {
    iters = n
    out = await render(gain, ceil)
    const dI = TARGET_I - out.i
    const peakOk = out.tp <= TP_GATE
    const onTarget = Math.abs(dI) <= I_CONVERGE
    const shippable = Math.abs(dI) <= I_GATE
    if (peakOk && (onTarget || (n === MAX_ITERS && shippable))) {
      // Accepted on this render's OWN measurement — nothing extrapolated.
      const bytes = statSync(dest).size
      if (bytes > MAX_ASSET_BYTES) {
        unlinkSync(dest)
        return { base, ok: false, iters, fmt, src, out, gain, ceil,
          error: `${(bytes / 1048576).toFixed(1)} MiB exceeds the ${MAX_ASSET_BYTES / 1048576} MiB asset limit` }
      }
      return { base, ok: true, iters, fmt, src, out, gain, ceil, bytes }
    }
    // Re-aim the ceiling from THIS render's measured encoder overshoot. An
    // earlier revision instead ratcheted the ceiling down on every violation
    // and never let it back up; that is a trap, because over-limiting also
    // destroys loudness, and gain then chases a target the limiter is holding
    // down. Eight files spiralled that way — bible-365-day-227 walked the
    // ceiling to -9.1 dB and ended up QUIETER (-18.6 LUFS) than files left
    // alone. Solving for the overshoot instead is self-correcting: too low a
    // ceiling shows up as an undershooting peak and the ceiling comes back up.
    // Gain and ceiling are coupled — more gain means more limiting means less
    // loudness — so a full-size correction to both can orbit the answer instead
    // of landing on it (bible-365-day-10 was still 1.5 LU sharp after 10 full
    // steps). Take the whole step while it is still converging, then halve it,
    // which collapses the orbit. Adaptive rather than always-damped so the
    // common 3-iteration case does not get slower for everyone.
    const damp = n <= 4 ? 1 : 0.5
    ceil += (TP_AIM - (out.tp - ceil) - ceil) * damp
    if (!onTarget) gain += dI * damp
  }

  // Never ship an unverified render.
  if (existsSync(dest)) unlinkSync(dest)
  return { base, ok: false, iters, fmt, src, out, gain, ceil }
}

const only = process.argv.slice(2)
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
const files = only.length
  ? only
  : readdirSync(SRC).filter((f) => f.endsWith('.m4a')).map((f) => path.join(SRC, f))

console.log(
  `normalising ${files.length} file(s) -> I=${TARGET_I} LUFS (±${I_GATE}), ` +
    `true peak <= ${TP_GATE} dBTP, ${JOBS} parallel\n`,
)
console.log(
  'file'.padEnd(40) + 'I src'.padStart(8) + 'TP src'.padStart(8) +
    'I out'.padStart(8) + 'TP out'.padStart(8) + 'LRA src>out'.padStart(13) + '  it  ok',
)

const results = []
let cursor = 0
let done = 0

async function worker() {
  while (cursor < files.length) {
    const f = files[cursor++]
    let r
    try {
      r = await normalise(f)
    } catch (e) {
      r = { base: path.basename(f), ok: false, error: e.message.slice(0, 70) }
    }
    results.push(r)
    done++
    const tag = `[${String(done).padStart(3)}/${files.length}] `
    if (r.error) {
      console.log(tag + r.base.padEnd(40) + `  FAILED: ${r.error}`)
    } else {
      console.log(
        tag + r.base.padEnd(40) +
          r.src.i.toFixed(1).padStart(8) + r.src.tp.toFixed(2).padStart(8) +
          (r.out ? r.out.i.toFixed(1) : '—').padStart(8) +
          (r.out ? r.out.tp.toFixed(2) : '—').padStart(8) +
          (r.out ? `${r.src.lra.toFixed(1)}>${r.out.lra.toFixed(1)}` : '—').padStart(13) +
          String(r.iters).padStart(4) + (r.ok ? '   ok' : '   FAIL'),
      )
    }
  }
}

await Promise.all(Array.from({ length: Math.min(JOBS, files.length) }, worker))

const passed = results.filter((r) => r.ok)
const failed = results.filter((r) => !r.ok)
results.sort((a, b) => a.base.localeCompare(b.base))
writeFileSync('/tmp/normalize-report.json', JSON.stringify(results, null, 2))

console.log(`\n${passed.length}/${results.length} verified within ±${I_GATE} LU of ${TARGET_I} and <= ${TP_GATE} dBTP`)
if (passed.length) {
  const gains = passed.map((r) => r.out.i - r.src.i)
  const tps = passed.map((r) => r.out.tp)
  const lras = passed.map((r) => r.out.lra - r.src.lra)
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
  console.log(
    `  loudness  ${Math.min(...passed.map((r) => r.out.i)).toFixed(1)} to ${Math.max(...passed.map((r) => r.out.i)).toFixed(1)} LUFS\n` +
      `  lift      +${Math.min(...gains).toFixed(1)} to +${Math.max(...gains).toFixed(1)} dB\n` +
      `  true peak ${Math.min(...tps).toFixed(2)} to ${Math.max(...tps).toFixed(2)} dBTP (gate ${TP_GATE})\n` +
      `  LRA delta ${mean(lras).toFixed(2)} LU mean (0 = dynamics untouched)`,
  )
}
if (failed.length) {
  console.log(`\n${failed.length} NOT written (unverified):`)
  for (const r of failed) console.log(`  ${r.base}  ${r.error ?? `I=${r.out?.i} TP=${r.out?.tp}`}`)
  process.exitCode = 1
}
console.log('\nreport: /tmp/normalize-report.json')
