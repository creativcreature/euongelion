"""
Vertex AI Imagen Batch Runbook
==============================

Direct Vertex AI Imagen 4 / Imagen 3 batch generation script for spending
remaining Cloud Console credits on Euangelion brand imagery.

Why this script exists:
The overnight Claude Code session (2026-05-04) ran ~$15 of Gemini 3 Pro Image
generation through `nanobanana-mcp`. That's a meaningful library (124 images)
but does not consume the $200+ in expiring Cloud Console credits.

This script runs against Vertex AI's Imagen API directly using your
gcloud auth, with parallelism, cost tracking, and a hard kill-switch.

UNIT ECONOMICS (as of 2026-05):
- Imagen 4 Standard:  ~$0.04 per image
- Imagen 4 Ultra:     ~$0.08 per image (better quality, slower)
- Imagen 3:           ~$0.02 per image (cheap, lower fidelity)

So $200 budget = ~5,000 Imagen 4 Standard images, or ~2,500 Ultra, or
~10,000 Imagen 3. You probably want Imagen 4 Standard or Ultra.

PREREQUISITES:
    pip install --user google-cloud-aiplatform vertexai
    gcloud auth application-default login
    export GOOGLE_CLOUD_PROJECT=your-project-id

USAGE:
    python3 scripts/vertex-imagen-batch.py --target-spend 150 --model imagen-4
    python3 scripts/vertex-imagen-batch.py --max-images 500 --model imagen-4-ultra
    python3 scripts/vertex-imagen-batch.py --dry-run

KILL-SWITCH:
    The script tracks spend in real time and STOPS when it hits target_spend
    OR max_cap_dollars (default $230) — whichever is lower. Hit Ctrl+C
    at any time to halt; partial outputs are preserved.

DO NOT modify the BRAND_BOILERPLATE constant unless you've reviewed the
locked style direction in `docs/brand/BRAND-BIBLE.md` and confirmed with
the founder. The boilerplate enforces the silkscreen halftone aesthetic.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# --------------------------------------------------------------------------- #
# CONFIG
# --------------------------------------------------------------------------- #

# Hard cap — script will not exceed this regardless of --target-spend.
# Set $10 below the user's $230.10 credit balance so any timing-window
# overflow lands on credits, not the linked card.
MAX_CAP_DOLLARS = 220.00

# Per-image price by model
PRICING = {
    "imagen-4": 0.04,
    "imagen-4-ultra": 0.08,
    "imagen-3": 0.02,
}

OUTPUT_ROOT = Path(
    "/Users/meltmac/Documents/app-projects/external/euangelion/public/images/generated-2026-05-04-vertex"
)

BRAND_BOILERPLATE = (
    "Halftone screen-printed photographic poster aesthetic — NOT illustration, NOT cartoon. "
    "Treat as a real photograph processed through heavy silkscreen halftone: "
    "dense visible halftone dot pattern stipple, heavy film grain, paper-print texture, "
    "ink imperfections, slight misregistration. Limited 65/25/10 DUOTONE or TRITONE palette — "
    "NEVER full-color, NEVER mustard-yellow-and-orange, NEVER terracotta, NEVER sepia warmth. "
    "ONLY the canonical Euangelion palette: Newspaper Cream #F0ECE6 (paper ground), "
    "Navy Ink #11182A (deepest shadow), Cobalt #1F2A8D (the brand blue, primary accent), "
    "Sacred Gold #C19A6B (warm gold, the 'yellow'), Burgundy #8E3F3F (the 'red', "
    "communion/sacrifice), Olive #6F8F4F (the 'green', anointing/wisdom), "
    "Shalom Blue #4D9FB0 (rare peace teal), Deep Navy #0A1320 (dark-mode ground). "
    "Each image uses two or three of these colors at 65/25/10 — never one, never all. "
    "HIGH CONTRAST — deep saturated darks, brilliant highlights, sharp tonal blocks, no muddy mid-tones. "
    "Cinematic dynamism: dramatic side-light or backlight, hard light beams, surreal halo discs, "
    "bold poster composition with off-axis angles, juxtaposition of scale, shafts of light "
    "as graphic geometric shapes, surreal atmospheric effects. "
    "Serious, weighty, reverent, austere, sacred — NEVER cartoony, NEVER saccharine, NEVER tract-illustration. "
    "Anonymous human figures rendered ANONYMOUS BY LIGHTING OR CROPPING — backlit silhouettes, "
    "deep-shadow profiles, partial body crops (hands, feet, shoulders), classical marble busts and "
    "statuary fragments, sculptural relief. NO HOODS, NO COWLED ROBES, NO MONK-CLOAKS. "
    "When figures appear they are anonymous through hard backlight, deep shadow, or tight crop — "
    "never through hood-and-robe tropes. Faces obscured by light, not by fabric. "
    "References: Saul Bass film posters, Atelier Populaire May '68 silkscreen, Shepard Fairey OBEY, "
    "Constructivist propaganda, vintage 1970s religious tract halftone, Paul Rand reductive composition. "
    "NO text, NO captions, NO logos, NO Hebrew, NO Greek, NO Latin lettering anywhere. "
    "NO AI artifacts (six fingers, melted geometry, garbled type). "
)

# 65/25/10 palette system — locked to the production CANONICAL palette
# (docs/portfolio/assets/specimens/specimens.html, Cobalt Triad + Sacred Accents).
# Five inks only:
#   Newspaper Cream  #F0ECE6  (paper / dominant ground)
#   Navy Ink         #11182A  (text / deep shadow)
#   Cobalt           #1F2A8D  ("blue" — primary brand accent)
#   Sacred Gold      #C19A6B  ("yellow" — warm gold accent)
#   Burgundy         #8E3F3F  ("red" — communion / sacrifice / passion)
#   Olive            #6F8F4F  ("green" — anointing / wisdom / olive branch)
#   Shalom Blue      #4D9FB0  (rare teal — peace / contemplation)
#   Deep Navy        #0A1320  (dark-mode page ground)
# All palettes are LIMITED DUOTONE or TRITONE — never single-ink, never full
# spectrum. Heavy halftone screen-print treatment in every output.
PALETTES = {
    "theophany":   "65% Newspaper Cream paper #F0ECE6; 25% deep Cobalt #1F2A8D for shadow and form; 10% Sacred Gold #C19A6B for the breakthrough radiance — heavy halftone duotone",
    "sacrament":   "65% Newspaper Cream paper #F0ECE6; 25% Burgundy #8E3F3F for blood/wine/communion; 10% Cobalt #1F2A8D accent — heavy halftone tritone",
    "passion":     "65% Newspaper Cream paper #F0ECE6; 25% Burgundy #8E3F3F for sacrifice/wound; 10% Navy Ink #11182A deepest shadow — heavy halftone duotone",
    "resurrection":"65% Newspaper Cream paper #F0ECE6; 25% Cobalt #1F2A8D for shadow; 10% Sacred Gold #C19A6B for dawn-light core — heavy halftone tritone",
    "lament":      "65% Deep Navy #0A1320 ground; 25% Newspaper Cream #F0ECE6 form; 10% Sacred Gold #C19A6B halo — dark-mode heavy halftone duotone",
    "pilgrimage":  "65% Newspaper Cream paper #F0ECE6; 25% Sacred Gold #C19A6B for warm horizon; 10% Cobalt #1F2A8D silhouette — heavy halftone tritone",
    "storm":       "65% deep Cobalt #1F2A8D ground; 25% Newspaper Cream #F0ECE6 wave-crests and break-of-sky; 10% Shalom Blue #4D9FB0 lightning accent — heavy halftone duotone",
    "memento":     "65% Deep Navy #0A1320 void; 25% Sacred Gold #C19A6B for the statue/object/skull; 10% Newspaper Cream #F0ECE6 halo glow — dark-mode heavy halftone duotone",
    "vespers":     "65% Cobalt #1F2A8D evening sky; 25% Sacred Gold #C19A6B horizon-band; 10% Newspaper Cream #F0ECE6 moon-disk — heavy halftone tritone",
    "matins":      "65% Newspaper Cream paper #F0ECE6; 25% Sacred Gold #C19A6B for warm dawn-light; 10% Cobalt #1F2A8D shadow — heavy halftone tritone",
    "exodus":      "65% Newspaper Cream paper #F0ECE6; 25% Cobalt #1F2A8D shadow/water; 10% Burgundy #8E3F3F blood/blade accent — heavy halftone tritone",
    "judgment":    "65% Newspaper Cream paper #F0ECE6; 25% Burgundy #8E3F3F warning field; 10% Navy Ink #11182A graphic mass — heavy halftone tritone",
    "wilderness":  "65% Newspaper Cream paper #F0ECE6; 25% Sacred Gold #C19A6B desert warmth; 10% Navy Ink #11182A silhouette/rock — heavy halftone tritone",
    "communion":   "65% Newspaper Cream paper #F0ECE6; 25% Burgundy #8E3F3F wine/blood; 10% Sacred Gold #C19A6B lamp-flame — heavy halftone tritone",
    "anointing":   "65% Newspaper Cream paper #F0ECE6; 25% Olive #6F8F4F wisdom/oil; 10% Cobalt #1F2A8D shadow — heavy halftone tritone",
    "shalom":      "65% Newspaper Cream paper #F0ECE6; 25% Shalom Blue #4D9FB0 peace; 10% Cobalt #1F2A8D form — heavy halftone tritone",
}

# --------------------------------------------------------------------------- #
# PROMPT BANK — extend as needed; each entry is (slug, palette_key, aspect, scene)
# Aspect is a string ("1:1", "16:9", etc.) — Vertex Imagen supports
# 1:1, 9:16, 16:9, 3:4, 4:3 as of Imagen 4
# --------------------------------------------------------------------------- #

PROMPTS: list[tuple[str, str, str, str]] = [
    # ----- OLD TESTAMENT NARRATIVES (Genesis-Exodus) -----
    ("ot-eden-river-dawn", "sacrament", "16:9", "A wide ancient river running through paradise at dawn, lush palm and fig silhouettes along the banks, golden sun-disk halo rising over distant mountains, no human figures."),
    ("ot-eden-tree-life", "lament", "9:16", "A single monumental tree at the center of a primeval garden, twisted serpentine trunk silhouetted against a giant mustard sun-disk, no human figures."),
    ("ot-eden-expulsion-gate", "passion", "16:9", "A glowing archway in a stone wall with a single sword of flame standing across the threshold, vast wilderness opening beyond, two small silhouettes walking away in the distance, anonymous via deep backlight."),
    ("ot-cain-altars-comparison", "passion", "16:9", "Two stone altars at twilight: left altar with a thin straight column of cream smoke rising vertically, right altar with heavy dark smoke pooling down, two silhouetted figures facing away from camera, anonymous through deep backlight."),
    ("ot-noah-rainbow-ark", "resurrection", "16:9", "A massive wooden ark resting on a mountain peak after the flood, a vivid halftone rainbow arching over it across a clearing sky, no human figures."),
    ("ot-noah-dove-olive", "matins", "1:1", "A single dove descending mid-air carrying a fresh olive branch in its beak, against a vast halftone sky, the prow of an ark just visible at lower edge."),
    ("ot-babel-tower-spiral", "judgment", "9:16", "A monumental spiral ziggurat tower under a chaos of fractured cloud bands, surreal scale, dust storm at base, no recognizable figures, only tiny ant-scale silhouettes for scale."),
    ("ot-sodom-firestorm", "judgment", "16:9", "A distant city consumed by a vertical pillar of fire descending from a black sky onto a desert plain at twilight, surreal straightness, single tiny silhouette family fleeing in foreground anonymous through tight backlit crop."),
    ("ot-lot-pillar-salt", "wilderness", "9:16", "A solitary tall pillar of crystalline salt standing alone on a stony plain at dawn, slim and abstract, no human figures, distant ruined city smoldering on horizon."),
    ("ot-abraham-stars-promise", "memento", "9:16", "A vast night sky thick with stars over a wide desert encampment, a single small anonymous silhouette standing with arms slightly raised, face entirely lost in deep shadow."),
    ("ot-abraham-mamre-three", "matins", "16:9", "A single ancient terebinth tree at midday with three luminous indeterminate human shapes seated beneath it, soft halftone glow at every edge, anonymous through radiance, partial figure crops."),
    ("ot-isaac-stayed-knife", "exodus", "1:1", "A weathered hand frozen mid-air gripping a curved bronze blade, an angelic luminous hand of light gripping its wrist, halftone radiance dispersing tension, no faces visible."),
    ("ot-jacob-ladder-stairway", "theophany", "9:16", "A surreal stairway of golden halftone light rising at a sharp diagonal from earth into a starry sky, small luminous figures ascending and descending, a single sleeping silhouette at the base anonymous through dark backlight."),
    ("ot-jacob-wrestling-river", "exodus", "16:9", "Two muscular silhouetted figures locked in a wrestling embrace at a shallow river at pre-dawn, one figure rendered as half-translucent halftone radiance, both anonymous through hard backlight."),
    ("ot-joseph-coat-torn", "passion", "1:1", "An ornate striped coat lying torn and dust-stained on a desert floor at noon, sharp graphic stripes catching halftone light, no human figures."),
    ("ot-joseph-cistern-pit", "memento", "4:5", "Looking down into the dark mouth of a deep stone cistern at midday, the bright cream-paper graphic disc of the opening at the top, deep cobalt-halftone walls descending, a small silhouette at the bottom anonymous through deep shadow."),
    ("ot-joseph-pharaoh-dreams", "matins", "16:9", "A surreal juxtaposition of seven fat cattle standing peacefully and seven gaunt cattle approaching from desert haze, monumental scale, halftone golden ground, no human figures."),
    ("ot-burning-bush-close", "theophany", "1:1", "A small thorny desert bush wreathed in tall halftone flames yet utterly intact, every leaf crisply visible inside the fire, no human figures."),
    ("ot-burning-bush-distant", "theophany", "9:16", "A small bush wreathed in tall flame on a distant hillside at twilight, the flame visible from across a wilderness valley, a single silhouette stepping back in foreground anonymous through silhouette."),
    ("ot-sandals-removed", "matins", "1:1", "A pair of worn leather sandals discarded on rocky desert ground next to a bare-footprint impression in the dust, no figures, single hard shaft of cream light from upper-right."),
    ("ot-moses-staff-serpent", "theophany", "1:1", "An ancient wooden staff lying on rocky ground transforming into a writhing serpent, halftone motion blur, surreal mid-transformation, no figures."),
    ("ot-plague-frogs-everywhere", "judgment", "16:9", "A flooded courtyard at noon with countless frogs covering the stones in halftone graphic stipple, surreal density, no human figures."),
    ("ot-plague-darkness-noon", "lament", "16:9", "A wide Egyptian street at noon plunged into supernatural night, half the frame still in pale day, half in opaque darkness, no figures, surreal vertical line of division."),
    ("ot-plague-passover-doorpost", "passion", "1:1", "A simple wooden doorpost and lintel marked with a single graphic stroke of dark blood at midnight, halftone stipple, no figures."),
    ("ot-pillar-fire-cloud", "theophany", "16:9", "A towering pillar of cloud and fire descending from the heavens onto a vast desert plain at twilight, halftone smoke-and-flame texture, no figures."),
    ("ot-red-sea-parted", "exodus", "16:9", "Two enormous towering walls of dark held-back ocean water flanking a dry seabed corridor, surreal architectural scale, a sharp triangle of dawn-light at the far end, anonymous tiny silhouettes streaming through anonymous through scale."),
    ("ot-manna-morning", "matins", "16:9", "A wide desert floor at dawn covered in scattered small white round grains of manna, halftone stipple, a few small silhouetted figures kneeling to gather, anonymous through silhouette and crop."),
    ("ot-water-from-rock", "exodus", "1:1", "A sharp graphic crack down a monumental rock-face with a single arc of bright water bursting outward, halftone splash, no figures."),
    ("ot-sinai-theophany", "theophany", "9:16", "A monumental mountain summit shrouded in surreal black storm-cloud lit from within by golden flame, halftone smoke spiraling upward, no figures, surreal supernatural scale."),
    ("ot-stone-tablets-tablets", "memento", "1:1", "Two arched stone tablets standing upright on rocky ground, abstract carved-line patterns suggesting structure but NO readable letters, halftone shadow gradient, no figures."),
    ("ot-golden-calf-broken", "judgment", "1:1", "A bronze bull statuette toppled and shattered into fragments on a desert ground at dawn, halftone fragments scattered, no figures."),
    ("ot-tabernacle-curtains", "lament", "1:1", "Heavy embroidered curtains of an ancient tabernacle hanging in a dim sanctuary, halftone texture, faint amber lamp-light filtering through a single slit, no figures."),
    ("ot-ark-covenant-cherubim", "memento", "1:1", "A single golden ark with two cherubim silhouettes facing each other across the mercy-seat, halftone gold gleam against deep void, no figures."),
    ("ot-brazen-serpent-pole", "exodus", "9:16", "A single tall wooden pole rising from desert ground with a coiled cast-bronze serpent wrapped around its upper portion, halftone bronze gleam, no figures."),
    ("ot-anointing-oil-horn", "sacrament", "1:1", "A ram's horn of glistening oil pouring a slow viscous trail onto a flat stone, halftone golden droplets, an anonymous calloused hand at frame edge anonymous through extreme crop."),
    # ----- OLD TESTAMENT NARRATIVES (Joshua–Prophets) -----
    ("ot-jericho-walls-falling", "judgment", "16:9", "Monumental stone walls mid-collapse outward in graphic geometric falling shapes at noon, billowing halftone dust-cloud plumes, a small procession of trumpet-blowers in foreground anonymous through silhouette."),
    ("ot-joshua-sun-stood-still", "theophany", "16:9", "A bearded silhouette on a high promontory with one arm raised commanding toward a frozen mustard-ochre sun-disk in the sky, a moon visible in the opposite half, surreal stillness, anonymous through hard backlight."),
    ("ot-gideon-fleece-dawn", "matins", "1:1", "A single soft white wool fleece laid out on bare-stone threshing floor at dawn, surreal halftone dew-drops cascading from its hem onto a bone-dry floor, no figures."),
    ("ot-samson-pillars", "judgment", "9:16", "Two enormous stone temple pillars beginning to crack at the base, halftone dust falling from above, a single silhouette pressed against them anonymous through deep backlit shadow."),
    ("ot-ruth-gleaning-field", "matins", "16:9", "A wide stubble wheat field at golden hour with a single bent silhouette gathering fallen wheat, halftone golden field stretching to horizon, anonymous through silhouette and side-light."),
    ("ot-hannah-praying-temple", "lament", "4:5", "A silhouette kneeling at the threshold of an ancient temple gate at dusk, hands cupped in lap, lips moving in silent prayer, halftone glow from a clay oil-lamp at the threshold, anonymous through deep silhouette."),
    ("ot-david-anointed", "sacrament", "1:1", "A horn of oil tipped above a small kneeling silhouette, single trail of golden oil cascading mid-air onto a young head, halftone gleam, anonymous through close crop and shadow."),
    ("ot-david-stones-five", "exodus", "1:1", "Five small smooth river stones arranged in a row on dry earth, halftone stipple, a single sandalled foot at frame edge, anonymous through extreme crop."),
    ("ot-goliath-helmet-fallen", "passion", "1:1", "A great bronze helmet lying on its side in dust, halftone gleam, sharp graphic shadow stretching across cracked earth, no figures."),
    ("ot-david-harp-cave", "lament", "9:16", "A single silhouette seated at the mouth of a cave at twilight strumming an ancient lyre, surreal halftone rays of moonlight pouring in, anonymous through deep backlight silhouette."),
    ("ot-absalom-hair-tree", "judgment", "9:16", "A great oak tree at dusk with long dark hair caught in lower branches and a horse galloping away beneath in the foreground, halftone forest shadow, no recognizable face — anonymous through profile shadow."),
    ("ot-solomon-temple-built", "memento", "16:9", "A monumental stone temple under construction at golden hour with massive cedar beams being raised, halftone scale, scaffolding of silhouetted workers, all anonymous through silhouette."),
    ("ot-solomon-throne-wisdom", "lament", "1:1", "A great cedar throne raised on three steps in a wide stone hall at midday, halftone lamp-light, no figures, surreal monumental scale."),
    ("ot-elijah-ravens-fed", "resurrection", "16:9", "Two black ravens descending from above carrying small torn morsels in their beaks toward a single seated silhouette at a brook foot, anonymous through deep backlight."),
    ("ot-elijah-carmel-fire", "theophany", "9:16", "A vertical column of cream-and-mustard halftone fire plummeting from a black sky onto a stone altar drenched with water, halftone steam rising, anonymous silhouettes kneeling at base."),
    ("ot-elijah-cave-whisper", "lament", "1:1", "A silhouette seated cross-legged at the mouth of a narrow stone cave on a remote mountainside, mantle pulled across face, halftone storm just having passed, anonymous through hard backlight."),
    ("ot-elijah-chariot-fire", "theophany", "9:16", "A bearded silhouette being lifted into a whirlwind of halftone golden firelight braided into the form of horses and a chariot, mantle unfurling, anonymous through silhouette and radiance."),
    ("ot-elisha-bones-revival", "resurrection", "1:1", "A weathered cave-wall bone resting against pale stone, halftone glow beginning to suffuse the bone surface, surreal radiance, no figures."),
    ("ot-naaman-jordan-dip", "matins", "16:9", "A powerful silhouette half-emerged from amber river water at dawn, water streaming off shoulders in graphic ribbons, halftone gleam catching restored skin, anonymous through hard backlight."),
    ("ot-job-ash-heap-silent", "lament", "16:9", "A silhouette seated alone on a heap of ashes outside a city wall at dusk, head bowed into hands, a single piece of broken pottery beside, halftone horizon-line of dawn at far edge, anonymous through silhouette."),
    ("ot-job-whirlwind-voice", "theophany", "9:16", "A vast halftone whirlwind of wind and dust funneling down from a black sky to a tiny silhouette below, surreal supernatural scale, anonymous through scale and silhouette."),
    ("ot-isaiah-coal-lips", "exodus", "1:1", "A pair of bronze tongs holding a single glowing red coal, halftone radiance, no figures, sharp graphic shadow."),
    ("ot-isaiah-throne-vision", "theophany", "9:16", "An immense radiant throne raised high in halftone heavens, brilliant winged seraph silhouettes flanking it, white-hot light radiating in graphic rays, no human figures."),
    ("ot-jeremiah-potter-clay", "lament", "1:1", "A pair of weathered hands working a lump of damp clay on a spinning potter's wheel, halftone gleam on wet clay, anonymous through extreme crop."),
    ("ot-jeremiah-weeping", "lament", "4:5", "A solitary silhouette seated against a stone wall in the rubble of a destroyed city, head bowed in grief, halftone smoke and ruin in distance, anonymous through silhouette."),
    ("ot-ezekiel-dry-bones", "exodus", "16:9", "A vast valley floor strewn with bleached bone-shapes, halftone wind sweeping across, a single complete reassembled skeleton standing dead-center, surreal supernatural scale, no figures."),
    ("ot-daniel-lions-den", "memento", "9:16", "A circular stone pit dimly lit, three peaceful lion silhouettes ringing a calm seated figure, halftone shaft of cream light pouring down from a small overhead opening, anonymous through silhouette."),
    ("ot-daniel-handwriting-wall", "judgment", "16:9", "A great Babylonian feast-hall wall at night with a single disembodied luminous hand mid-air scratching abstract carved lines (no readable letters), halftone radiance, the feast-table beneath in deep shadow, anonymous figures."),
    ("ot-jonah-great-fish", "storm", "16:9", "A vast cobalt halftone wave splitting open at the surface to disgorge a tiny silhouette onto a sandy beach at dawn, the great curving back of the fish disappearing back into the sea, anonymous through silhouette."),
    ("ot-esther-throne-scepter", "passion", "16:9", "A long marble corridor in one-point perspective with a small silhouette walking down its center, a distant raised throne with a single mustard-ochre graphic line of an extended scepter, anonymous through silhouette and scale."),
    ("ot-hagar-wilderness-noon", "wilderness", "16:9", "A small silhouette of a woman cradling a child in vast pale ochre dunes at high noon, surreal heat-shimmer, halftone graphic bird circling far in the cobalt sky, anonymous through silhouette."),

    # ----- NEW TESTAMENT NARRATIVES — birth + early life -----
    ("nt-annunciation-lily", "matins", "4:5", "A single white lily standing in a clay pot in a small interior at dawn, halftone glow from a luminous figure offscreen, a small silhouette seated cross-legged in shadow, anonymous through deep silhouette."),
    ("nt-magi-journey-star", "memento", "16:9", "A small caravan of three silhouetted camels traversing a vast night dune-line under a single brilliant cream-paper graphic star, halftone sky, anonymous through silhouette and scale."),
    ("nt-bethlehem-stable-manger", "communion", "3:2", "Interior of a low rough stone stable carved into a hillside cave at deep night, a wooden manger filled with golden-ochre straw, a single clay oil-lamp casting halftone warm light, no figures, archway showing one bright star."),
    ("nt-shepherds-fields-star", "memento", "16:9", "A wide hillside at deep night with a small low campfire and two seated silhouettes nearby, scattered cream-graphic dot sheep across the slope, a single bright cream-paper graphic star upper-left, anonymous through silhouette."),
    ("nt-flight-egypt-dust", "wilderness", "16:9", "A small silhouetted family on a donkey crossing a vast desert at dusk, halftone sandstorm rising behind them, anonymous through silhouette and backlight."),
    ("nt-boy-temple-12", "lament", "1:1", "A small silhouetted figure seated cross-legged on a stone floor amid a circle of older silhouetted teachers in a temple court, halftone shaft of light from above, anonymous through silhouette."),

    # ----- NEW TESTAMENT NARRATIVES — ministry -----
    ("nt-john-baptizer-jordan", "storm", "1:1", "A wide river at twilight with a single silhouette standing waist-deep in halftone water, distant rocky banks, anonymous through silhouette."),
    ("nt-baptism-jordan-dove", "matins", "9:16", "A single silhouette half-emerged from amber river water with a graphic descending dove of cream-paper light hovering above, halftone radiance from the open sky, anonymous through hard backlight."),
    ("nt-temptation-wilderness", "wilderness", "9:16", "A single silhouette standing alone on a high desert pinnacle at dusk, halftone dust storm swirling, surreal scale, anonymous through deep silhouette."),
    ("nt-calling-fishermen-shore", "matins", "16:9", "A pebble shore at dawn with two silhouetted fishermen hauling a small wooden boat, a single silhouette standing on the shore-line with one hand extended in call, halftone golden lake, anonymous through silhouette."),
    ("nt-cana-water-wine", "communion", "1:1", "Six tall stone water-jars in a row in a courtyard at evening, halftone amber wine-tint just beginning to suffuse the upper rim of each jar, surreal transformation, no figures."),
    ("nt-fishers-of-men-net", "sacrament", "16:9", "Two anonymous silhouettes pulling a heavy net heavy with halftone-graphic fish from a sun-lit sea, anonymous through hard backlight."),
    ("nt-mountain-prayer-dawn", "lament", "9:16", "A solitary silhouette kneeling on a high mountain ridge at dawn, halftone golden light cresting the horizon, anonymous through silhouette."),
    ("nt-sermon-mount-crowd", "sacrament", "16:9", "A wide hillside at golden hour with a vast halftone crowd of silhouetted figures seated in the grass facing toward a small standing silhouette, anonymous through silhouette."),
    ("nt-beatitudes-mountain", "matins", "9:16", "A single elevated silhouette atop a low rise at dawn, vast crowd of halftone silhouettes ringed below, anonymous through silhouette."),
    ("nt-water-jar-samaritan-well", "communion", "1:1", "A stone wellhead at high noon with an empty terracotta water-jar resting on the rim, two silhouettes flanking the well in conversation, halftone sun-bleached stone, anonymous through silhouette."),
    ("nt-five-thousand-fed", "sacrament", "16:9", "A wide hillside at golden hour with a vast halftone crowd of seated silhouettes, baskets of bread visible in foreground, anonymous through silhouette."),
    ("nt-loaves-fishes-basket", "communion", "1:1", "A flat woven palm-leaf basket containing five small round flat barley loaves and two dried fish, halftone gleam, anonymous hands radiating in from frame edges, anonymous through extreme crop."),
    ("nt-walking-water-storm", "storm", "16:9", "A small wooden fishing boat rocking heavily in halftone dark waves at night, a single silhouette mid-stride atop the water surface, anonymous through hard backlight."),
    ("nt-calming-storm-boat", "storm", "16:9", "A small wooden boat at the height of a halftone night storm, a single silhouette standing at the bow with one hand raised flat toward the storm, anonymous through silhouette."),
    ("nt-healing-leper-touch", "passion", "1:1", "A single outstretched silhouetted hand gently touching another, halftone radiance dispelling marks on the skin, anonymous through extreme crop."),
    ("nt-bartimaeus-blind-healed", "passion", "1:1", "A wide dusty road at sunset with a silhouetted beggar leaping up from a roadside ditch reaching upward toward a halftone break of light, anonymous through silhouette."),
    ("nt-bleeding-woman-cloak", "lament", "1:1", "A single trembling fingertip just touching the hem of a cream linen cloak, halftone golden radiance suffusing the fabric at the point of contact, anonymous through extreme crop."),
    ("nt-zacchaeus-sycamore", "sacrament", "1:1", "An ancient gnarled sycamore tree at midday with a small silhouette perched in the upper branches, halftone leaves stippling the foliage, anonymous through silhouette."),
    ("nt-lazarus-tomb-emerging", "resurrection", "9:16", "A man-shaped silhouette stepping unsteadily out of a dark stone tomb at the threshold, partially unwrapped halftone strips of linen trailing, halftone daylight outside, anonymous through deep backlight."),
    ("nt-transfiguration-summit", "theophany", "9:16", "A high mountaintop at dawn with a central radiant silhouette glowing as halftone mustard-ochre and cream radiance, two silhouetted prophets flanking, three smaller silhouetted figures collapsed at base, anonymous through radiance and silhouette."),
    ("nt-mary-anointing-feet", "communion", "4:5", "Long flowing dark hair cascading over a man's bare feet in halftone close-up, a tipped alabaster jar with golden oil pooling on stone floor, anonymous through extreme close crop and shadow."),
    ("nt-blessing-children", "matins", "1:1", "A pair of weathered hands resting gently on the heads of two small silhouetted children in halftone warm light, anonymous through extreme crop and silhouette."),
    ("nt-cleansing-temple-coins", "judgment", "16:9", "A halftone whirl of bronze coins and overturned wooden tables at midday, sharp graphic shadow of a knotted cord whip, no faces visible, anonymous through chaos and crop."),
    # ----- NEW TESTAMENT NARRATIVES — passion week -----
    ("nt-triumphal-entry-palms", "matins", "16:9", "A paved dust street at midday with halftone-stippled palm fronds being cast on the ground, a small silhouette astride a donkey moving through, anonymous through silhouette."),
    ("nt-passion-garden-olive", "lament", "9:16", "A grove of twisted ancient olive trees at night with a single silhouette prostrate beneath one, halftone moon visible, anonymous through deep silhouette."),
    ("nt-cup-trembling-stone", "lament", "4:5", "A single rough-hewn stone goblet brimming with halftone burgundy wine on a flat grey rock at night, surreal trembling rim ripple, two thorny olive branches arcing in from frame edges, no figures."),
    ("nt-gethsemane-prayer-drops", "lament", "9:16", "A single silhouette kneeling beneath olive trees at deep night, halftone droplets falling from the brow onto stone, anonymous through deep silhouette."),
    ("nt-betrayal-kiss-shadow", "passion", "1:1", "Two silhouettes close-faced in a halftone embrace with torchlight raking from frame edge, anonymous through profile silhouette and backlight."),
    ("nt-trial-pilate-silence", "judgment", "1:1", "A single silhouette standing in calm silence facing a seated figure on a raised dais, halftone columns flanking, anonymous through silhouette."),
    ("nt-three-nails-stone", "passion", "1:1", "Three iron nails arranged in a row on rough-cut stone, halftone gleam, sharp graphic shadow, no figures."),
    ("nt-via-dolorosa-beam", "passion", "16:9", "A silhouette carrying a heavy wooden beam up a stone street at dawn, halftone city wall in shadow, anonymous through deep backlight."),
    ("nt-three-crosses-dusk", "judgment", "3:2", "Three tall stark silhouetted crosses on a hill at storm-dusk, halftone mustard-and-charcoal sky bruised with dawn-break, no graphic violence, no recognizable figures, anonymous through silhouette."),
    ("nt-veil-temple-torn", "theophany", "4:5", "A heavy embroidered curtain torn from top to bottom in a clean vertical rip, halftone radiance pouring through, no figures."),
    ("nt-empty-tomb-stone-rolled", "resurrection", "16:9", "A great cylindrical rolling-stone disc rolled aside from the dark threshold of a tomb at dawn, halftone radiance pouring from inside, no figures."),
    ("nt-empty-shroud-folded", "resurrection", "1:1", "A neatly folded burial cloth resting on a stone bench inside a rock-hewn tomb, halftone shaft of bright light pouring from off-frame, no figures."),
    ("nt-doubting-thomas-hand", "lament", "1:1", "A single outstretched anonymous hand reaching toward a soft healed line on a torso visible against a dark cloak, halftone radiance, anonymous through extreme crop."),
    ("nt-emmaus-road-stranger", "matins", "16:9", "Three silhouettes walking together on a dusty road at golden hour, halftone landscape, the central figure faintly luminous at the edges, anonymous through silhouette."),
    ("nt-breakfast-shore-fish", "matins", "1:1", "A small charcoal fire on a pebble shore at dawn with halftone fish grilling, halftone steam rising, no figures."),
    ("nt-ascension-cloud-mount", "resurrection", "9:16", "A halftone cloud descending and lifting upward against a clearing sky, eleven silhouettes on a mountaintop watching from below, anonymous through silhouette and scale."),
    # ----- NEW TESTAMENT NARRATIVES — Acts + Pauline -----
    ("nt-pentecost-fire-tongues", "theophany", "1:1", "A circle of bowed silhouettes seated in a dim upper room, halftone tongues of flame hovering above each head, anonymous through silhouette."),
    ("nt-pentecost-wind-room", "theophany", "16:9", "A wider upper-room scene with halftone vertical streaks of supernatural wind descending, twelve silhouettes upturned, anonymous through silhouette."),
    ("nt-stephen-vision-look-up", "theophany", "4:5", "A single silhouette kneeling at the edge of a stone-quarry pit at dawn, face uplifted toward a halftone cloud-break revealing radiance, anonymous through silhouette."),
    ("nt-damascus-road-blinding", "theophany", "16:9", "A Roman road in the Syrian desert at midday with a single halftone vertical column of cream-and-mustard radiance descending, a silhouette collapsed to knees beneath shielding face, anonymous through silhouette and backlight."),
    ("nt-cornelius-house-vision", "matins", "1:1", "A silhouette seated on a rooftop at midday in halftone trance-vision, a great descending sheet of cream cloth lowered from above, surreal halftone radiance, anonymous through silhouette."),
    ("nt-philippi-jailer-dawn", "matins", "9:16", "An ancient stone prison cell at dawn with halftone broken-open chains scattered, two silhouettes seated calmly, anonymous through silhouette."),
    ("nt-paul-shipwreck-malta", "storm", "16:9", "A small wooden Roman cargo ship splintered against rocks at dawn, halftone heaving sea, scattered silhouettes swimming toward the shore, anonymous through silhouette and backlight."),
    ("nt-paul-prison-writing", "lament", "1:1", "A single silhouetted hand writing on a parchment scroll at a small wooden table by halftone clay-lamp light in a stone cell, no readable lettering, anonymous through extreme crop."),
    ("nt-revelation-throne-room", "theophany", "9:16", "A vast cavernous throne hall with an enormous halftone throne raised on stone steps, brilliant graphic light pouring through high windows, no human figures."),
    ("nt-revelation-river-life", "matins", "16:9", "A bright surreal river of halftone radiance flowing from beneath a great throne through a flowering plain, halftone gleam, no figures."),

    # ----- PARABLES -----
    ("par-sower-scattering", "matins", "16:9", "A silhouette mid-stride scattering halftone seeds with a wide arc of the hand, four bold zones of differently-fated ground beneath, anonymous through silhouette."),
    ("par-wheat-tares-growing", "communion", "16:9", "A wide field of wheat with darker spiked weeds growing tangled side-by-side in a single seamless halftone band, no figures."),
    ("par-mustard-seed-palm", "matins", "1:1", "An extreme close-up of a single tiny mustard seed in the lined center of a calloused open hand, halftone shadow lines, anonymous through extreme crop."),
    ("par-mustard-tree-birds", "matins", "9:16", "A vast spreading halftone tree on a hillside with countless small graphic birds perched in branches at sunset, no figures."),
    ("par-hidden-treasure-field", "memento", "16:9", "A silhouette kneeling in a freshly-dug pit in a field, hands lifting the lid of a halftone wooden chest brimming with golden coin-shapes, anonymous through silhouette."),
    ("par-pearl-merchant-held", "memento", "1:1", "A single calloused open palm holding a luminous halftone pearl against a black ground, halftone gold rays radiating, anonymous through extreme crop."),
    ("par-net-of-fish-sorted", "communion", "16:9", "A halftone net spread across a beach with separate piles of fish shapes and discard, anonymous silhouettes hauling, anonymous through silhouette."),
    ("par-lost-sheep-shoulders", "matins", "16:9", "A silhouette mid-stride carrying a single small lamb across the shoulders, halftone hillside with 99 graphic dot-sheep behind, anonymous through silhouette."),
    ("par-lost-coin-lamp", "communion", "1:1", "A silhouette kneeling on a swept clay floor holding a halftone clay oil-lamp aloft, hard cream-paper light cone falling on a single bright coin in the corner, anonymous through silhouette."),
    ("par-prodigal-pigs", "lament", "16:9", "A silhouette slumped against a wooden trough among halftone pigs in a muddy yard at dusk, anonymous through silhouette."),
    ("par-prodigal-embrace", "communion", "3:2", "Two silhouettes locked in a halftone embrace on a dusty road at golden hour, the older father's silhouette running outward with arms wide, anonymous through silhouette."),
    ("par-two-debtors-forgiven", "communion", "16:9", "Three silhouettes arranged around a low table, a halftone debt-document tearing into two halves mid-air, anonymous through silhouette."),
    ("par-unmerciful-servant", "judgment", "16:9", "Two silhouettes locked in a confrontation outside a master's house — one finely-dressed silhouette gripping a kneeling poorer silhouette by the throat, anonymous through silhouette and backlight."),
    ("par-good-samaritan-bandage", "matins", "16:9", "A silhouette kneeling beside an injured silhouette on a roadside, gently bandaging a wound with halftone clean linen, a small halftone donkey behind, anonymous through silhouette."),
    ("par-persistent-widow", "lament", "1:1", "A silhouette knocking persistently at a great wooden door at midnight, halftone clay-lamp light spilling from a high window, anonymous through silhouette."),
    ("par-pharisee-tax-collector", "judgment", "16:9", "A wide stone temple court at midday with two silhouettes — left figure with hands lifted high in pride, right figure bowed low striking chest in penitence, anonymous through silhouette."),
    ("par-wise-foolish-virgins", "memento", "16:9", "Ten silhouetted figures at a great closed wooden door at midnight, five with halftone bright lamp-flames, five with dark unlit lamps, anonymous through silhouette."),
    ("par-talents-three-bags", "communion", "16:9", "Three weathered leather coin-bags of different sizes in a row on rough wooden floorboards, the largest spilling halftone coins, the smallest buried in fresh soil, no figures."),
    ("par-sheep-goats-sorted", "judgment", "16:9", "A wide hillside at evening with a flock of cream-graphic sheep facing left and a flock of dark goats facing right, a single silhouette holding staff and lamp dead-center, anonymous through silhouette."),
    ("par-wedding-feast-poor", "matins", "16:9", "A great open courtyard banquet at evening with a streaming halftone procession of unexpected guests entering, anonymous through silhouette."),
    ("par-vineyard-laborers-pay", "communion", "16:9", "A row of five silhouetted laborers receiving halftone single coins each from a bold ochre owner-figure at evening, anonymous through silhouette."),
    ("par-wicked-tenants-vineyard", "judgment", "16:9", "A great vineyard at dusk with a halftone watchtower and a small silhouetted heir approaching gates barred shut, anonymous through silhouette."),
    ("par-builders-rock-sand", "judgment", "16:9", "Two simple stone houses side-by-side under halftone violent storm — left standing solid, right collapsed into rubble, no figures."),
    ("par-leaven-three-measures", "communion", "16:9", "An interior of a small kitchen at evening with a great mound of halftone rising dough on a kneading-table, a single silhouette folding leaven in, anonymous through silhouette."),
    ("par-tower-builder-cost", "lament", "16:9", "An unfinished tall stone watch-tower abandoned mid-construction at midday, halftone scaffolding around upper half, no figures."),
    ("par-narrow-gate-broad-road", "passion", "16:9", "A bifurcation in a path — a wide halftone dust road sweeping leftward and a narrow stony path rising rightward to a small bright cream-paper gate, no figures."),
    ("par-lamp-bushel-stand", "matins", "16:9", "A comparison-diptych — left: a halftone clay oil-lamp on a tall lampstand throwing bright cream rays; right: an identical lamp under an overturned wooden basket containing its glow, no figures."),
    ("par-fig-tree-barren", "lament", "16:9", "A single barren fig tree in a vineyard at dusk, halftone bare branches reaching, a kneeling silhouette at its base loosening soil with a wooden hoe, anonymous through silhouette."),
    ("par-vine-and-branches", "lament", "1:1", "A thick gnarled grapevine trunk with multiple twisting branches bearing heavy halftone clusters of dark grapes, no figures."),
    ("par-good-shepherd-gate", "matins", "1:1", "A simple wooden gate set into a stone sheepfold wall at golden hour, halftone lambs scattered beyond, no figures."),

    # ----- SYMBOLIC OBJECTS — vessels & food -----
    ("sym-bread-broken-hands", "communion", "3:2", "Two silhouetted hands holding a torn flat round loaf of bread mid-break, halftone fresh inner crumb, a clay cup of red wine just visible at lower-left, anonymous through extreme crop."),
    ("sym-wine-cup-stone", "communion", "1:1", "A single rough-hewn stone goblet brimming with halftone burgundy wine on a flat grey rock, no figures."),
    ("sym-bread-and-wine", "communion", "1:1", "A torn round loaf and a stoneware cup of red wine on a folded cream linen cloth, halftone shaft of warm light from upper-right, no figures."),
    ("sym-olive-branch-single", "matins", "1:1", "A single small olive branch with three halftone leaves and one ripe olive lying diagonal on cream paper, no figures."),
    ("sym-olive-press-stone", "communion", "1:1", "A great basalt olive-press stone wheel resting in its trough at evening, halftone gleam of fresh oil, no figures."),
    ("sym-vine-grapes-cluster", "communion", "1:1", "A single heavy cluster of halftone dark grapes hanging from a gnarled vine, leaves silhouetted, no figures."),
    ("sym-wheat-sheaf-tied", "matins", "1:1", "A single bound sheaf of halftone wheat-stalks standing upright, twine knotted at the middle, no figures."),
    ("sym-wheat-single-stalk", "matins", "9:16", "One tall slender wheat stalk standing alone against halftone golden field, no figures."),
    ("sym-fig-leaf-veined", "matins", "1:1", "A single broad fig-leaf in halftone close-up showing every vein, no figures."),
    ("sym-pomegranate-cut", "communion", "1:1", "A halftone pomegranate cut clean in half showing the inner ruby seed-cluster, no figures."),
    ("sym-mustard-seed-tweezers", "matins", "1:1", "A pair of fine bronze tweezers holding a single tiny mustard seed in halftone macro, no figures."),
    ("sym-lily-trumpet", "matins", "1:1", "A single trumpet-lily bloom with stem and one leaf, halftone gleam, no figures."),
    ("sym-thorn-branch-curved", "passion", "1:1", "A curved halftone thorn-branch with sharp barbs and small leaves, no figures."),
    ("sym-thorn-crown-woven", "passion", "1:1", "A circular crown woven of thick halftone thorned branches with sharp barbs, no figures."),
    ("sym-cross-stark-hill", "passion", "9:16", "A single tall stark wooden cross silhouette atop a barren hill at storm-dusk, halftone bruised sky, no figures."),
    ("sym-three-nails-row", "passion", "1:1", "Three iron nails arranged in a row on rough-cut stone, halftone gleam, no figures."),
    ("sym-veil-rent-vertical", "theophany", "4:5", "A heavy halftone embroidered curtain torn from top to bottom in a clean vertical rip with cream radiance pouring through, no figures."),
    ("sym-linen-folded", "resurrection", "1:1", "A neatly folded cream linen burial cloth on a flat stone slab, halftone shaft of light, no figures."),
    ("sym-stone-rolled-tomb", "resurrection", "16:9", "A great cylindrical stone disc rolled aside from a dark tomb-mouth at dawn, halftone radiance pouring out, no figures."),
    ("sym-jacob-ladder-dream", "theophany", "9:16", "A surreal halftone diagonal stairway of golden light rising from earth into starry sky, small luminous figures ascending and descending, no recognizable faces."),
    ("sym-ark-cherubim-wings", "memento", "1:1", "A halftone gold ark with two cherubim silhouettes facing each other across a mercy-seat, halftone radiance, no figures."),
    ("sym-tabernacle-curtain", "lament", "9:16", "A heavy embroidered halftone curtain hanging in dim sanctuary, faint amber lamp-light filtering through, no figures."),
    ("sym-showbread-table", "communion", "1:1", "Twelve halftone loaves of bread arranged in two stacks on a small gold-edged table, no figures."),
    ("sym-menorah-seven-flames", "memento", "4:5", "A single halftone hammered-gold seven-branched menorah on a polished black slab, all seven oil-cup branches lit with steady warm flames, no figures."),
    ("sym-altar-incense-smoke", "lament", "9:16", "An ancient stone incense altar with a single halftone column of smoke rising vertically toward the heavens, no figures."),
    ("sym-censer-swung-trail", "lament", "1:1", "A halftone hammered-bronze censer swung mid-arc on its chain, smoke trailing in a graphic curve, no figures."),
    ("sym-trumpet-shofar-curved", "exodus", "3:2", "A single hammered-bronze long curved trumpet on folded cream linen, halftone gleam, no figures."),
    ("sym-shofar-rams-horn", "exodus", "1:1", "A curved halftone ram's horn with carved spiral grooves, no figures."),
    ("sym-lyre-seven-strings", "communion", "4:5", "A single halftone bronze lyre with seven taut strings, lying on charcoal cloth, no figures."),
    ("sym-stone-tablets-pair", "memento", "1:1", "Two arched halftone stone tablets standing upright, abstract carved-line patterns suggesting structure but NO readable letters, no figures."),
    ("sym-brass-serpent-pole", "exodus", "9:16", "A tall wooden pole with a halftone coiled cast-bronze serpent wrapped around its upper portion, no figures."),
    ("sym-anointing-horn", "sacrament", "1:1", "A ram's horn vessel with halftone glistening oil pouring out onto stone, no figures."),
    ("sym-oil-flask-amber", "sacrament", "3:2", "A single ancient halftone amber-glass flask tipped on a slab of polished black basalt, viscous trail of golden oil drizzling out, no figures."),
    ("sym-coin-tribute-bronze", "memento", "1:1", "A single ancient halftone bronze tribute coin lying flat on polished black slab, abstract embossed profile-shape (no readable letters), no figures."),
    ("sym-coin-widow-mites", "communion", "1:1", "Two small halftone bronze coins falling mid-air over a worn temple offering chest, an old silhouetted hand at upper edge, anonymous through extreme crop."),
    ("sym-sandals-removed-dust", "matins", "1:1", "A pair of halftone worn leather sandals empty on cracked dry red earth, dust visible in foot-imprint, no figures."),
    ("sym-yoke-broken-wood", "matins", "3:2", "A heavy hand-carved wooden ox-yoke lying broken in two halves on sun-bleached straw, halftone splintered fresh-wood break-line, no figures."),
    ("sym-anchor-iron-deep", "storm", "9:16", "A weathered halftone iron anchor descending through deep dark water with stormy waves at the surface, no figures."),
    ("sym-key-skeleton-brass", "memento", "3:2", "A single ornate halftone brass skeleton key lying diagonally on folded indigo linen, no figures."),
    ("sym-broken-jar-perfume", "passion", "1:1", "A shattered halftone alabaster jar on a stone floor with golden perfume oil pooling, no figures."),
    ("sym-clay-water-jar-broken", "lament", "1:1", "A single terracotta halftone clay water jar lying broken on its side on cracked dry earth, three large shards separated, no figures."),
    ("sym-shepherd-crook-leaning", "matins", "4:5", "A single ancient hand-carved halftone wooden shepherd's crook leaning against a rough fieldstone wall, no figures."),
    ("sym-fishing-net-coiled", "matins", "1:1", "A coiled halftone fishing-net on pebble shore with a few stuck graphic fish, no figures."),
    ("sym-wineskin-old-cracked", "lament", "1:1", "An old cracked halftone leather wineskin lying on a wooden table with halftone burgundy wine pooling, no figures."),
    ("sym-living-water-overflow", "storm", "1:1", "A halftone stone vessel with brilliant water overflowing the rim onto a dark surface, halftone golden light catching the spray, no figures."),
    ("sym-dove-flight-olive", "matins", "1:1", "A single halftone dove descending mid-air carrying a fresh olive branch in its beak, no figures."),
    ("sym-fish-silhouette-loaf", "communion", "1:1", "A single halftone fish silhouette beside a torn round loaf of bread on cream paper, no figures."),
    ("sym-lamb-classical-marble", "memento", "1:1", "A halftone classical marble lamb sculpture with carved fleece detail, sun-disk halo behind, no figures."),

    # ----- HANDS & BODY FRAGMENTS (anonymous via crop) -----
    ("frag-open-palm-seed", "matins", "1:1", "An extreme close-up of a single calloused open palm with a halftone tiny seed in its center, anonymous through extreme crop."),
    ("frag-cupped-hands-water", "communion", "1:1", "Two cupped hands holding halftone water that brims and reflects warm light, anonymous through extreme crop."),
    ("frag-pierced-palm-light", "passion", "1:1", "A single open palm with a halftone soft healed line at the center radiating cream light, anonymous through extreme crop."),
    ("frag-washing-feet-basin", "communion", "1:1", "Halftone weathered hands gently pouring water from a clay pitcher over a bare foot in a stone basin, anonymous through extreme crop."),
    ("frag-anointing-oil-hands", "sacrament", "1:1", "A pair of halftone hands tipping a small clay oil-flask over a bowed silhouetted head, golden oil pouring, anonymous through close crop."),
    ("frag-breaking-bread-hands", "communion", "1:1", "Two halftone hands holding a torn loaf mid-break with crumbs falling, anonymous through extreme crop."),
    ("frag-lifted-hands-prayer", "lament", "9:16", "Two halftone hands raised silhouetted against a great mustard sun-disk halo at dusk, anonymous through hard backlight."),
    ("frag-folded-hands-rest", "matins", "1:1", "A pair of halftone weathered folded hands resting on an open simple book (no readable letters), anonymous through extreme crop."),
    ("frag-holding-scroll", "lament", "1:1", "A pair of halftone hands holding a partially-unrolled papyrus scroll, no readable letters, anonymous through extreme crop."),
    ("frag-holding-lamp-aloft", "memento", "9:16", "A single silhouetted hand holding a halftone clay oil-lamp aloft against deep black void, anonymous through extreme crop and backlight."),
    ("frag-pointing-hand-call", "matins", "1:1", "A single silhouetted halftone hand extended in pointing gesture, sharp graphic shadow, anonymous through extreme crop."),
    ("frag-reaching-hand-mercy", "communion", "1:1", "A halftone hand extended downward reaching toward another halftone hand reaching upward, anonymous through extreme crop."),
    ("frag-bandaging-hand", "matins", "1:1", "A halftone hand carefully wrapping a wound on a forearm with cream linen, anonymous through extreme crop."),
    ("frag-clasped-hands-covenant", "communion", "1:1", "Two halftone hands clasped firmly in covenant grip, anonymous through extreme crop."),
    ("frag-shoulder-comfort", "lament", "1:1", "A halftone weathered hand resting gently on a bowed silhouetted shoulder, anonymous through extreme crop."),
    ("frag-fingertip-touch-heal", "matins", "1:1", "A single halftone fingertip just touching a small graphic mark on skin, halftone radiance dispelling the mark, anonymous through extreme crop."),
    ("frag-sandalled-feet-dust", "wilderness", "1:1", "A pair of halftone sandalled feet stepping through fine dust, footprints behind, anonymous through extreme crop."),
    ("frag-bare-feet-holy-ground", "matins", "1:1", "Halftone bare feet on warm-lit stone, sandals discarded beside, anonymous through extreme crop."),
    ("frag-bowed-head-shoulders", "lament", "1:1", "Halftone close crop of a bowed head and shoulders silhouetted against a great mustard sun-disk halo, anonymous through silhouette."),
    ("frag-profile-silhouette", "memento", "1:1", "A halftone classical profile silhouette against a flat halftone gold halo disk, anonymous through silhouette."),

    # ----- CLASSICAL SCULPTURE (per inspo: marble busts + halo discs) -----
    ("class-marble-bust-halo", "memento", "1:1", "A halftone classical marble bust on a marble pedestal centered against a giant flat mustard halftone halo disk on deep black background, heavy film grain."),
    ("class-marble-torso-ruin", "lament", "9:16", "A halftone classical marble torso fragment standing alone in a quiet ruined hall, halftone shaft of cream light raking across, no figures."),
    ("class-marble-hand-fragment", "memento", "1:1", "A halftone classical marble hand fragment lying on dust ground, halftone gleam, no other figures."),
    ("class-marble-foot-fragment", "memento", "1:1", "A halftone classical marble foot fragment with toes broken, halftone gleam, no figures."),
    ("class-column-toppled", "judgment", "16:9", "A halftone classical stone column lying toppled across cracked earth, dust storm in distance, no figures."),
    ("class-column-standing", "memento", "9:16", "A single halftone classical column standing alone against a great mustard halftone sun-disk halo, no figures."),
    ("class-pediment-relief", "memento", "16:9", "A halftone classical pediment relief sculpture with weathered figures locked in narrative, halftone shadow detail, no recognizable faces."),
    ("class-pieta-detail-hands", "lament", "1:1", "A halftone classical Pieta sculpture detail showing only the marble hands cradling a marble face, anonymous through extreme crop."),
    ("class-classical-face-profile", "memento", "1:1", "A halftone classical marble face profile with sun-disk halo behind, anonymous through silhouette."),
    ("class-bust-mourning", "lament", "1:1", "A halftone classical marble bust with downcast eyes, halftone sun-disk halo behind in deep void, no other figures."),
    ("class-bust-prayer-hands", "lament", "1:1", "A halftone classical marble bust with hands folded at chest, halftone sun-disk halo behind, no other figures."),
    ("class-bust-side-lit", "memento", "1:1", "A halftone classical marble bust lit hard from one side, half in pure black void, halo behind, no other figures."),
    ("class-bust-thorns-crown", "passion", "1:1", "A halftone classical marble male bust crowned with halftone thorned branches against deep black background, halftone sun-disk halo behind, no other figures."),
    ("class-bust-lily-cracked", "lament", "1:1", "A halftone classical marble female bust with a fresh white lily growing from a hairline crack, halftone halo behind, no other figures."),
    ("class-bust-closed-eyes-tears", "lament", "1:1", "A halftone classical marble bust with closed eyes and a single halftone trail of marble-tear, halftone halo behind, no other figures."),
    ("class-marble-drapery-fold", "memento", "1:1", "A halftone close-up of classical marble drapery folds, halftone gleam catching every fold, no figures."),
    ("class-aqueduct-fragment", "wilderness", "16:9", "A halftone fragment of a great Roman aqueduct standing alone in a desert plain at dusk, surreal scale, no figures."),
    ("class-arch-ruined-desert", "wilderness", "16:9", "A halftone ruined classical archway standing alone in barren desert at golden hour, no figures."),
    ("class-amphitheater-empty", "lament", "16:9", "A halftone wide ancient amphitheater entirely empty at dusk, halftone shadow stripes raking across the stone seats, no figures."),
    ("class-forum-ruins-noon", "wilderness", "16:9", "A halftone ruined Roman forum at noon with broken columns scattered, surreal monumental scale, no figures."),
    ("class-classical-statue-weathered", "memento", "9:16", "A halftone classical statue weathered by time, eroded features, halftone halo disk behind, no other figures."),
    ("class-marble-skull-pedestal", "memento", "1:1", "A halftone marble skull on a small pedestal lit hard from above, halftone gold-lit cranium against deep void, no figures."),
    ("class-marble-hand-offering", "matins", "1:1", "A halftone classical marble hand fragment open palm-up offering a small halftone object, anonymous through extreme crop."),
    ("class-bust-gold-tinted", "memento", "1:1", "A halftone classical marble bust tinted entirely in halftone gold, halftone golden gleam catching every contour, halo behind, no other figures."),

    # ----- ATMOSPHERIC LANDSCAPES -----
    ("atmos-sea-galilee-dawn", "matins", "16:9", "A halftone calm shimmering sea at dawn with distant fishing boats silhouetted on the horizon, no foreground figures."),
    ("atmos-sea-galilee-storm", "storm", "16:9", "Heavy halftone slate-grey waves with white caps under low charcoal clouds, a single break in clouds letting a vertical shaft of silver light strike the water, no figures."),
    ("atmos-jordan-river-bend", "matins", "16:9", "A halftone Jordan River at a wide shallow bend, ankle-deep amber water flowing over smooth stones, halftone willows overhanging, no figures."),
    ("atmos-mount-sinai-monumental", "wilderness", "16:9", "Halftone vast jagged red-granite mountains with sharp shadowed cliffs, bone-dry wadi floor, single column of dark cloud above one peak, no figures."),
    ("atmos-negev-desert-noon", "wilderness", "16:9", "A halftone vast Negev desert at high noon with surreal heat-shimmer rising, no figures."),
    ("atmos-olive-grove-twisted", "matins", "16:9", "A halftone ancient olive grove on a terraced Judean hillside with gnarled twisted trunks, halftone silver-green leaves, no figures."),
    ("atmos-wheat-field-golden", "matins", "16:9", "A halftone wide field of fully ripe wheat at golden hour, low light raking horizontally, no figures."),
    ("atmos-vineyard-rows-dusk", "communion", "16:9", "A halftone vineyard with terraced rows of staked grapevines descending a hillside in regular geometric stripes at dusk, no figures."),
    ("atmos-gethsemane-night", "lament", "9:16", "A halftone dark grove of twisted ancient olive trees at night with a single moon visible through branches, no figures."),
    ("atmos-mount-olives-vista", "matins", "16:9", "A halftone wide vista from Mount of Olives looking across Kidron Valley toward Jerusalem walls in middle distance, no figures."),
    ("atmos-jerusalem-rooftops-dusk", "vespers", "16:9", "A halftone first-century Jerusalem rooftop sea stepping down toward the second temple, halftone smoke columns rising, no figures."),
    ("atmos-temple-courtyard-noon", "memento", "16:9", "A halftone empty temple courtyard at midday with massive carved limestone pillars on either side, a stepped bronze altar middle distance, no figures."),
    ("atmos-synagogue-interior", "lament", "16:9", "A halftone interior of an ancient stone synagogue with long stone benches and a closed scroll on a central reading-table, halftone eternal lamp burning above, no figures."),
    ("atmos-threshing-floor-evening", "matins", "16:9", "A halftone circular threshing floor at dusk on a flat hilltop with a small grain-pile and a wooden winnowing fork, no figures."),
    ("atmos-marketplace-dawn", "matins", "16:9", "A halftone narrow stone street between low limestone buildings at dawn with simple wooden stalls being set up, anonymous tiny silhouettes only."),
    ("atmos-city-gate-stone", "memento", "16:9", "A halftone monumental ancient stone city-gate at noon with halftone shadow inside the archway, no figures."),
    ("atmos-watchtower-vineyard", "lament", "16:9", "A halftone ancient stone watchtower rising from a hillside vineyard at golden hour, no figures."),
    ("atmos-sheepfold-gate", "matins", "16:9", "A halftone stone sheepfold at dawn with a wooden gate ajar, halftone graphic sheep clustered inside, no figures."),
    ("atmos-wilderness-juniper", "lament", "16:9", "A halftone single twisted juniper tree alone on a barren rocky desert plateau at late afternoon, no figures."),
    ("atmos-cherith-brook", "matins", "16:9", "A halftone narrow rocky brook running between cliff faces at dawn, two halftone graphic ravens descending, no figures."),
    ("atmos-mount-carmel-summit", "theophany", "9:16", "A halftone bare summit of Mount Carmel at storm-noon with halftone dark clouds gathering, no figures."),
    ("atmos-cave-elijah-mouth", "lament", "9:16", "A halftone narrow stone cave mouth on a remote mountainside, halftone shaft of cream light just inside, no figures."),
    ("atmos-promised-land-overlook", "matins", "16:9", "A halftone wide vista from a high ridge overlooking a halftone fertile valley below, surreal monumental scale, no figures."),
    ("atmos-empty-fishing-boat-shore", "matins", "16:9", "A halftone single empty wooden fishing boat pulled up on pebble shore at dawn, halftone net coiled beside, no figures."),
    ("atmos-stormy-lake-tiberias", "storm", "16:9", "A halftone stormy lake at dusk with halftone heaving waves and a small empty boat barely visible, no figures."),
    ("atmos-mountain-clouds-storm", "theophany", "16:9", "A halftone vast mountain range with massive storm clouds rolling, halftone lightning crackling between heavens and summits, no figures."),
    ("atmos-cedar-grove-ridge", "lament", "16:9", "A halftone grove of ancient towering cedars on a high ridge at dawn, atmospheric haze, no figures."),
    ("atmos-empty-throne-hall", "resurrection", "16:9", "A halftone vast cavernous throne hall with an enormous empty throne raised on stone steps, halftone brilliant light pouring through high windows, no figures."),
    ("atmos-bethlehem-fields-night", "memento", "16:9", "A halftone wide hillside near Bethlehem at deep night with a single bright cream-paper graphic star, scattered halftone graphic dot-sheep, no figures."),
    ("atmos-judean-desert-noon", "wilderness", "16:9", "A halftone vast Judean wilderness at noon with red-granite outcroppings, no figures."),

    # ----- DECORATIVE / ABSTRACT GROUNDS (layout substrates) -----
    ("brand-halo-cream-disk", "memento", "1:1", "A large cream halftone halo disk centered on a deep charcoal ground, no other elements, abstract devotional graphic."),
    ("brand-halo-mustard-disk", "sacrament", "1:1", "A large mustard halftone halo disk centered on a deep black ground, no other elements, abstract devotional graphic."),
    ("brand-rays-vermilion-corner", "passion", "16:9", "Long radiating halftone rays emanating from one corner across a saturated terracotta ground, abstract devotional graphic."),
    ("brand-rays-mustard-banner", "sacrament", "16:9", "Long radiating halftone rays emanating from a top center across a black field, abstract devotional graphic."),
    ("brand-rays-sunburst-circle", "memento", "1:1", "A halftone sunburst with rays emanating from a central halo on saturated mustard ground, abstract devotional graphic."),
    ("brand-halftone-stripes-vertical", "sacrament", "16:9", "Vertical halftone-stippled stripes alternating mustard and deep charcoal, abstract textile pattern."),
    ("brand-halftone-stripes-horizontal", "lament", "16:9", "Horizontal halftone-stippled stripes alternating navy and bone cream, abstract textile pattern."),
    ("brand-halftone-waves", "storm", "16:9", "Halftone wave-pattern stripes graduating from teal to cream, abstract textile pattern."),
    ("brand-halftone-gradient-vertical", "memento", "9:16", "A halftone dot-gradient gradating from deep black at top to bone cream at bottom, abstract substrate."),
    ("brand-paper-grain-texture", "memento", "1:1", "Close-up of pale cream paper fiber under raking light showing every grain, abstract texture for layout use."),
    ("brand-paper-torn-edge", "lament", "16:9", "A halftone close-up of a torn cream-paper edge against deep black field, abstract texture."),
    ("brand-stone-texture-vertical", "lament", "9:16", "A halftone close-up of weathered ancient stone surface with fine cracks, abstract texture for layout use."),
    ("brand-stained-glass-abstract", "vespers", "9:16", "A halftone abstract stained-glass window pattern with bold geometric shapes in mustard, navy, and cream, no figures."),
    ("brand-pull-quote-burgundy-frame", "passion", "1:1", "A halftone burgundy-and-cream pull-quote graphic frame with thin gold rules above and below, no readable text, abstract layout substrate."),
    ("brand-pull-quote-charcoal-frame", "lament", "1:1", "A halftone charcoal pull-quote frame with thin gold rules above and below, no readable text."),
    ("brand-pull-quote-olive-frame", "matins", "1:1", "A halftone olive-and-cream pull-quote frame with thin gold rules above and below, no readable text."),
    ("brand-divider-ornament-cream", "memento", "16:9", "A halftone horizontal divider with cream rules and a small centered ornamental star-shape, abstract."),
    ("brand-divider-ornament-burgundy", "passion", "16:9", "A halftone horizontal divider with burgundy rules and a small centered ornamental shape, abstract."),
    ("brand-pillar-light-vertical", "theophany", "9:16", "A single halftone vertical pillar of cream-and-mustard radiance descending from black void, no figures, abstract."),
    ("brand-pillar-light-terracotta", "passion", "9:16", "A single halftone vertical pillar of cream radiance against terracotta field, no figures, abstract."),
    ("brand-thorn-underline-cream", "passion", "16:9", "A halftone single thin curved thorn-branch as horizontal underline against cream paper, no figures, abstract."),
    ("brand-sunburst-banner", "sacrament", "16:9", "A halftone sunburst banner with radiating mustard rays from horizon-line on cream paper, no figures, abstract."),
]


# --------------------------------------------------------------------------- #
# RUNNER
# --------------------------------------------------------------------------- #


@dataclass
class GenResult:
    slug: str
    success: bool
    cost: float
    error: Optional[str] = None
    output_path: Optional[Path] = None


def build_prompt(palette_key: str, scene: str) -> str:
    palette_str = PALETTES[palette_key]
    return (
        f"{scene} "
        f"{BRAND_BOILERPLATE}"
        f"70-20-10 PALETTE: {palette_str}."
    )


def generate_one(
    slug: str,
    palette_key: str,
    aspect: str,
    scene: str,
    model: str,
    output_dir: Path,
    dry_run: bool,
) -> GenResult:
    output_path = output_dir / f"{slug}.png"
    cost = PRICING[model]
    prompt = build_prompt(palette_key, scene)

    if dry_run:
        print(f"[DRY-RUN] {slug:30s} {model} {aspect:5s} -> {output_path.name}  (~${cost:.3f})")
        return GenResult(slug, success=True, cost=0.0, output_path=output_path)

    try:
        # Real Vertex Imagen call
        import os
        import vertexai  # type: ignore
        from vertexai.preview.vision_models import ImageGenerationModel  # type: ignore

        # Idempotent — initialize once per process. project + region are read
        # from env if not passed explicitly. Imagen is most reliable in us-central1.
        vertexai.init(
            project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
            location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
        )

        model_instance = ImageGenerationModel.from_pretrained(
            {
                "imagen-4": "imagen-4.0-generate-001",
                "imagen-4-ultra": "imagen-4.0-ultra-generate-001",
                "imagen-3": "imagen-3.0-generate-002",
            }[model]
        )
        response = model_instance.generate_images(
            prompt=prompt,
            number_of_images=1,
            aspect_ratio=aspect,
            safety_filter_level="block_some",
            person_generation="allow_adult",
        )
        if not response.images:
            return GenResult(slug, False, 0.0, error="No image returned")

        response.images[0].save(location=str(output_path))
        return GenResult(slug, True, cost, output_path=output_path)
    except Exception as e:
        return GenResult(slug, False, 0.0, error=str(e))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-spend", type=float, default=150.0,
                        help="Target spend in dollars (default: 150)")
    parser.add_argument("--max-images", type=int, default=None,
                        help="Optional hard cap on image count")
    parser.add_argument("--model", choices=["imagen-4", "imagen-4-ultra", "imagen-3"],
                        default="imagen-4", help="Vertex Imagen model")
    parser.add_argument("--parallelism", type=int, default=4,
                        help="Concurrent generations (default: 4)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print plan without calling API")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_ROOT,
                        help=f"Output directory (default: {OUTPUT_ROOT})")
    args = parser.parse_args()

    target_spend = min(args.target_spend, MAX_CAP_DOLLARS)
    if args.target_spend > MAX_CAP_DOLLARS:
        print(f"WARNING: --target-spend ${args.target_spend} exceeds hard cap ${MAX_CAP_DOLLARS}. Capping at ${MAX_CAP_DOLLARS}.")

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Vertex Imagen Batch")
    print(f"  Model         : {args.model}")
    print(f"  Per-image cost: ${PRICING[args.model]:.3f}")
    print(f"  Target spend  : ${target_spend:.2f}  (hard cap: ${MAX_CAP_DOLLARS})")
    print(f"  Max images    : {args.max_images if args.max_images else 'no limit (spend-bound)'}")
    print(f"  Parallelism   : {args.parallelism}")
    print(f"  Output dir    : {args.output_dir}")
    print(f"  Dry-run       : {args.dry_run}")
    print(f"  Prompts in bank: {len(PROMPTS)}")
    print()

    # Cycle through PROMPTS (with variation count) until target spend reached
    spent = 0.0
    completed = 0
    failed = 0
    results: list[GenResult] = []
    cost_per = PRICING[args.model]

    # Cycle prompts: each prompt may be re-rolled with seed variations to fill volume
    # Variation = how many takes of each prompt (small int >= 1)
    # If --max-images is set, we run min(target_count, max_images)
    target_count = int(target_spend / cost_per)
    if args.max_images:
        target_count = min(target_count, args.max_images)

    print(f"Plan: {target_count} images, estimated total ${target_count * cost_per:.2f}")
    print()

    # Build queue: cycle PROMPTS with -v1, -v2, ... suffixes to keep slugs unique
    queue: list[tuple[str, str, str, str]] = []
    cycle = 0
    while len(queue) < target_count:
        cycle += 1
        for slug, palette_key, aspect, scene in PROMPTS:
            if len(queue) >= target_count:
                break
            slug_with_var = f"{slug}-v{cycle}" if cycle > 1 else slug
            queue.append((slug_with_var, palette_key, aspect, scene))

    print(f"Queued {len(queue)} generation tasks. Starting...\n")

    try:
        with ThreadPoolExecutor(max_workers=args.parallelism) as ex:
            futures = [
                ex.submit(generate_one, s, p, a, sc, args.model, args.output_dir, args.dry_run)
                for s, p, a, sc in queue
            ]
            for fut in as_completed(futures):
                r = fut.result()
                results.append(r)
                if r.success:
                    completed += 1
                    spent += r.cost
                    sys.stdout.write(f"\r  [{completed}/{len(queue)}]  spent ${spent:.2f}  / target ${target_spend:.2f}     ")
                    sys.stdout.flush()
                else:
                    failed += 1
                    print(f"\n  FAIL  {r.slug}: {r.error}")

                # Hard kill-switch: stop submitting new work if we've hit cap
                if spent >= MAX_CAP_DOLLARS:
                    print(f"\n!! Hit hard cap ${MAX_CAP_DOLLARS}. Stopping further generation.")
                    for f in futures:
                        if not f.done():
                            f.cancel()
                    break
    except KeyboardInterrupt:
        print("\n!! Interrupted by user. Halting.")

    # Final summary
    print()
    print(f"{'='*60}")
    print(f"DONE")
    print(f"  Completed : {completed} images")
    print(f"  Failed    : {failed}")
    print(f"  Spent     : ${spent:.2f}")
    print(f"  Output    : {args.output_dir}")

    # Write run-log JSON
    log_path = args.output_dir / "run-log.json"
    with open(log_path, "w") as f:
        json.dump({
            "model": args.model,
            "target_spend": target_spend,
            "max_cap_dollars": MAX_CAP_DOLLARS,
            "completed": completed,
            "failed": failed,
            "spent": spent,
            "results": [
                {"slug": r.slug, "success": r.success, "cost": r.cost,
                 "error": r.error, "output_path": str(r.output_path) if r.output_path else None}
                for r in results
            ],
        }, f, indent=2)
    print(f"  Run log   : {log_path}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
