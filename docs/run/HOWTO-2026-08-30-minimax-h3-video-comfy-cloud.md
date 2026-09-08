# HOW-TO — Animated devotional plate via MiniMax H3 on Comfy Cloud

**Written 2026-08-30.** Reproduces `coal-MINIMAX2.mp4`, the first animated plate
the founder approved: *"minimax did the best actually"*, *"this worked well"*.

Every parameter below is recovered from the session transcript, not from memory.

---

## 1 · What it produces

| | |
|---|---|
| Output | 864×480, 24 fps, 5.17 s, H.264 + AAC 32 kHz stereo |
| Cost | **47.7 GPU-seconds ≈ $0.062** |
| Wall clock | ~2 minutes |
| Source | `imagery-staging/drawing-near-test/7-coal-169.png` (1536×864) |

H3 generates stereo audio jointly with the video — you get an audio track whether
or not you want one. Strip it for silent loops.

---

## 2 · The pipeline

### Step 1 — Upload the still

```
mcp__comfyui__upload_file
  file_path: ".../imagery-staging/drawing-near-test/7-coal-169.png"
  client_os: "darwin"
```

Returns a content-hash filename. For this run:
`f8e91f74dfa4db1771225c60442252b22e1037869b0b34135d9c2b71a0d4e316.png`

That hash is what the workflow references — not the local path.

### Step 2 — Inspect the template before running it

```
mcp__comfyui__get_template_schema
  template_id: "video_minimax_h3_i2v"
```

**Do not skip this.** It is where the node addresses and the legal enum values
come from, and both bit on this job (see Traps).

### Step 3 — Run

```
mcp__comfyui__run_template
  name: "video_minimax_h3_i2v"
  client_os: "darwin"
  input_overrides:
    "114":     { image: "<hash>.png" }
    "115":     { aspect_ratio: "16:9 (Widescreen)" }
    "105:104": { prompt: "<see below>" }
```

Node map for this template:

| Node | Role |
|---|---|
| `114` | source image |
| `115` | resolution / aspect ratio |
| `105:104` | prompt (inside a subgraph — note the colon) |

### Step 4 — Collect

```
mcp__comfyui__get_output
  prompt_id: "de7e8129-f618-4a64-99bf-bd84bf7fc94d"
```

Returns a signed Google Cloud Storage URL (`comfy-cloud-assets`, ~6 h expiry)
serving `MiniMax_H3_00001_.mp4`. Download with curl, then rename.

### Step 5 — Preview encode

`ffmpeg` comes from the pip package `imageio-ffmpeg`, not Homebrew:

```bash
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -i coal-MINIMAX2.mp4 -c:v libx264 -crf 27 -vf scale=800:-2 \
      -pix_fmt yuv420p -movflags +faststart -an -y coal-MINIMAX2-small.mp4
```

`-an` drops H3's audio track.

---

## 3 · The prompt, and why it is shaped that way

```
A two-colour illustration in deep cobalt blue and pale cream with heavy visible
dot texture. A winged figure holds long iron tongs gripping a small blazing ember
to the mouth of a bearded man whose head is thrown back. EVERYTHING IS FROZEN AND
MOTIONLESS - both figures locked still like carved sculpture, every spark
suspended in the air. Only the camera moves: one slow continuous forward flight
along the iron tongs toward the ember, then rising to settle on the man's open
mouth. Fills the entire frame edge to edge. Only deep blue and cream, no grey, no
other colours, no photographic realism.
```

Three deliberate moves, each solving a failure seen in earlier attempts:

**Freeze the subject, move only the camera.** The approved plate is ~82% figures.
Every attempt that let the *content* animate produced melting faces and warping
hands, because there is almost no background for the model to safely invent. The
"frozen time, flying camera" framing converts an animation problem into a camera
problem — which the model does far better.

**Name the camera path explicitly, as one continuous move.** The founder had
rejected earlier output as *"Motion too fucking subtle. I want camera moves."*
Naming a single path — along the tongs, then rising — gets a decisive move rather
than ambient drift.

**Restate the style as literal description, not brand language.** "Two-colour",
"heavy visible dot texture", "no grey" — the model does not know what "riso" is,
but it understands those. The negative clauses matter as much as the positives.

---

## 4 · Traps

**Subgraph nodes need flattened addresses.** The prompt lives inside a subgraph,
so it is `"105:104"` in `input_overrides` — *not* `"105.prompt"` in
`slot_overrides`. The first attempt used the dotted form; it was silently
accepted and the prompt never reached the model. Verify a prompt actually landed
before judging the output.

**`aspect_ratio` takes display strings, not ratios.** `"16:9"` is rejected; the
legal value is `"16:9 (Widescreen)"`. The warning naming the correct value was
visible in an earlier response and I ran anyway — the job failed and had to be
refired. Read the enum from the schema.

**Never fire a run without checking the prompt is populated.** Two runs early in
this session went out with no prompt at all and one at 640×640 square. They
completed, cost credits, and were useless.

**`mcp__comfyui__*` is Comfy Cloud, credit-billed.** It cannot drive a local
ComfyUI. There is no free path through these tools.

---

## 5 · Cost model

Billing is GPU-seconds on an `rtx_pro_6000` at **$0.0013/GPU-second (~$4.66/hr)**,
derived by dividing an hour's billing bucket by its GPU-seconds.

| | |
|---|---|
| MiniMax H3, per clip | **47.7** and **48.5** GPU-seconds across two runs |
| Cost per clip | **~$0.06** |
| Whole exploration session | 1,410 GPU-seconds (23½ min) over nine runs |

At this rate 100 clips is about **$6**.

---

## 6 · Known faults in the approved clip

The founder's own words, all still open:

1. **The flight path shows up in the image** — the camera move is legible as a
   path rather than reading as a natural move.
2. **Not a seamless loop.** i2v has no mechanism to force last frame = first.
3. **Motion wants slowing down.**

The fix for (2) is structural, not a tuning problem: use a **first-and-last-frame**
workflow with the same image in both slots, so the loop closes by construction.
That variant exists in H3 (`fl2va`) but was not what `video_minimax_h3_i2v` runs.
Untested on Cloud.

---

## 7 · What was ruled out, and why

**Local H3 — dead.** Measured 2026-08-30 on this machine (M4 Pro, 48 GB). The
memory fit was fine: 13.0 GiB on Metal with the text encoder held in RAM via
`--backend te=cpu`, against a 37.44 GiB ceiling. The speed was not. Two sampling
passes ran at 7.3 s/it, then a third pass ran at **325.9 s/it — 44× slower per
step on the same GPU**, an unoptimised path in ggml's Metal kernels. Projected
~60 minutes for one 5-second clip; killed at 21m 11s with no output. **~60 minutes
free versus ~$0.06 and two minutes.** All 25 GB of weights and the local ComfyUI
install were deleted (34 GB reclaimed).

**Other GPU models tested on the same plate, same prompt:** Hunyuan, Kandinsky,
Wan CausalForcing, LTX. MiniMax H3 won on the founder's direct comparison.

---

## 8 · To reproduce on a new plate

1. `upload_file` the still → keep the returned hash
2. `get_template_schema` for `video_minimax_h3_i2v` → confirm node ids and enums
3. `run_template` with `114` = hash, `115` = `"16:9 (Widescreen)"`,
   `105:104` = prompt — freeze the subject, move only the camera
4. `get_output` with the returned `prompt_id` → curl the signed URL
5. Encode a preview with `-an`
6. Budget ~48 GPU-seconds (~$0.06)
