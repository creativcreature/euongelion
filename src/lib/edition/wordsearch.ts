/**
 * The word search — a daily 12x12 grid built from a themed bank.
 *
 * PAGE-SAFE: this module renders page-side on Cloudflare Workers, so it is
 * pure arithmetic over a const bank. No fs, no network, no Math.random. The
 * same UTC date always produces the same grid, the same word list and the
 * same theme, on every machine and in every process.
 *
 * The seed idiom (FNV-1a into mulberry32) is copied verbatim from
 * `src/lib/edition/generators/puzzles.ts` — that file cannot be imported
 * here because it reads the BSB corpus with node:fs.
 *
 * Per Development Rule 1 there are no silent fallbacks: a malformed set or a
 * set that cannot be placed THROWS. The fix is always to fix the set — the
 * test proves every set places on 60 consecutive dates.
 */

export interface WordSearchPuzzle {
  grid: string[][]
  words: string[]
  theme: string
}

export interface WordSearchSet {
  theme: string
  words: readonly string[]
}

/* ── Seeded randomness (copied idiom from generators/puzzles.ts) ────────── */

/** FNV-1a, 32-bit. Stable across engines — no floating point, no locale. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, and identical on every JS engine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

/** Fisher-Yates using the supplied stream. Returns a new array. */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1)
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 'YYYY-MM-DD' in UTC. The builder keys off this and nothing else. */
function isoDay(date: Date): string {
  const t = date.getTime()
  if (!Number.isFinite(t))
    throw new Error('wordsearch: invalid Date passed to buildWordSearch')
  return date.toISOString().slice(0, 10)
}

/** Days since 1970-01-01 UTC — the rotation index the theme pick uses. */
function dayNumber(isoDate: string): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(ms))
    throw new Error(`wordsearch: unparseable date ${isoDate}`)
  if (ms < 0) {
    throw new Error(
      `wordsearch: ${isoDate} is before 1970-01-01, and the theme rotation is only defined from the epoch forward.`,
    )
  }
  return Math.floor(ms / 86400000)
}

/* ── The bank ───────────────────────────────────────────────────────────
 * 45 themed sets, 6-9 words each, every word 4-10 letters A-Z. The pick is
 * days-since-epoch % 45, so 30 consecutive days never repeat a theme and 60
 * consecutive days exercise every set — which is what lets the test prove
 * the whole bank places.
 */

