"""
Generate the Euangelion Visual Asset Catalog PDF -- Midjourney prompt library
for general site imagery (~57 prompts) in the locked photographic+halftone
direction with 70-20-10 color discipline.

Uses fpdf2 (pip install --user fpdf2). Output: docs/brand/EUANGELION-ASSET-CATALOG.pdf
"""

from __future__ import annotations

from fpdf import FPDF
from PIL import Image as PILImage
from pathlib import Path

OUTPUT_PATH = Path(
    "/Users/meltmac/Documents/app-projects/external/euangelion/docs/brand/EUANGELION-ASSET-CATALOG.pdf"
)

# --------------------------------------------------------------------------- #
# DATA
# --------------------------------------------------------------------------- #

PALETTES = [
    {
        "code": "PAL-01-THEOPHANY",
        "name": "Theophany",
        "use_case": "God appearing -- burning bush, fire from heaven, divine encounter",
        "breakdown": "70% midnight blue / near-black  *  20% burning orange  *  10% white-hot core",
        "hex": ["#0A1320", "#D94B1A", "#FFE89A"],
    },
    {
        "code": "PAL-02-SACRAMENT",
        "name": "Sacrament / Daily Bread",
        "use_case": "Communion, harvest, daily provision, pastoral, sower, vine",
        "breakdown": "70% mustard yellow  *  20% deep black / sepia  *  10% gold sun core",
        "hex": ["#D8A93A", "#1A1308", "#FFE066"],
    },
    {
        "code": "PAL-03-PASSION",
        "name": "Passion / Crown of Thorns",
        "use_case": "Suffering, repentance, the cross, lament-with-hope",
        "breakdown": "70% terracotta / burnt orange  *  20% deep charcoal  *  10% cream highlight",
        "hex": ["#C95428", "#1F1410", "#F0ECE6"],
    },
    {
        "code": "PAL-04-RESURRECTION",
        "name": "Resurrection / Glory",
        "use_case": "Easter, dawn breaking, empty tomb, ascension, transfiguration",
        "breakdown": "70% deep charcoal  *  20% golden amber  *  10% white-hot / cream",
        "hex": ["#1A1610", "#E8A23A", "#FFF8E8"],
    },
    {
        "code": "PAL-05-LAMENT",
        "name": "Lament / Pieta",
        "use_case": "Grief, mourning, classical sculpture, intercession",
        "breakdown": "70% midnight indigo  *  20% pale ivory marble  *  10% gold halo",
        "hex": ["#1A1428", "#E8DFCE", "#D4A841"],
    },
    {
        "code": "PAL-06-PILGRIMAGE",
        "name": "Pilgrimage / Calling",
        "use_case": "Journey, sunset silhouette, exodus, leaving home, the prodigal",
        "breakdown": "70% burning red-orange sunset  *  20% charcoal silhouette  *  10% white-hot solar",
        "hex": ["#C84028", "#1A0E0A", "#FFF4D6"],
    },
    {
        "code": "PAL-07-STORM",
        "name": "Storm / Voice over Waters",
        "use_case": "Stormy sea, lightning, divine power, fear of the Lord",
        "breakdown": "70% deep teal / midnight ocean  *  20% pale ghost cream  *  10% silver-white foam",
        "hex": ["#0F2330", "#E0DCD0", "#F5F5F8"],
    },
    {
        "code": "PAL-08-MEMENTO",
        "name": "Memento Mori / Vanitas",
        "use_case": "Mortality, ecclesiastes, gold-on-black, sacred relics, pearl of great price",
        "breakdown": "70% deep black  *  20% gold  *  10% bright gold halo glow",
        "hex": ["#0A0A0A", "#C49434", "#FFE066"],
    },
]

REFERENCES = [
    ("REF-06", "Lone rider on horse at sunset, red/orange/black halftone -- pilgrimage anchor"),
    ("REF-07", "Burning bush, orange flames against dark sky, photo-real halftone -- theophany anchor"),
    ("REF-08", "Lone tree on hillside in golden light, mustard/black duotone -- pastoral anchor"),
    ("REF-09", "Stormy sea + lightning, B&W halftone -- storm anchor"),
    ("REF-10", "Christ figure haloed with sun rays, yellow/black halftone -- glory anchor"),
    ("REF-11", "Ship on stormy seas, yellow/black duotone -- pilgrimage / journey anchor"),
    ("REF-12", "Golden glowing skull on black, halftone grain -- memento mori anchor"),
    ("REF-13", "Christ silhouette ascending into yellow halo with rays -- resurrection anchor"),
    ("REF-14", "Anonymous hand cradling glowing eye/orb on yellow -- surreal-devotion anchor"),
    ("REF-15", "Crown-of-thorns figure silhouette on orange -- passion anchor"),
    ("REF-16", "Bread + wine still life on mustard, halftone grain -- sacrament anchor"),
    ("REF-17", "Classical bust on pedestal with yellow halo -- classical-statue anchor"),
    ("GEN-A", "Internal: v4-01 burning bush at twilight (midnight + orange + white-hot core)"),
    ("GEN-B", "Internal: v4-03 communion still life (mustard + black silhouette + gold sun)"),
    ("GEN-C", "Internal: v5-02 Pieta-style classical bust with crown of thorns (terracotta + marble + cream halo)"),
    ("GEN-D", "Internal: v5-04 empty tomb at dawn (charcoal + golden amber + white-hot core)"),
]

STYLE_MODES = [
    (
        "Photographic Realism + Halftone",
        "Real photographic source (landscape, scene, atmosphere) processed with heavy 1970s silkscreen halftone, dense film grain, high contrast. Best for atmospheric scenes, stories with figures (silhouetted/anonymous), landscape moments.",
    ),
    (
        "Hybrid (Photo + Flat)",
        "Photo-real subject (e.g., bread, wheat, hand) combined with flat silhouette support objects (bottle, goblet, sun disk). Halftone overlay throughout. Best for still life, sacrament, symbolic compositions.",
    ),
    (
        "Classical Statue Collage",
        "Photographed marble or stone sculpture (Pieta, classical bust, allegorical figure) with flat color halo + 70-20-10 ground + halftone. Use whenever HUMAN PRESENCE is needed -- never illustrate flat human figures.",
    ),
    (
        "Object + Halo",
        "Single symbolic object (skull, cup, bread, lamp, hand, scroll) photographed against flat saturated ground with circular halo or sun-disk behind. Heavy halftone. Best for devotional symbols and meditation moments.",
    ),
]

# --------------------------------------------------------------------------- #
# ASSET CATALOG (57 prompts)
# --------------------------------------------------------------------------- #

# Universal MJ flag tail. User attaches REF as Midjourney style reference image
# in the prompt UI (drag-and-drop) before pasting prompt text.
MJ_TAIL = "--style raw --v 7 --s 250"


def prompt_text(scene: str, palette_pct: str, mode: str) -> str:
    """Construct a Midjourney prompt with consistent style boilerplate."""
    return (
        f"{scene} "
        f"Cinematic devotional photograph, vintage 1970s religious silkscreen poster aesthetic, "
        f"heavy halftone grain, dense film grain, paper-print texture, HIGH CONTRAST, "
        f"no muddy mid-tones. {palette_pct} {mode} "
        f"Reverent, surreal, symbolic, atmospheric, provocative. "
        f"NO text, NO captions, NO logos, NO recognizable real-person faces."
    )