export const WORD_SEARCH_BANK: readonly WordSearchSet[] = [
  {
    theme: 'Names of Jesus',
    words: [
      'SHEPHERD',
      'VINE',
      'LAMB',
      'WORD',
      'LIGHT',
      'DOOR',
      'BREAD',
      'ALPHA',
    ],
  },
  {
    theme: 'The Exodus',
    words: [
      'MOSES',
      'PHARAOH',
      'PLAGUES',
      'PASSOVER',
      'MANNA',
      'SINAI',
      'EGYPT',
      'AARON',
    ],
  },
  {
    theme: 'Fruit of the Spirit',
    words: [
      'LOVE',
      'PEACE',
      'PATIENCE',
      'KINDNESS',
      'GOODNESS',
      'GENTLENESS',
      'MEEKNESS',
    ],
  },
  {
    theme: 'The Parables',
    words: [
      'SOWER',
      'SEED',
      'TALENTS',
      'VINEYARD',
      'PRODIGAL',
      'PEARL',
      'MUSTARD',
      'LEAVEN',
    ],
  },
  {
    theme: 'Words of the Psalms',
    words: [
      'SELAH',
      'PRAISE',
      'REFUGE',
      'MERCY',
      'STEADFAST',
      'HALLELUJAH',
      'ZION',
      'HARP',
    ],
  },
  {
    theme: 'Women of the Bible',
    words: [
      'SARAH',
      'RUTH',
      'ESTHER',
      'DEBORAH',
      'HANNAH',
      'MARY',
      'LYDIA',
      'PRISCILLA',
    ],
  },
  {
    theme: 'Cities of Paul',
    words: [
      'ROME',
      'CORINTH',
      'EPHESUS',
      'PHILIPPI',
      'ATHENS',
      'ANTIOCH',
      'TARSUS',
      'DAMASCUS',
    ],
  },
  {
    theme: 'The Creation',
    words: [
      'LIGHT',
      'WATERS',
      'STARS',
      'BIRDS',
      'BEASTS',
      'GARDEN',
      'SABBATH',
      'ADAM',
    ],
  },
  {
    theme: 'Noah and the Flood',
    words: ['NOAH', 'FLOOD', 'RAVEN', 'DOVE', 'OLIVE', 'RAINBOW', 'COVENANT'],
  },
  {
    theme: 'The Twelve',
    words: [
      'PETER',
      'ANDREW',
      'JAMES',
      'JOHN',
      'PHILIP',
      'THOMAS',
      'MATTHEW',
      'JUDAS',
    ],
  },
  {
    theme: 'Kings of Israel and Judah',
    words: [
      'SAUL',
      'DAVID',
      'SOLOMON',
      'HEZEKIAH',
      'JOSIAH',
      'AHAB',
      'JEHU',
      'UZZIAH',
    ],
  },
  {
    theme: 'The Prophets',
    words: [
      'ISAIAH',
      'JEREMIAH',
      'EZEKIEL',
      'DANIEL',
      'HOSEA',
      'AMOS',
      'JONAH',
      'MICAH',
    ],
  },
  {
    theme: 'The Armor of God',
    words: [
      'BELT',
      'TRUTH',
      'SHIELD',
      'FAITH',
      'HELMET',
      'SWORD',
      'SPIRIT',
      'GOSPEL',
    ],
  },
  {
    theme: 'The Nativity',
    words: [
      'MANGER',
      'STAR',
      'MAGI',
      'SHEPHERDS',
      'ANGELS',
      'BETHLEHEM',
      'MARY',
      'JOSEPH',
    ],
  },
  {
    theme: 'Holy Week',
    words: ['PALMS', 'TEMPLE', 'PASSOVER', 'GARDEN', 'CROSS', 'TOMB', 'RISEN'],
  },
  {
    theme: 'The Miracles',
    words: [
      'WATER',
      'WINE',
      'LOAVES',
      'FISHES',
      'STORM',
      'LEPER',
      'SIGHT',
      'LAZARUS',
    ],
  },
  {
    theme: 'The Tabernacle',
    words: [
      'LAMPSTAND',
      'ALTAR',
      'INCENSE',
      'VEIL',
      'LAVER',
      'CURTAIN',
      'PRIEST',
      'OFFERING',
    ],
  },
  {
    theme: 'Mount Sinai',
    words: [
      'THUNDER',
      'TRUMPET',
      'TABLETS',
      'COMMAND',
      'GLORY',
      'CLOUD',
      'FIRE',
    ],
  },
  {
    theme: 'David and Goliath',
    words: [
      'SLING',
      'STONE',
      'GIANT',
      'VALLEY',
      'ARMOR',
      'SPEAR',
      'VICTORY',
      'SHEPHERD',
    ],
  },
  {
    theme: 'The Beatitudes',
    words: [
      'BLESSED',
      'MEEK',
      'MOURN',
      'HUNGER',
      'MERCIFUL',
      'PURE',
      'PEACEMAKER',
      'HEART',
    ],
  },
  {
    theme: 'The Garden of Eden',
    words: ['SERPENT', 'FRUIT', 'TREE', 'RIVER', 'KNOWLEDGE', 'DUST', 'EDEN'],
  },
  {
    theme: 'Rivers and Waters',
    words: [
      'JORDAN',
      'GALILEE',
      'NILE',
      'EUPHRATES',
      'TIGRIS',
      'PISHON',
      'GIHON',
    ],
  },
  {
    theme: "The Lord's Prayer",
    words: [
      'FATHER',
      'HALLOWED',
      'KINGDOM',
      'BREAD',
      'DEBTS',
      'TEMPTATION',
      'DELIVER',
      'GLORY',
    ],
  },
  {
    theme: 'Letters of Paul',
    words: [
      'ROMANS',
      'GALATIANS',
      'EPHESIANS',
      'PHILEMON',
      'TITUS',
      'TIMOTHY',
      'COLOSSIANS',
    ],
  },
  {
    theme: 'The Exile',
    words: [
      'BABYLON',
      'CAPTIVE',
      'FURNACE',
      'LIONS',
      'DREAMS',
      'RETURN',
      'REBUILD',
      'CYRUS',
    ],
  },
  {
    theme: 'The Angels',
    words: [
      'GABRIEL',
      'MICHAEL',
      'SERAPHIM',
      'CHERUBIM',
      'MESSENGER',
      'WINGS',
      'HOST',
    ],
  },
  {
    theme: "Solomon's Temple",
    words: [
      'SOLOMON',
      'CEDAR',
      'GOLD',
      'PILLARS',
      'COURTS',
      'HOLY',
      'GLORY',
      'STONE',
    ],
  },
  {
    theme: 'The Shepherd Psalm',
    words: [
      'PASTURES',
      'WATERS',
      'SOUL',
      'PATHS',
      'VALLEY',
      'STAFF',
      'TABLE',
      'GOODNESS',
    ],
  },
  {
    theme: 'Names of God',
    words: [
      'ELOHIM',
      'ADONAI',
      'YAHWEH',
      'JEHOVAH',
      'ALMIGHTY',
      'PROVIDER',
      'HEALER',
    ],
  },
  {
    theme: 'Jonah',
    words: ['NINEVEH', 'STORM', 'FISH', 'VINE', 'TARSHISH', 'SAILORS', 'MERCY'],
  },
  {
    theme: 'Ruth and Naomi',
    words: [
      'MOAB',
      'GLEAN',
      'BARLEY',
      'BOAZ',
      'KINSMAN',
      'REDEEMER',
      'HARVEST',
      'OBED',
    ],
  },
  {
    theme: 'Esther',
    words: [
      'PERSIA',
      'QUEEN',
      'MORDECAI',
      'HAMAN',
      'BANQUET',
      'SCEPTER',
      'PURIM',
      'FAVOR',
    ],
  },
  {
    theme: 'The Early Church',
    words: [
      'PENTECOST',
      'TONGUES',
      'STEPHEN',
      'BARNABAS',
      'SILAS',
      'PRAYER',
      'BAPTISM',
      'FELLOWSHIP',
    ],
  },
  {
    theme: 'Revelation',
    words: [
      'THRONE',
      'LAMB',
      'SCROLL',
      'SEALS',
      'TRUMPETS',
      'ELDERS',
      'CRYSTAL',
      'OMEGA',
    ],
  },
  {
    theme: 'Words of Prayer',
    words: [
      'KNEEL',
      'FASTING',
      'PETITION',
      'INTERCEDE',
      'THANKS',
      'AMEN',
      'LISTEN',
      'QUIET',
    ],
  },
  {
    theme: 'Wisdom Literature',
    words: [
      'PROVERBS',
      'WISDOM',
      'FOLLY',
      'RICHES',
      'TONGUE',
      'DILIGENT',
      'HUMILITY',
      'CROWN',
    ],
  },
  {
    theme: 'The Passion',
    words: [
      'GETHSEMANE',
      'BETRAYAL',
      'TRIAL',
      'THORNS',
      'NAILS',
      'DARKNESS',
      'CURTAIN',
      'FORGIVE',
    ],
  },
  {
    theme: 'The Resurrection',
    words: [
      'DAWN',
      'STONE',
      'LINEN',
      'ANGEL',
      'EMMAUS',
      'BREAKFAST',
      'THOMAS',
      'ASCENSION',
    ],
  },
  {
    theme: 'Joseph in Egypt',
    words: [
      'DREAMS',
      'COAT',
      'BROTHERS',
      'FAMINE',
      'GRAIN',
      'POTIPHAR',
      'PRISON',
      'RULER',
    ],
  },
  {
    theme: 'The Ten Plagues',
    words: [
      'BLOOD',
      'FROGS',
      'GNATS',
      'FLIES',
      'BOILS',
      'HAIL',
      'LOCUSTS',
      'DARKNESS',
    ],
  },
  {
    theme: 'Trees of the Bible',
    words: [
      'OLIVE',
      'CEDAR',
      'SYCAMORE',
      'PALM',
      'ACACIA',
      'ALMOND',
      'MYRTLE',
      'CYPRESS',
    ],
  },
  {
    theme: 'Precious Stones',
    words: [
      'JASPER',
      'SAPPHIRE',
      'EMERALD',
      'TOPAZ',
      'BERYL',
      'ONYX',
      'AMETHYST',
      'PEARL',
    ],
  },
  {
    theme: 'Animals of the Bible',
    words: [
      'DONKEY',
      'CAMEL',
      'SPARROW',
      'EAGLE',
      'LION',
      'SERPENT',
      'LOCUST',
      'WHALE',
    ],
  },
  {
    theme: 'The Virtues',
    words: [
      'HOPE',
      'CHARITY',
      'COURAGE',
      'HONESTY',
      'SERVICE',
      'PRUDENCE',
      'JUSTICE',
      'GRACE',
    ],
  },
  {
    theme: 'The Promised Land',
    words: [
      'CANAAN',
      'MILK',
      'HONEY',
      'JERICHO',
      'GRAPES',
      'GIANTS',
      'JORDAN',
      'HEBRON',
    ],
  },
]

/* ── The builder ────────────────────────────────────────────────────────── */

export const WORD_SEARCH_SIZE = 12

/** All eight straight directions, in a fixed order the shuffle draws from. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** A set that breaks the authoring contract is a bug in the bank — throw. */
function validateSet(set: WordSearchSet): void {
  if (set.words.length < 6 || set.words.length > 9) {
    throw new Error(
      `wordsearch: "${set.theme}" holds ${set.words.length} words; a set carries 6-9`,
    )
  }
  const seen = new Set<string>()
  for (const word of set.words) {
    if (!/^[A-Z]{4,10}$/.test(word)) {
      throw new Error(
        `wordsearch: "${word}" in "${set.theme}" is not 4-10 letters A-Z`,
      )
    }
    if (seen.has(word)) {
      throw new Error(`wordsearch: "${word}" appears twice in "${set.theme}"`)
    }
    seen.add(word)
  }
}

interface Candidate {
  dir: number
  row: number
  col: number
}

/** Every (direction, row, col) a word could conceivably start from. */
const ALL_CANDIDATES: readonly Candidate[] = DIRECTIONS.flatMap((_, dir) =>
  Array.from({ length: WORD_SEARCH_SIZE * WORD_SEARCH_SIZE }, (__, i) => ({
    dir,
    row: Math.floor(i / WORD_SEARCH_SIZE),
    col: i % WORD_SEARCH_SIZE,
  })),
)