SCENE_LIB = "/Users/meltmac/Documents/app-projects/external/euangelion/docs/brand/scene-library-starters"
INSPO = "/Users/meltmac/Documents/app-projects/external/euangelion/docs/brand/Imageinspo"

# Specific code overrides — pin these prompts to a known-matching anchor
INLINE_OVERRIDES = {
    "OT-01": f"{SCENE_LIB}/story-01-jacob-wrestling-photoreal.png",
    "OT-02": f"{SCENE_LIB}/v4-01-burning-bush-photoreal-halftone.png",
    "OT-03": f"{SCENE_LIB}/story-06-moses-red-sea.png",
    "OT-04": f"{SCENE_LIB}/story-05-daniel-lions-den.png",
    "OT-05": f"{SCENE_LIB}/story-02-esther-classical-statue.png",
    "NT-05": f"{SCENE_LIB}/story-03-jesus-walking-on-water.png",
    "NT-11": f"{SCENE_LIB}/v5-02-crown-of-thorns-classical-statue.png",
    "NT-12": f"{SCENE_LIB}/v5-04-social-empty-tomb-photoreal.png",
    "NT-13": f"{SCENE_LIB}/story-04-paul-damascus-road.png",
    "SYM-01": f"{INSPO}/Screenshot 2026-05-04 at 1.05.40 AM.png",
    "SYM-04": f"{INSPO}/Screenshot 2026-05-04 at 1.05.05 AM.png",
    "SYM-05": f"{INSPO}/Screenshot 2026-05-04 at 1.04.42 AM.png",
    "PAR-05": f"{INSPO}/Screenshot 2026-05-04 at 1.04.23 AM.png",
    "PAR-08": f"{INSPO}/Screenshot 2026-05-04 at 1.04.23 AM.png",
    "ATM-05": f"{INSPO}/Screenshot 2026-05-04 at 1.03.48 AM.png",
    "LAM-01": f"{SCENE_LIB}/lamb-01-pastoral-golden-hour.png",
    "LAM-02": f"{SCENE_LIB}/lamb-02-shepherd-carrying.png",
}


def best_inline_ref(asset):
    """Return file path for the best-matching inline reference image."""
    if asset["code"] in INLINE_OVERRIDES:
        return INLINE_OVERRIDES[asset["code"]]
    p = asset["palette"]
    mode = asset["mode"]
    if p == "PAL-01-THEOPHANY":
        return f"{SCENE_LIB}/v4-01-burning-bush-photoreal-halftone.png"
    if p == "PAL-02-SACRAMENT":
        if "Statue" in mode:
            return f"{INSPO}/Screenshot 2026-05-04 at 1.05.53 AM.png"  # Apollo bust + yellow halo
        return f"{SCENE_LIB}/v4-03-communion-stilllife-mustard.png"
    if p == "PAL-03-PASSION":
        return f"{SCENE_LIB}/v5-02-crown-of-thorns-classical-statue.png"
    if p == "PAL-04-RESURRECTION":
        if "Statue" in mode:
            return f"{SCENE_LIB}/story-07-pieta-marble.png"
        return f"{SCENE_LIB}/v5-04-social-empty-tomb-photoreal.png"
    if p == "PAL-05-LAMENT":
        return f"{SCENE_LIB}/story-07-pieta-marble.png"
    if p == "PAL-06-PILGRIMAGE":
        return f"{SCENE_LIB}/lamb-02-shepherd-carrying.png"
    if p == "PAL-07-STORM":
        return f"{SCENE_LIB}/story-03-jesus-walking-on-water.png"
    if p == "PAL-08-MEMENTO":
        return f"{INSPO}/Screenshot 2026-05-04 at 1.04.23 AM.png"  # gold skull
    return f"{SCENE_LIB}/v4-01-burning-bush-photoreal-halftone.png"


ASSETS = []


def add(code, title, mode_short, palette, refs, aspect, scene, palette_pct, anonymity_note=""):
    ASSETS.append(
        {
            "code": code,
            "title": title,
            "mode": mode_short,
            "palette": palette,
            "refs": refs,
            "aspect": aspect,
            "scene": scene,
            "palette_pct": palette_pct,
            "anonymity_note": anonymity_note,
        }
    )


# A. OLD TESTAMENT STORIES (12)
add("OT-01", "Jacob Wrestling at Peniel", "Photographic Realism", "PAL-01-THEOPHANY",
    "REF-07 + GEN-A", "1:1",
    "Two anonymous robed figures locked in close wrestling embrace at the edge of a river at dawn. "
    "One bearded human (Jacob), the other taller and luminous (the divine wrestler). "
    "Profile silhouettes against dawn light; rocky riverbank, water at feet.",
    "70% deep midnight blue/near-black sky and rocks; 20% warm golden dawn light raking the figures; "
    "10% bright white-hot solar core in upper corner.",
    "Both faces hidden in atmospheric silhouette -- anonymous so the viewer can read themselves into either.")

add("OT-02", "Burning Bush at Horeb", "Photographic Realism", "PAL-01-THEOPHANY",
    "REF-07 + GEN-A", "1:1",
    "A single burning bush in a wide rocky desert at twilight. The bush is intact, NOT consumed. "
    "Distant mountain silhouette on horizon. NO human figures.",
    "70% deep midnight blue/near-black sky and terrain; 20% burning orange flames consuming the bush; "
    "10% bright white-hot yellow core at heart of fire.",
    "")

add("OT-03", "Moses Parting the Red Sea", "Photographic Realism", "PAL-07-STORM",
    "REF-09 + REF-11", "3:2",
    "Two towering walls of seawater rising on either side of a dry seabed path. Storm clouds above; "
    "distant lightning on horizon; kelp and sea life suspended in the water walls. NO human figures.",
    "70% deep teal/midnight ocean walls and stormy sky; 20% bright cream-white foam at wave-wall edges + "
    "pale dry seabed; 10% silver-electric lightning + pillar of cloud.",
    "")

add("OT-04", "Daniel in the Lions' Den", "Photographic Realism", "PAL-04-RESURRECTION",
    "REF-12 + GEN-D", "1:1",
    "Stone den interior at night. Three or four real lions resting peacefully around a kneeling robed figure "
    "bowed in prayer. A single shaft of moonlight pools in the center.",
    "70% deep cave-dark charcoal stone walls + lions in shadow; 20% warm amber pool of light on figure; "
    "10% bright cream highlights on praying hands + lions' eye-glints.",
    "Figure's face hidden behind hands -- anonymous.")

add("OT-05", "Esther Approaching the Throne", "Classical Statue Collage", "PAL-05-LAMENT",
    "REF-17 + GEN-C", "1:1",
    "Classical marble statue of Queen Esther in flowing robe, raised hand in petition, eyes lifted. "
    "Carved drapery folds, low pedestal. Heavy halftone overlay.",
    "70% deep burgundy/wine ground; 20% pale carved cool ivory marble; "
    "10% gold accent -- small crown + faint gold halo behind head.",
    "Statue (not real person) -- viewer projects onto symbol.")

add("OT-06", "David Slaying Goliath", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "1:1",
    "A small anonymous figure (David) standing on a sunlit hillside with sling raised, facing a massive shadowed "
    "silhouette of the giant Goliath crashing down. Distant army silhouettes line the horizon.",
    "70% burning sunset red-orange sky and dust; 20% deep charcoal silhouettes of both figures and army; "
    "10% white-hot solar core behind David's raised arm.",
    "Both figures are silhouettes -- no faces -- emphasis on scale and posture.")

add("OT-07", "Noah's Ark in the Storm", "Photographic Realism", "PAL-07-STORM",
    "REF-11 + REF-09", "3:2",
    "A massive wooden ark riding atop towering stormy waves under a darkening sky. A single dove flying "
    "overhead with a small olive branch. Dramatic atmospheric perspective.",
    "70% deep teal / midnight ocean and stormy sky; 20% sepia/charcoal silhouette of the ark and waves; "
    "10% pale cream-white foam crests + bright white dove highlight.",
    "")

add("OT-08", "Abraham + Isaac on Moriah", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "1:1",
    "Two anonymous robed figures climbing a rocky mountain path at dawn -- one large, one small carrying wood. "
    "A ram's silhouette caught in distant thicket. Cinematic profile silhouette.",
    "70% scorched terracotta dawn sky; 20% deep charcoal silhouettes of figures, mountain, and ram; "
    "10% white-hot solar core at horizon.",
    "Both figures silhouetted -- no faces. Anonymous; viewer can be either.")

add("OT-09", "Joseph in the Pit", "Photographic Realism", "PAL-08-MEMENTO",
    "REF-12", "1:1",
    "Looking down into a deep stone pit at night. A single figure huddled at the bottom, lit by a small "
    "shaft of starlight from above. Rough-hewn pit walls.",
    "70% near-black pit walls in deep shadow; 20% warm gold catch-lights on the figure's robe and pit-edge stones; "
    "10% bright cream-white star above.",
    "Figure huddled, face hidden against knees -- anonymous.")

add("OT-10", "Elijah Under the Juniper", "Photographic Realism", "PAL-04-RESURRECTION",
    "GEN-D", "3:2",
    "An anonymous robed figure collapsed asleep beneath a single juniper tree in a vast desert at dawn. "
    "An angel's silhouette barely visible bringing bread and water nearby.",
    "70% deep charcoal pre-dawn desert ground and tree silhouette; 20% golden amber sunrise on the horizon; "
    "10% bright white-hot solar core breaking over the dunes.",
    "Both figures silhouetted, anonymous.")

add("OT-11", "Jonah in the Belly", "Photographic Realism", "PAL-07-STORM",
    "REF-09", "1:1",
    "Inside the dark cavernous belly of a great fish, looking out toward a dim-lit cathedral-like ribbed interior. "
    "A small figure huddled in prayer at the center. Bones and seaweed visible.",
    "70% deep teal/black cavernous interior; 20% pale ghost-cream sea-light filtering through gills; "
    "10% silver-white catch-lights on bones and the figure's praying hands.",
    "Figure silhouetted -- no face -- anonymous.")

add("OT-12", "Ark of the Covenant in Glory", "Hybrid", "PAL-04-RESURRECTION",
    "REF-10 + REF-13", "1:1",
    "The Ark of the Covenant in profile silhouette atop an elevated stone platform, with a brilliant pillar of "
    "light/cloud descending from above onto the mercy seat. Two cherubim wing silhouettes touching.",
    "70% deep charcoal sanctuary ground; 20% golden amber pillar of light; "
    "10% white-hot core at mercy seat + faint cream halo behind.",
    "")

# B. NEW TESTAMENT STORIES (13)
add("NT-01", "Annunciation", "Classical Statue Collage", "PAL-05-LAMENT",
    "REF-17", "1:1",
    "Classical marble statue of Mary kneeling with head bowed, an angelic figure (also marble) standing with "
    "wings spread behind her. Halftone overlay.",
    "70% midnight indigo background; 20% pale ivory marble of both statues; "
    "10% gold halo disk behind Mary's head + faint gold catch-light on the angel's wing tips.",
    "Both are sculpture -- viewer projects onto symbol.")

add("NT-02", "Star Over Bethlehem", "Photographic Realism", "PAL-08-MEMENTO",
    "GEN-D + REF-13", "3:2",
    "A small distant village silhouette under a vast night sky with one massive radiant star directly above, "
    "rays cascading down onto the rooftops. Wisemen silhouettes barely visible on a far ridge.",
    "70% deep night-black sky and shadowed valley; 20% gold radiating star-light cascading down; "
    "10% bright white-hot star core + tiny cream village windows.",
    "Wisemen silhouetted distant -- no faces.")

add("NT-03", "Baptism in the Jordan", "Photographic Realism", "PAL-04-RESURRECTION",
    "REF-09 + GEN-D", "1:1",
    "Two anonymous robed figures standing waist-deep in a wide river at dawn. One pouring water over the other's "
    "head. A dove silhouette descending from a brilliant break in the sky above.",
    "70% deep teal river and dim sky; 20% golden amber dawn light breaking from above onto the figures; "
    "10% bright white-hot dove silhouette + light core in the sky-break.",
    "Both figures silhouetted -- anonymous.")

add("NT-04", "Wilderness Temptation", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "1:1",
    "A single anonymous robed figure seated alone on a high rocky outcrop overlooking a vast desert at sunset. "
    "A second darker silhouette suggested in shadow nearby.",
    "70% burning terracotta desert and sky; 20% deep charcoal silhouettes of figure, rocks, and shadow-figure; "
    "10% white-hot solar core sinking on horizon.",
    "Both silhouetted -- anonymous.")

add("NT-05", "Jesus Walking on Water", "Photographic Realism", "PAL-07-STORM",
    "REF-09", "1:1",
    "A single anonymous robed figure walking across stormy ocean waves at twilight, water churning around the feet. "
    "A small distant boat with tiny figures barely visible in the background.",
    "70% deep teal/midnight ocean and dark stormy sky; 20% pale ghost-cream figure with edge-light glow; "
    "10% silver-white moonlight on cresting waves and a small bright moon.",
    "Figure faceless and atmospheric -- viewer projects.")

add("NT-06", "Loaves and Fishes", "Hybrid", "PAL-02-SACRAMENT",
    "REF-16 + GEN-B", "1:1",
    "Photo-real halftone-textured detail of bread loaves and silver-cured fish piled abundantly in a woven basket "
    "on a worn tabletop. A bright sun disk rising directly behind. Anonymous hands faintly visible at the edges.",
    "70% saturated mustard yellow ground and table-edge light; 20% deep charcoal/sepia silhouettes of basket and "
    "anonymous hands; 10% white-hot sun disk core + cream highlights on bread crusts.",
    "Hands at edges -- no faces, no identifiable people.")

add("NT-07", "Lazarus Raised", "Classical Statue Collage", "PAL-05-LAMENT",
    "REF-17", "1:1",
    "Classical marble statue detail of an emerging figure wrapped in burial cloth standing in a tomb opening, "
    "stone rolled aside. Halftone overlay.",
    "70% midnight indigo tomb shadow; 20% pale ivory marble figure half-emerged; "
    "10% gold halo light behind the figure + faint gold catch-lights on the burial wrappings.",
    "Sculpture -- face wrapped in burial cloth -- anonymous.")