function fits(
  grid: (string | null)[][],
  word: string,
  { dir, row, col }: Candidate,
): boolean {
  const [dr, dc] = DIRECTIONS[dir]
  const endRow = row + dr * (word.length - 1)
  const endCol = col + dc * (word.length - 1)
  if (
    endRow < 0 ||
    endRow >= WORD_SEARCH_SIZE ||
    endCol < 0 ||
    endCol >= WORD_SEARCH_SIZE
  ) {
    return false
  }
  for (let i = 0; i < word.length; i += 1) {
    const cell = grid[row + dr * i][col + dc * i]
    if (cell !== null && cell !== word[i]) return false
  }
  return true
}

function place(
  grid: (string | null)[][],
  word: string,
  { dir, row, col }: Candidate,
): void {
  const [dr, dc] = DIRECTIONS[dir]
  for (let i = 0; i < word.length; i += 1) {
    grid[row + dr * i][col + dc * i] = word[i]
  }
}

/**
 * One placement pass: longest words first (the hardest to seat), each taking
 * the first fit in its own seeded shuffle of every candidate. Scanning a full
 * shuffle rather than sampling means a pass only fails when the partial grid
 * truly has no room — at which point the outer loop rebuilds from scratch
 * with fresh draws from the same deterministic stream.
 */
function tryBuild(
  words: readonly string[],
  rng: Rng,
): (string | null)[][] | null {
  const grid: (string | null)[][] = Array.from(
    { length: WORD_SEARCH_SIZE },
    () => Array.from({ length: WORD_SEARCH_SIZE }, () => null),
  )
  for (const word of words) {
    const candidates = shuffled(rng, ALL_CANDIDATES)
    const spot = candidates.find((c) => fits(grid, word, c))
    if (!spot) return null
    place(grid, word, spot)
  }
  return grid
}

const MAX_BUILD_ATTEMPTS = 24

/**
 * Build the day's 12x12 word search. Deterministic: theme by days-since-epoch,
 * placement and fill from one PRNG seeded off the UTC date string.
 */
export function buildWordSearch(date: Date): WordSearchPuzzle {
  const isoDate = isoDay(date)
  const set = WORD_SEARCH_BANK[dayNumber(isoDate) % WORD_SEARCH_BANK.length]
  validateSet(set)

  const rng = mulberry32(hashSeed(`${isoDate}:wordsearch`))
  const ordered = set.words.slice().sort((a, b) => b.length - a.length)

  for (let attempt = 0; attempt < MAX_BUILD_ATTEMPTS; attempt += 1) {
    const placed = tryBuild(ordered, rng)
    if (!placed) continue
    const grid = placed.map((row) =>
      row.map((cell) => cell ?? LETTERS[Math.floor(rng() * 26) % 26]),
    )
    return { grid, words: set.words.slice(), theme: set.theme }
  }

  // Not a fallback situation: an unplaceable set is a defect in the bank.
  throw new Error(
    `wordsearch: could not place the "${set.theme}" set for ${isoDate} after ${MAX_BUILD_ATTEMPTS} attempts — fix the set`,
  )
}