add("NT-08", "Triumphal Entry", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "3:2",
    "Anonymous robed figure on a small donkey, viewed from behind walking down a dusty palm-lined road toward a "
    "city silhouette at sunset. Palm fronds suggested at edges.",
    "70% burning red-orange sunset sky; 20% deep charcoal silhouettes of figure, donkey, palms, road, city; "
    "10% white-hot solar core on horizon directly ahead.",
    "Figure from behind -- silhouetted, anonymous.")

add("NT-09", "Last Supper / Communion", "Hybrid", "PAL-02-SACRAMENT",
    "REF-16 + GEN-B", "16:9",
    "A long wooden table viewed at table-level, with a torn loaf of bread and a wine goblet at its center, twelve "
    "small flat silhouette cup-shapes flanking, a brilliant sun disk rising directly behind the bread. NO human figures.",
    "70% saturated mustard yellow ground; 20% deep charcoal silhouettes of tabletop, cups, and bottle; "
    "10% white-hot sun core + cream halftone-stippled bread texture.",
    "")

add("NT-10", "Garden of Gethsemane", "Photographic Realism", "PAL-04-RESURRECTION",
    "GEN-D", "1:1",
    "An olive grove at night with twisted trees casting deep shadows. A single anonymous robed figure "
    "kneeling alone at the base of one tree, head bowed in prayer. A faint shaft of moonlight on him.",
    "70% deep charcoal night-grove and tree silhouettes; 20% warm amber moonlight on the kneeling figure; "
    "10% bright cream-white catch-lights on praying hands and a single bright moon.",
    "Figure faceless, head bowed -- anonymous.")

add("NT-11", "Crucifixion", "Classical Statue Collage", "PAL-03-PASSION",
    "REF-15 + GEN-C", "3:4",
    "A classical stone-carved cross silhouette on a hillside at the moment of darkness. A real crown of thorns "
    "lying at its base. Stormy sky cracking open with a thin shaft of light. NO human body shown -- only cross + thorns.",
    "70% saturated terracotta/burnt orange sky; 20% deep charcoal cross silhouette and shadowed hill; "
    "10% cream-white shaft of breaking light + cream highlights on the thorn-crown.",
    "")

add("NT-12", "Empty Tomb at Dawn", "Photographic Realism", "PAL-04-RESURRECTION",
    "GEN-D", "1:1",
    "Ancient rock-hewn tomb with massive disc stone rolled aside, brilliant golden sunrise streaming OUT of the "
    "opening. Folded burial linens visible inside. NO human figure, NO angel.",
    "70% deep charcoal hillside, surrounding stone, dark pre-dawn sky; 20% warm golden amber sunrise spilling out "
    "of the tomb; 10% white-hot core inside the opening.",
    "")

add("NT-13", "Road to Damascus / Paul", "Photographic Realism", "PAL-03-PASSION",
    "REF-06 + REF-15", "1:1",
    "An anonymous figure mid-fall in the dust of a desert road, knocked backward by a brilliant flash of light "
    "from above, shielding face with raised forearm. Fallen staff visible. Low ground angle.",
    "70% scorched terracotta sandy road and rocks; 20% deep charcoal silhouette of falling figure and shadow; "
    "10% white-hot blinding light from above with radiating rays + dust particles.",
    "Face shielded by arm -- anonymous.")

add("NT-14", "Pentecost (Tongues of Fire)", "Photographic Realism", "PAL-01-THEOPHANY",
    "REF-07", "1:1",
    "A circle of anonymous bowed-headed silhouettes in a dim upper room, with small individual flame-tongues "
    "hovering above each head. Dust and grain throughout.",
    "70% deep midnight blue/near-black room interior; 20% burning orange tongues of flame above each head; "
    "10% white-hot yellow flame cores.",
    "All figures silhouetted with bowed heads -- no faces.")

# C. PARABLES (8)
add("PAR-01", "The Sower", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "3:2",
    "An anonymous robed figure striding forward across a furrowed field, arm outstretched broadcasting seeds in a "
    "fan-shaped arc. Distant trees on horizon. Field birds visible.",
    "70% saturated mustard golden field and sky; 20% deep charcoal silhouette of sower, furrows, distant trees, "
    "and seed-arc; 10% bright cream highlights on flying seeds and birds.",
    "Sower silhouetted -- anonymous.")

add("PAR-02", "The Lost Sheep", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "1:1",
    "A small lamb on a narrow rocky cliff-edge at sunset, calling out -- distant flock visible far below in a valley.",
    "70% burning red-orange sunset sky; 20% deep charcoal silhouettes of lamb, cliff edge, and distant flock; "
    "10% white-hot solar core sinking behind a far ridge.",
    "")

add("PAR-03", "The Prodigal Son", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "16:9",
    "Two anonymous figures in profile silhouette running toward each other across a wide field at sunset -- a young "
    "ragged figure and an older robed figure with arms open. A distant homestead silhouette.",
    "70% burning red-orange sunset sky; 20% deep charcoal silhouettes of both figures, field, and homestead; "
    "10% white-hot solar core between them on horizon.",
    "Both silhouetted -- anonymous.")

add("PAR-04", "The Mustard Seed", "Object + Halo", "PAL-02-SACRAMENT",
    "REF-08", "1:1",
    "Photo-real halftone-textured detail of a single tiny seed in a dark anonymous palm, with a brilliant sun-disk "
    "halo behind. The seed is dwarfed by the surrounding hand and halo.",
    "70% saturated mustard yellow ground / halo disk; 20% deep charcoal anonymous hand silhouette; "
    "10% bright white-hot core at center of halo + cream catch-light on the single seed.",
    "Hand only -- no face -- anonymous.")

add("PAR-05", "The Pearl of Great Price", "Object + Halo", "PAL-08-MEMENTO",
    "REF-12 + REF-14", "1:1",
    "Photo-real glowing pearl resting in the center of an anonymous open palm against a black ground, with thin "
    "gold halo rays radiating outward.",
    "70% deep black ground; 20% gold radiating halo rays from the pearl; "
    "10% white-hot pearl core + cream catch-lights on the palm's highlights.",
    "Hand only -- no face -- anonymous.")

add("PAR-06", "The Lamp on a Stand", "Object + Halo", "PAL-04-RESURRECTION",
    "REF-14", "1:1",
    "Photo-real ancient terracotta oil lamp burning on a tall stone stand, casting concentric rings of golden "
    "halftone light. A dark room behind.",
    "70% deep charcoal room interior; 20% golden amber concentric light rings spreading from the lamp; "
    "10% bright white-hot wick flame + cream catch-lights on the lamp's clay surface.",
    "")

add("PAR-07", "The Wineskins", "Hybrid", "PAL-02-SACRAMENT",
    "REF-16", "1:1",
    "Photo-real halftone-textured detail of two leather wineskins on a tabletop -- one new and full, one old and "
    "burst. A sun disk behind.",
    "70% saturated mustard yellow ground; 20% deep charcoal silhouettes of the wineskins and table; "
    "10% white-hot sun core + cream highlights on the leather grain.",
    "")

add("PAR-08", "The Talents", "Object + Halo", "PAL-08-MEMENTO",
    "REF-12", "1:1",
    "Photo-real detail of three small bags of gold coins resting on a dark surface -- one open and overflowing, "
    "one half-buried in earth, one closed tight. Thin gold halo behind.",
    "70% deep black/charcoal ground; 20% gold tones of the coin bags and earth; "
    "10% bright white-hot core in halo + cream highlights on individual coins.",
    "")

# D. SYMBOLIC OBJECTS + DEVOTIONAL (10)
add("SYM-01", "Bread + Wine (Communion)", "Hybrid", "PAL-02-SACRAMENT",
    "REF-16 + GEN-B", "1:1",
    "A flat silhouette wine bottle and goblet next to a photo-real broken loaf of bread on a wooden tabletop. "
    "Brilliant sun disk rising directly behind.",
    "70% saturated mustard yellow ground; 20% deep charcoal bottle, goblet, and tabletop silhouettes + halftone-"
    "textured bread; 10% white-hot sun-disk core + thin warm sun-glow rim.",
    "")

add("SYM-02", "Open Bible / Scroll", "Object + Halo", "PAL-04-RESURRECTION",
    "REF-10", "1:1",
    "Photo-real detail of an open ancient leather-bound book or unrolled scroll on a dark surface, golden light "
    "emanating from between the pages, with a halo disk behind.",
    "70% deep charcoal ground; 20% golden amber light spreading from the book; "
    "10% white-hot core inside the book + cream catch-lights on page edges.",
    "")

add("SYM-03", "Oil Lamp Burning", "Object + Halo", "PAL-04-RESURRECTION",
    "REF-14", "1:1",
    "Photo-real terracotta clay oil lamp with a single small flame burning brightly. Dark surrounding ground. "
    "Faint halo around the flame.",
    "70% deep charcoal ground; 20% golden amber light pool around the lamp; "
    "10% bright white-hot wick flame core.",
    "")

add("SYM-04", "Crown of Thorns", "Object + Halo", "PAL-03-PASSION",
    "REF-15", "1:1",
    "Photo-real real branch crown of thorns resting on a stone ground, lit dramatically from one side. Pale halo "
    "disk behind.",
    "70% saturated terracotta/burnt orange ground; 20% deep charcoal crown silhouette and stone shadow; "
    "10% pale cream halo disk + cream catch-lights on the thorn tips.",
    "")

add("SYM-05", "Hand Cradling Light", "Object + Halo", "PAL-08-MEMENTO",
    "REF-14", "1:1",
    "Photo-real anonymous open palm with a small glowing orb floating just above its surface, against a saturated "
    "color ground.",
    "70% saturated mustard yellow ground; 20% deep charcoal hand silhouette; "
    "10% bright white-hot orb core with thin warm glow + cream catch-light on the palm edges.",
    "Hand only -- no face -- anonymous.")

add("SYM-06", "Cross on a Hill", "Photographic Realism", "PAL-04-RESURRECTION",
    "GEN-D", "3:2",
    "A single bare wooden cross silhouette on a windswept hilltop at golden hour, distant village barely visible "
    "below. Atmospheric haze.",
    "70% deep charcoal hillside and dim sky; 20% golden amber sunset breaking around the cross; "
    "10% white-hot solar core directly behind the cross.",
    "")

add("SYM-07", "Wheat Sheaf", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "1:1",
    "Photo-real halftone-textured close-up of a tied bundle of wheat stalks against a saturated color sky, low sun "
    "raking across the grain heads.",
    "70% saturated mustard yellow sky and ground; 20% deep sepia/charcoal wheat-stalk silhouettes; "
    "10% bright white-hot solar core + cream highlights on individual grains.",
    "")

add("SYM-08", "Olive Branch", "Hybrid", "PAL-02-SACRAMENT",
    "REF-08", "1:1",
    "Photo-real halftone close-up of a single olive branch with leaves and small fruits, held in an anonymous hand "
    "against a saturated color ground.",
    "70% saturated mustard yellow ground; 20% deep charcoal branch and hand silhouettes; "
    "10% cream catch-lights on the leaf tips and olive surfaces.",
    "Hand only -- no face -- anonymous.")

add("SYM-09", "Empty Cup / Chalice", "Object + Halo", "PAL-08-MEMENTO",
    "REF-12", "1:1",
    "Photo-real ornate metal chalice on a dark altar surface, slight gold halo behind, the cup tilted and empty.",
    "70% deep black ground; 20% gold tones of the chalice and faint halo; "
    "10% bright white-hot catch-lights on the cup rim and base.",
    "")

add("SYM-10", "Open Hands Receiving", "Object + Halo", "PAL-04-RESURRECTION",
    "REF-14", "1:1",
    "Photo-real two anonymous open hands cupped together, slightly raised, with a brilliant halo disk behind and "
    "a soft golden light spilling into the cupped palms.",
    "70% deep charcoal ground; 20% golden amber halo disk and light spill; "
    "10% bright white-hot core at hands' center + cream catch-lights on knuckles.",
    "Hands only -- no face -- anonymous.")

# E. ATMOSPHERIC / LIGHT MOMENTS (8)
add("ATM-01", "Mountain at Sunrise", "Photographic Realism", "PAL-04-RESURRECTION",
    "REF-10", "3:2",
    "A vast mountain range with one peak catching the first light of dawn, the rest still in deep shadow. Dramatic "
    "atmospheric perspective.",
    "70% deep charcoal pre-dawn mountain shadow and dim sky; 20% golden amber dawn-light catching the peak; "
    "10% bright white-hot solar core just rising on horizon.",
    "")

add("ATM-02", "Sea at Twilight", "Photographic Realism", "PAL-07-STORM",
    "REF-09", "16:9",
    "A vast calm-stormy ocean at twilight with low waves rolling in, a small distant boat silhouette far on the "
    "horizon, a dim moon above.",
    "70% deep teal/midnight ocean and sky; 20% pale ghost-cream wave foam; "
    "10% silver-white moon and reflection on water.",
    "")

add("ATM-03", "Desert at Noon", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "3:2",
    "A vast empty desert stretching to a heat-shimmer horizon, a single faint footpath wandering through it. "
    "Dust haze and sun-bleached air.",
    "70% scorched terracotta-cream desert ground and pale sky; 20% deep charcoal shadows of distant rocks and "
    "footpath details; 10% white-hot solar disk overhead.",
    "")

add("ATM-04", "Olive Grove at Sunset", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "3:2",
    "A grove of twisted ancient olive trees on a hillside at sunset, the low sun raking through their gnarled trunks, "
    "long shadows striping the ground.",
    "70% saturated mustard golden sky and ground light; 20% deep charcoal olive-tree silhouettes and shadows; "
    "10% bright white-hot solar core between the trees.",
    "")

add("ATM-05", "Stormy Sky with Lightning", "Photographic Realism", "PAL-07-STORM",
    "REF-09", "3:2",
    "A vast turbulent stormy sky with a single dramatic white lightning bolt striking down toward the horizon. "
    "Distant darkened plains below.",
    "70% deep teal/charcoal storm clouds and dim plains; 20% pale ghost-cream cloud highlights; "
    "10% bright silver-white lightning bolt + crackling thin secondary forks.",
    "")

add("ATM-06", "Field of Wheat at Golden Hour", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "16:9",
    "A wide rolling wheat field at golden hour with a low sun raking across the grain heads, a single distant tree "
    "silhouette on the far horizon.",
    "70% saturated mustard golden field and sky; 20% deep sepia/charcoal shadows in the grain rows + tree silhouette; "
    "10% bright white-hot solar core + cream highlights on individual grain heads.",
    "")

add("ATM-07", "Star-filled Night Sky", "Photographic Realism", "PAL-08-MEMENTO",
    "REF-13", "16:9",
    "A vast night sky thick with stars, a single bright moon, distant dim mountain silhouette below.",
    "70% deep black night sky; 20% scattered gold/cream pinpoint stars; "
    "10% bright white-hot moon disk + soft cream halo around it.",
    "")

add("ATM-08", "Dust on a Road / Pilgrim Path", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "16:9",
    "A long dusty road winding into a distant horizon at sunset, a single anonymous robed figure silhouetted "
    "walking away from the viewer with a staff and small bundle.",
    "70% burning red-orange sunset sky and dust haze; 20% deep charcoal road, figure, and surrounding silhouettes; "
    "10% white-hot solar core dead-ahead on the horizon.",
    "Figure walking away -- back to viewer -- anonymous.")

# F. LAMB IMAGERY (6) -- general site / pastoral, NOT the seven-eyed Christ-Lamb mark
add("LAM-01", "Single Lamb in Pastoral Field", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "3:2",
    "A single small lamb standing alone in a wide field of dry grass at golden hour, long lamb-shadow cast across "
    "the grain, a distant olive tree silhouette on the horizon.",
    "70% saturated mustard golden field and sky; 20% deep charcoal lamb silhouette + shadow + distant tree; "
    "10% pale cream-white highlight on the lamb's wool curve where the sun catches.",
    "Flock-lamb (2 normal eyes) -- audience-identity, not the seven-eyed Christ mark.")

add("LAM-02", "Shepherd Carrying Lamb", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "3:2",
    "An anonymous shepherd silhouette walking across a hillside at sunset carrying a single lamb across his shoulders, "
    "staff in one hand, distant tree silhouettes.",
    "70% burning red-orange sunset sky; 20% deep charcoal silhouette of shepherd, lamb, hill, and trees; "
    "10% white-hot solar core at horizon with thin radiating rays.",
    "Shepherd silhouetted -- no face -- anonymous.")

add("LAM-03", "Flock of Lambs at Twilight", "Photographic Realism", "PAL-07-STORM",
    "REF-09", "16:9",
    "A small flock of lambs grazing on a hillside at twilight, distant storm clouds gathering on the horizon, "
    "anonymous shepherd silhouette in the background watching.",
    "70% deep teal/midnight sky and ground; 20% pale ghost-cream lamb forms scattered across the hillside; "
    "10% silver-white catch-lights on lamb wool edges + distant lightning glow.",
    "Shepherd silhouetted -- no face -- anonymous.")

add("LAM-04", "Lost Lamb on a Cliff Edge", "Photographic Realism", "PAL-06-PILGRIMAGE",
    "REF-06", "1:1",
    "A small lamb on a precarious rocky cliff-edge at sunset, calling toward the sky. Distant valley and flock far "
    "below.",
    "70% burning red-orange sunset sky and rocks; 20% deep charcoal silhouette of lamb, cliff edge, and distant valley; "
    "10% white-hot solar core sinking on horizon.",
    "Lamb is in clear distress -- vulnerable, visible silhouette.")

add("LAM-05", "Lamb Sleeping Under Oak", "Photographic Realism", "PAL-02-SACRAMENT",
    "REF-08", "1:1",
    "A small lamb curled asleep at the base of a single ancient oak tree, soft afternoon light through the leaves "
    "dappling the ground.",
    "70% saturated mustard yellow sun-dappled ground and sky; 20% deep charcoal oak-trunk silhouette and lamb form; "
    "10% bright cream-white highlights on the lamb's wool and dappled light spots.",
    "Pastoral / peace.")

add("LAM-06", "Lamb Drinking from a Stream", "Photographic Realism", "PAL-04-RESURRECTION",
    "GEN-D", "1:1",
    "A small lamb bowing to drink from a clear quiet stream at dawn, surrounding stones and grass, distant misty "
    "hills.",
    "70% deep charcoal pre-dawn ground, stones, and dim hills; 20% golden amber dawn light on the lamb's back and "
    "the stream surface; 10% bright white-hot solar core just breaking on horizon + cream sparkles on water.",
    "Pastoral / Psalm 23 'beside still waters' energy.")


# --------------------------------------------------------------------------- #
# PDF GENERATION
# --------------------------------------------------------------------------- #

# Color palette for PDF design
INK_DARK = (10, 19, 32)         # near-black navy
INK_BODY = (44, 44, 52)         # dark grey for body
INK_LIGHT = (110, 110, 118)     # light grey for meta
INK_ACCENT = (31, 42, 141)      # cobalt
PAPER = (240, 236, 230)         # cream
RULE = (180, 175, 165)          # subtle rule


class CatalogPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="Letter")
        self.set_auto_page_break(auto=True, margin=18)
        self.set_left_margin(18)
        self.set_right_margin(18)
        self.set_top_margin(18)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*INK_LIGHT)
        self.set_y(8)
        self.cell(0, 5, "EUANGELION  *  VISUAL ASSET CATALOG  *  v1.0", align="L")
        self.cell(0, 5, f"page {self.page_no()}", align="R")
        self.set_y(14)
        self.set_draw_color(*RULE)
        self.line(18, 14, self.w - 18, 14)
        self.ln(6)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*INK_LIGHT)
        self.cell(0, 5, "Generated 2026-05-04  *  euangelion.app  *  not for redistribution", align="C")

    # ---- Section helpers
    def title_h1(self, text):
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(*INK_DARK)
        self.cell(0, 12, text, ln=1)
        self.ln(2)

    def title_h2(self, text):
        if self.get_y() > self.h - 50:
            self.add_page()
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*INK_DARK)
        self.cell(0, 10, text, ln=1)
        self.set_draw_color(*INK_DARK)
        self.line(18, self.get_y(), self.w - 18, self.get_y())
        self.ln(4)

    def title_h3(self, text):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*INK_DARK)
        self.cell(0, 6, text, ln=1)
        self.ln(1)

    def body(self, text, size=10, leading=5):
        self.set_font("Helvetica", "", size)
        self.set_text_color(*INK_BODY)
        self.multi_cell(0, leading, text)
        self.ln(1)

    def meta(self, label, value):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*INK_LIGHT)
        label_w = 28
        self.cell(label_w, 5, label.upper())
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*INK_BODY)
        self.multi_cell(0, 5, str(value))

    def palette_swatch(self, hexes, x, y, w_total=60, h=8):
        self.set_draw_color(*INK_LIGHT)
        n = len(hexes)
        # 70/20/10 widths
        if n == 3:
            widths = [w_total * 0.70, w_total * 0.20, w_total * 0.10]
        else:
            widths = [w_total / n] * n
        cur_x = x
        for hex_color, w in zip(hexes, widths):
            r, g, b = (int(hex_color[i : i + 2], 16) for i in (1, 3, 5))
            self.set_fill_color(r, g, b)
            self.rect(cur_x, y, w, h, "DF")
            cur_x += w


def build_pdf():
    pdf = CatalogPDF()

    # ===== COVER =====
    pdf.add_page()
    pdf.set_y(60)
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(*INK_DARK)
    pdf.cell(0, 16, "EUANGELION", ln=1, align="L")
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(*INK_BODY)
    pdf.cell(0, 8, "Visual Asset Catalog  *  Midjourney Prompt Library", ln=1)
    pdf.ln(8)
    pdf.set_draw_color(*INK_DARK)
    pdf.line(18, pdf.get_y(), pdf.w - 18, pdf.get_y())
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK_BODY)
    pdf.multi_cell(0, 5,
        "57 prompts for general site imagery in the locked photographic + halftone direction. "
        "Each prompt specifies a 70-20-10 color palette, a style mode, and one or more reference images "
        "for use as Midjourney style anchors via --sref. Run prompts manually in Midjourney v7+. "
        "The seven-eyed Lamb of Revelation 5:6 (brand mark) is OUTSIDE this catalog and handled separately."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, "Locked Style Rules", ln=1)
    pdf.set_font("Helvetica", "", 10)
    rules = [
        "1.  Photographic realism + heavy halftone screen-print + dense film grain -- vintage 1970s religious silkscreen meets indie zine devotional poster.",
        "2.  HIGH CONTRAST always -- deep blacks, brilliant highlights, no muddy mid-tones.",
        "3.  70-20-10 color discipline -- 70% dominant ground, 20% subject/secondary, 10% accent (typically a bright light-source).",
        "4.  No illustrated flat human figures. Where human presence is needed, use classical statuary, partial photographic detail (hands, feet), or anonymous silhouettes.",
        "5.  Anonymous figures only -- no recognizable real-person faces. Silhouettes, hooded figures, or sculpture so any viewer can read themselves into the symbol.",
        "6.  Reverent + surreal + symbolic + provocative -- devotional record-cover energy, not cute or saccharine.",
        "7.  No text, no captions, no logos in the image itself -- typography is layered separately by the brand system.",
    ]
    for r in rules:
        pdf.multi_cell(0, 4.5, r)
        pdf.ln(0.5)

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*INK_LIGHT)
    pdf.multi_cell(0, 4.5,
        "Generated 2026-05-04. Companion: docs/brand/scene-library-starters/ -- internal mockup outputs (v4-01, v4-03, v5-02, v5-04, story-01..07, lamb-01..02). "
        "Reference catalog REF-06..REF-17 = uploaded reference images; GEN-A..GEN-D = locked internal mockups."
    )

    # ===== SECTION 1: STYLE MODES =====
    pdf.add_page()
    pdf.title_h2("1.  Style Modes")
    pdf.body(
        "Each prompt specifies one of four style modes. The mode determines source-material treatment "
        "and where photographic realism vs flat graphic shape carries the composition.",
        leading=5,
    )
    pdf.ln(2)
    for name, desc in STYLE_MODES:
        pdf.title_h3(name)
        pdf.body(desc, size=9, leading=4.5)
        pdf.ln(1)

    # ===== SECTION 2: PALETTE SYSTEM =====
    pdf.add_page()
    pdf.title_h2("2.  Palette System (70-20-10)")
    pdf.body(
        "Eight palettes keyed to thematic registers. Each palette is rendered in the proportions "
        "70% dominant / 20% secondary / 10% accent. Use the palette code in the asset entry to look up the breakdown.",
        leading=5,
    )
    pdf.ln(2)
    for pal in PALETTES:
        if pdf.get_y() > pdf.h - 50:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*INK_DARK)
        pdf.cell(0, 6, f"{pal['code']}  *  {pal['name']}", ln=1)
        # swatch
        sw_y = pdf.get_y()
        pdf.palette_swatch(pal["hex"], 18, sw_y, w_total=80, h=8)
        pdf.set_xy(102, sw_y + 1)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK_BODY)
        pdf.cell(0, 6, f"Use case: {pal['use_case']}", ln=1)
        pdf.set_x(102)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*INK_LIGHT)
        pdf.cell(0, 4, "  ".join(pal["hex"]), ln=1)
        pdf.set_y(sw_y + 12)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK_BODY)
        pdf.multi_cell(0, 4.5, pal["breakdown"])
        pdf.ln(3)

    # ===== SECTION 3: REFERENCE IMAGE LIBRARY =====
    pdf.add_page()
    pdf.title_h2("3.  Reference Image Library")
    pdf.body(
        "Reference codes correspond to (a) user-uploaded style anchors that established the visual direction (REF-06..REF-17) and "
        "(b) internal mockups that have been validated as on-brand (GEN-A..GEN-D). When running a prompt in Midjourney, attach the "
        "referenced image as a style reference (--sref) before the prompt text. Multiple references can be combined.",
        leading=5,
    )
    pdf.ln(2)
    for code, desc in REFERENCES:
        if pdf.get_y() > pdf.h - 30:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*INK_ACCENT)
        pdf.cell(22, 6, code)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK_BODY)
        pdf.multi_cell(0, 5, desc)
        pdf.ln(0.5)

    # ===== SECTION 4: HOW TO RUN =====
    pdf.add_page()
    pdf.title_h2("4.  How to Run These Prompts")
    pdf.body(
        "Each asset entry in Section 5 includes a fully-formed Midjourney v7+ prompt. To run:",
        leading=5,
    )
    pdf.ln(1)
    steps = [
        "1.  Open Midjourney (web or Discord).",
        "2.  Drag the listed reference image(s) into the prompt window -- they will be uploaded to your Midjourney library.",
        "3.  In the prompt input, prefix with the uploaded image URL(s) using the --sref flag (or drag-and-drop into the sref slot in web UI). Set --sw 100..400 to control style adherence.",
        "4.  Paste the prompt text from the asset entry, append the listed --ar (aspect ratio) and the universal style flags: --style raw --v 7 --s 250.",
        "5.  Generate. Iterate by re-rolling or adjusting --sw if the style anchor needs more or less weight.",
        "6.  Save accepted outputs to the matching path under public/images/ (paths to be defined in the asset manifest).",
    ]
    for s in steps:
        pdf.multi_cell(0, 4.5, s)
        pdf.ln(0.5)
    pdf.ln(3)
    pdf.title_h3("Universal MJ flag tail")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(*INK_BODY)
    pdf.set_fill_color(245, 240, 230)
    pdf.multi_cell(
        0, 5, f"--ar [aspect from entry]  --sref [REF/GEN url(s)]  --sw 200  {MJ_TAIL}", fill=True
    )
    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*INK_LIGHT)
    pdf.multi_cell(
        0, 4.5,
        "Tip: keep --sw in 150..300 range. Push to 400+ if you want the reference style to dominate; "
        "drop to 100 for looser interpretation. Use --seed N (any integer) to reproduce a result.",
    )

    # ===== SECTION 5: ASSET CATALOG =====
    pdf.add_page()
    pdf.title_h2("5.  Asset Catalog")
    pdf.body(
        f"{len(ASSETS)} prompts grouped by category. Each entry includes title, style mode, palette, "
        "reference images, aspect ratio, the full Midjourney prompt text, and an anonymity / composition note.",
        leading=5,
    )
    pdf.ln(1)

    sections = [
        ("A. Old Testament Stories", "OT-"),
        ("B. New Testament Stories", "NT-"),
        ("C. Parables", "PAR-"),
        ("D. Symbolic Objects + Devotional", "SYM-"),
        ("E. Atmospheric / Light Moments", "ATM-"),
        ("F. Lamb Imagery (general site, NOT the seven-eyed mark)", "LAM-"),
    ]

    # Asset entry layout constants
    text_col_w = 110  # mm  (left column)
    img_col_w = 50    # mm  (right column)
    img_x = pdf.l_margin + text_col_w + 5

    for section_title, prefix in sections:
        pdf.add_page()
        pdf.title_h2(section_title)
        for asset in [a for a in ASSETS if a["code"].startswith(prefix)]:
            # Resolve inline image + compute its display height
            inline_path = best_inline_ref(asset)
            try:
                with PILImage.open(inline_path) as im:
                    aspect = im.height / im.width
                img_h = img_col_w * aspect
            except Exception:
                img_h = img_col_w  # square fallback

            # Estimate vertical space this entry needs
            entry_min_h = max(img_h, 70) + 8
            if pdf.get_y() + entry_min_h > pdf.h - pdf.b_margin:
                pdf.add_page()

            y_start = pdf.get_y()

            # Title row (full width above two-column body)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(*INK_ACCENT)
            pdf.cell(20, 6, asset["code"])
            pdf.set_text_color(*INK_DARK)
            pdf.cell(0, 6, asset["title"], ln=1)

            # Meta row (full width)
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_text_color(*INK_LIGHT)
            meta_line = (
                f"MODE  {asset['mode']}   *   PALETTE  {asset['palette']}   *   AR  {asset['aspect']}"
            )
            pdf.cell(0, 4, meta_line, ln=1)
            pdf.ln(0.5)

            # ---- Two-column body
            body_y = pdf.get_y()

            # Embed image on the right at body_y
            try:
                pdf.image(inline_path, x=img_x, y=body_y, w=img_col_w, h=img_h)
            except Exception as e:
                pdf.set_xy(img_x, body_y)
                pdf.set_font("Helvetica", "I", 7)
                pdf.cell(img_col_w, 5, f"[image missing: {Path(inline_path).name}]")

            # Caption under image
            cap_y = body_y + img_h + 1
            pdf.set_xy(img_x, cap_y)
            pdf.set_font("Helvetica", "I", 6.5)
            pdf.set_text_color(*INK_LIGHT)
            pdf.cell(img_col_w, 3, f"REF: {Path(inline_path).name[:40]}")

            # Render text in left column at body_y
            pdf.set_xy(pdf.l_margin, body_y)
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*INK_BODY)
            # Scene
            scene_text = "Scene:  " + asset["scene"]
            pdf.multi_cell(text_col_w, 4, scene_text)
            pdf.ln(0.5)

            # Palette breakdown
            pdf.set_x(pdf.l_margin)
            pdf.set_font("Helvetica", "I", 7.5)
            pdf.set_text_color(*INK_LIGHT)
            pdf.multi_cell(text_col_w, 3.6, "70-20-10:  " + asset["palette_pct"])
            pdf.ln(0.5)

            # Anonymity note
            if asset["anonymity_note"]:
                pdf.set_x(pdf.l_margin)
                pdf.set_font("Helvetica", "I", 7.5)
                pdf.set_text_color(*INK_LIGHT)
                pdf.multi_cell(text_col_w, 3.6, "Anonymity:  " + asset["anonymity_note"])
                pdf.ln(0.5)

            text_end_y = pdf.get_y()
            image_end_y = body_y + img_h + 6  # include caption space

            # Drop cursor below whichever column is taller
            pdf.set_y(max(text_end_y, image_end_y))

            # Final Midjourney prompt — full width
            mj_prompt = prompt_text(
                asset["scene"],
                asset["palette_pct"],
                asset["mode"],
            )
            ref_path_short = Path(inline_path).name
            mj_full = (
                f"{mj_prompt} "
                f"--ar {asset['aspect']} --sref [attach: {ref_path_short}] --sw 200 {MJ_TAIL}"
            )
            pdf.set_x(pdf.l_margin)
            pdf.set_font("Courier", "", 7.5)
            pdf.set_fill_color(245, 240, 230)
            pdf.set_text_color(*INK_DARK)
            pdf.multi_cell(0, 3.7, mj_full, fill=True)
            pdf.ln(5)

    # ===== APPENDIX =====
    pdf.add_page()
    pdf.title_h2("6.  Appendix -- Notes on the Lamb Mark")
    pdf.body(
        "The seven-eyed Lamb of Revelation 5:6 is the brand's central iconographic mark. Per founder direction "
        "(2026-05-04), the seven-eyed Lamb is being designed by the founder directly and is NOT included in this "
        "Midjourney prompt catalog.",
    )
    pdf.body(
        "This catalog covers general site imagery only -- biblical scene illustrations, symbolic objects, "
        "atmospheric moments, and pastoral/flock lamb imagery. Pastoral lamb prompts (LAM-01..LAM-06) "
        "use natural two-eyed lambs to represent the audience-as-flock identity, which is a separate "
        "and complementary use case from the seven-eyed Christ-Lamb mark.",
    )
    pdf.body(
        "When the founder's seven-eyed Lamb mark is finalized, it will be added to the brand's logo "
        "system documentation (see docs/brand/BRAND-BIBLE.md Chapter 3) and slotted into compositions "
        "via brand-system layering, not through Midjourney generation.",
    )

    pdf.ln(4)
    pdf.title_h2("7.  Appendix -- Asset Summary")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK_BODY)
    section_counts = {}
    for asset in ASSETS:
        prefix = asset["code"].split("-")[0]
        section_counts[prefix] = section_counts.get(prefix, 0) + 1
    summary_lines = [
        f"  Old Testament Stories       {section_counts.get('OT', 0)}",
        f"  New Testament Stories       {section_counts.get('NT', 0)}",
        f"  Parables                    {section_counts.get('PAR', 0)}",
        f"  Symbolic Objects            {section_counts.get('SYM', 0)}",
        f"  Atmospheric / Light         {section_counts.get('ATM', 0)}",
        f"  Lamb Imagery (general)      {section_counts.get('LAM', 0)}",
        f"  ---------------------",
        f"  TOTAL                       {sum(section_counts.values())}",
    ]
    pdf.set_font("Courier", "", 10)
    for line in summary_lines:
        pdf.cell(0, 5, line, ln=1)

    pdf.output(str(OUTPUT_PATH))
    print(f"PDF written: {OUTPUT_PATH}")
    print(f"Total assets: {len(ASSETS)}")
    print(f"Total pages: {pdf.page_no()}")


if __name__ == "__main__":
    build_pdf()
