/**
 * The Daily Bread V2 comic — the deterministic template shelf.
 *
 * Wordless three-panel strips that stage a moment from a parable or a Gospel
 * scene. No dialogue, no jokes, no faces. The only words are an optional
 * caption, and every caption is a verbatim piece of the BSB text of the
 * strip's scriptureReference (checked by __tests__/daily-bread-v2-comic-verses).
 */
import type { ComicScript } from '@/lib/daily-bread/types'
import { mulberry32 } from '@/lib/daily-bread/prng'

export const COMIC_TEMPLATES: readonly ComicScript[] = [
  {
    id: 'the-sower-goes-out',
    title: 'The Sower Goes Out',
    scriptureReference: 'Matthew 13:3-8',
    panels: [
      {
        setting: 'field',
        figures: [{ figure: 'sower', x: 0.34, y: 0.86, scale: 1.25 }],
        description:
          'A farmer walks across a ploughed field, flinging seed from the bag at his side.',
        caption: 'A farmer went out to sow his seed.',
      },
      {
        setting: 'field',
        figures: [
          { figure: 'bird', x: 0.3, y: 0.46, scale: 1.1 },
          { figure: 'bird', x: 0.62, y: 0.62, scale: 1.3, flip: true },
          { figure: 'seed', x: 0.55, y: 0.9, scale: 1.4 },
        ],
        description:
          'Birds swoop down over the furrows toward seed lying on the hard path.',
      },
      {
        setting: 'field',
        figures: [
          { figure: 'sprout', x: 0.36, y: 0.9, scale: 1.5 },
          { figure: 'sprout', x: 0.58, y: 0.84, scale: 1.1 },
          { figure: 'sun', x: 0.8, y: 0.2, scale: 0.8 },
        ],
        description:
          'In good soil, tall stalks with full heads of grain stand under the sun.',
      },
    ],
  },
  {
    id: 'lamp-on-a-stand',
    title: 'A Lamp on a Stand',
    scriptureReference: 'Matthew 5:15',
    panels: [
      {
        setting: 'night',
        figures: [
          { figure: 'door', x: 0.66, y: 0.8, scale: 1.1 },
          { figure: 'traveler', x: 0.28, y: 0.86, scale: 0.9 },
        ],
        description:
          'At night a traveller walks toward a small dark house under the stars.',
      },
      {
        setting: 'room',
        figures: [
          { figure: 'traveler', x: 0.28, y: 0.88, scale: 1.2 },
          { figure: 'lamp', x: 0.5, y: 0.9, scale: 0.7 },
        ],
        description:
          'Inside, the traveller sets a small lit lamp on a stand in the middle of the room.',
      },
      {
        setting: 'room',
        figures: [{ figure: 'lamp', x: 0.46, y: 0.9, scale: 1.55 }],
        description:
          'The lamp stands tall and its light reaches every corner of the house.',
        caption: 'it gives light to everyone in the house',
      },
    ],
  },
  {
    id: 'the-lost-sheep',
    title: 'The Lost Sheep',
    scriptureReference: 'Luke 15:4-5',
    panels: [
      {
        setting: 'hillside',
        figures: [
          { figure: 'shepherd', x: 0.2, y: 0.88, scale: 1.1 },
          { figure: 'sheep', x: 0.46, y: 0.84, scale: 1.1 },
          { figure: 'sheep', x: 0.66, y: 0.9, scale: 1.2, flip: true },
          { figure: 'sheep', x: 0.84, y: 0.8, scale: 0.9 },
        ],
        description:
          'A shepherd stands with his flock on a green hillside, counting them.',
      },
      {
        setting: 'road',
        figures: [
          { figure: 'shepherd', x: 0.6, y: 0.66, scale: 0.8 },
          { figure: 'sheep', x: 0.9, y: 0.4, scale: 0.4, flip: true },
        ],
        description:
          'He sets off alone down the long road toward one small sheep far away.',
        caption: 'go after the one that is lost',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'sheep', x: 0.47, y: 0.58, scale: 1.1 },
          { figure: 'shepherd', x: 0.46, y: 0.94, scale: 1.3 },
        ],
        description:
          'The shepherd walks home with the found sheep carried across his shoulders.',
      },
    ],
  },
  {
    id: 'five-loaves-two-fish',
    title: 'Five Loaves, Two Fish',
    scriptureReference: 'John 6:9',
    panels: [
      {
        setting: 'hillside',
        figures: [
          { figure: 'traveler', x: 0.3, y: 0.9, scale: 0.9 },
          { figure: 'bread', x: 0.56, y: 0.9, scale: 1 },
          { figure: 'fish', x: 0.74, y: 0.92, scale: 0.9 },
        ],
        description:
          'A boy on the hillside offers his small lunch of bread and fish.',
        caption: 'five barley loaves and two small fish',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'bread', x: 0.36, y: 0.86, scale: 1.4 },
          { figure: 'fish', x: 0.64, y: 0.9, scale: 1.4 },
        ],
        description:
          'Close up, a single loaf and a single fish rest in the grass.',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'bread', x: 0.22, y: 0.94, scale: 1.3 },
          { figure: 'bread', x: 0.44, y: 0.82, scale: 1.1 },
          { figure: 'fish', x: 0.66, y: 0.96, scale: 1.4 },
          { figure: 'fish', x: 0.82, y: 0.8, scale: 1 },
        ],
        description:
          'Loaves and fish now spread across the hillside, more than enough for all.',
      },
    ],
  },
  {
    id: 'the-storm-stilled',
    title: 'The Storm Stilled',
    scriptureReference: 'Mark 4:39',
    panels: [
      {
        setting: 'boat',
        figures: [
          { figure: 'wave', x: 0.24, y: 0.98, scale: 1.4 },
          { figure: 'wave', x: 0.82, y: 0.99, scale: 1.2, flip: true },
          { figure: 'traveler', x: 0.4, y: 0.76, scale: 0.8 },
        ],
        description:
          'A fishing boat is tossed by towering waves in a violent storm.',
      },
      {
        setting: 'boat',
        figures: [
          { figure: 'traveler', x: 0.6, y: 0.8, scale: 1 },
          { figure: 'wave', x: 0.14, y: 0.99, scale: 1.1 },
        ],
        description:
          'A figure stands up in the boat and faces the wind and the sea.',
      },
      {
        setting: 'night',
        figures: [
          { figure: 'boat', x: 0.46, y: 0.84, scale: 1.1 },
          { figure: 'star', x: 0.78, y: 0.22, scale: 0.6 },
        ],
        description:
          'The boat rests on still water beneath a quiet sky full of stars.',
        caption: 'it was perfectly calm',
      },
    ],
  },
  {
    id: 'the-mustard-seed',
    title: 'The Mustard Seed',
    scriptureReference: 'Matthew 13:31-32',
    panels: [
      {
        setting: 'garden',
        figures: [
          { figure: 'sower', x: 0.34, y: 0.9, scale: 1.1 },
          { figure: 'seed', x: 0.62, y: 0.94, scale: 1 },
        ],
        description: 'A man plants one tiny mustard seed in a garden bed.',
      },
      {
        setting: 'garden',
        figures: [{ figure: 'sprout', x: 0.5, y: 0.88, scale: 1.2 }],
        description: 'A single green shoot has pushed up out of the soil.',
      },
      {
        setting: 'garden',
        figures: [
          { figure: 'tree', x: 0.48, y: 0.94, scale: 1.4 },
          { figure: 'bird', x: 0.3, y: 0.22, scale: 0.8 },
          { figure: 'bird', x: 0.74, y: 0.3, scale: 0.7, flip: true },
        ],
        description:
          'The shoot has become a broad tree, and birds fly in to its branches.',
        caption: 'the birds of the air come and nest in its branches',
      },
    ],
  },
  {
    id: 'the-long-road-home',
    title: 'The Long Road Home',
    scriptureReference: 'Luke 15:20',
    panels: [
      {
        setting: 'road',
        figures: [
          { figure: 'traveler', x: 0.6, y: 0.5, scale: 0.4 },
          { figure: 'door', x: 0.2, y: 0.92, scale: 1 },
        ],
        description:
          'A house stands by the road, and a lone figure appears far off on the horizon.',
      },
      {
        setting: 'road',
        figures: [
          { figure: 'traveler', x: 0.62, y: 0.56, scale: 0.55, flip: true },
          { figure: 'traveler', x: 0.3, y: 0.94, scale: 1.2 },
        ],
        description:
          'An old father runs down the road toward the returning son.',
        caption: 'while he was still in the distance, his father saw him',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'traveler', x: 0.44, y: 0.9, scale: 1.3 },
          { figure: 'traveler', x: 0.56, y: 0.9, scale: 1.25, flip: true },
        ],
        description:
          'Father and son meet on the hillside and hold each other close.',
      },
    ],
  },
  {
    id: 'water-at-the-well',
    title: 'Water at the Well',
    scriptureReference: 'John 4:13-14',
    panels: [
      {
        setting: 'road',
        figures: [
          { figure: 'traveler', x: 0.5, y: 0.8, scale: 1 },
          { figure: 'sun', x: 0.8, y: 0.16, scale: 0.8 },
        ],
        description:
          'A weary traveller walks a dusty road under the midday sun.',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'well', x: 0.56, y: 0.88, scale: 1.4 },
          { figure: 'traveler', x: 0.26, y: 0.9, scale: 1.1 },
        ],
        description: 'The traveller reaches a stone well and rests beside it.',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'well', x: 0.5, y: 0.88, scale: 1.3 },
          { figure: 'traveler', x: 0.22, y: 0.9, scale: 1.05 },
          { figure: 'traveler', x: 0.78, y: 0.9, scale: 1, flip: true },
        ],
        description:
          'A woman comes with her jar, and the two stand on either side of the well.',
        caption: 'a fount of water springing up to eternal life',
      },
    ],
  },
  {
    id: 'following-the-star',
    title: 'Following the Star',
    scriptureReference: 'Matthew 2:9-10',
    panels: [
      {
        setting: 'night',
        figures: [
          { figure: 'star', x: 0.76, y: 0.2, scale: 0.7 },
          { figure: 'traveler', x: 0.18, y: 0.86, scale: 0.8 },
          { figure: 'traveler', x: 0.3, y: 0.88, scale: 0.85 },
          { figure: 'traveler', x: 0.42, y: 0.86, scale: 0.8 },
        ],
        description:
          'Three travellers look up at a bright star rising in the night sky.',
      },
      {
        setting: 'road',
        figures: [
          { figure: 'star', x: 0.56, y: 0.14, scale: 0.7 },
          { figure: 'traveler', x: 0.5, y: 0.7, scale: 0.7 },
          { figure: 'traveler', x: 0.62, y: 0.78, scale: 0.8 },
        ],
        description:
          'The travellers follow the road with the star going on ahead of them.',
      },
      {
        setting: 'night',
        figures: [
          { figure: 'star', x: 0.52, y: 0.2, scale: 1 },
          { figure: 'door', x: 0.52, y: 0.8, scale: 1.1 },
          { figure: 'traveler', x: 0.16, y: 0.88, scale: 0.9 },
        ],
        description:
          'The star stands still over a small house, and the travellers arrive.',
        caption: 'they rejoiced with great delight',
      },
    ],
  },
  {
    id: 'look-at-the-birds',
    title: 'Look at the Birds',
    scriptureReference: 'Matthew 6:26',
    panels: [
      {
        setting: 'field',
        figures: [
          { figure: 'sower', x: 0.3, y: 0.88, scale: 1.1 },
          { figure: 'bird', x: 0.78, y: 0.2, scale: 0.7 },
        ],
        description:
          'A farmer works hard sowing his field while a bird passes overhead.',
      },
      {
        setting: 'field',
        figures: [
          { figure: 'bird', x: 0.24, y: 0.34, scale: 1.2 },
          { figure: 'bird', x: 0.52, y: 0.2, scale: 0.9 },
          { figure: 'bird', x: 0.74, y: 0.42, scale: 1.1, flip: true },
        ],
        description:
          'Birds wheel freely across the wide sky above the furrows.',
        caption: 'Look at the birds of the air',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'tree', x: 0.62, y: 0.9, scale: 1.3 },
          { figure: 'bird', x: 0.34, y: 0.3, scale: 0.8 },
          { figure: 'seed', x: 0.24, y: 0.86, scale: 1.2 },
        ],
        description:
          'A bird glides down toward seed in the grass beneath a tree.',
      },
    ],
  },
  {
    id: 'knock-and-it-opens',
    title: 'Knock, and It Opens',
    scriptureReference: 'Matthew 7:7',
    panels: [
      {
        setting: 'road',
        figures: [
          { figure: 'traveler', x: 0.56, y: 0.74, scale: 0.8 },
          { figure: 'door', x: 0.84, y: 0.54, scale: 0.6 },
        ],
        description:
          'A traveller walks up a long road toward a house in the distance.',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'door', x: 0.6, y: 0.9, scale: 1.5 },
          { figure: 'traveler', x: 0.22, y: 0.92, scale: 1.1 },
        ],
        description:
          'The traveller stands at the doorway of the house and knocks.',
        caption: 'knock, and the door will be opened to you',
      },
      {
        setting: 'room',
        figures: [
          { figure: 'lamp', x: 0.4, y: 0.9, scale: 1.1 },
          { figure: 'traveler', x: 0.72, y: 0.86, scale: 1.1, flip: true },
        ],
        description:
          'Inside, a lamp is burning, and the traveller has been welcomed in.',
      },
    ],
  },
  {
    id: 'beside-quiet-waters',
    title: 'Beside Quiet Waters',
    scriptureReference: 'Psalm 23:1-2',
    panels: [
      {
        setting: 'hillside',
        figures: [
          { figure: 'shepherd', x: 0.26, y: 0.9, scale: 1.2 },
          { figure: 'sheep', x: 0.56, y: 0.88, scale: 1.1 },
          { figure: 'sheep', x: 0.76, y: 0.92, scale: 1 },
        ],
        description: 'A shepherd watches over his sheep on a grassy hillside.',
      },
      {
        setting: 'road',
        figures: [
          { figure: 'shepherd', x: 0.36, y: 0.9, scale: 1.1 },
          { figure: 'sheep', x: 0.6, y: 0.84, scale: 0.9, flip: true },
        ],
        description: 'He leads the sheep along a winding path down the valley.',
      },
      {
        setting: 'shore',
        figures: [
          { figure: 'sheep', x: 0.36, y: 0.9, scale: 1.2 },
          { figure: 'sheep', x: 0.58, y: 0.84, scale: 1 },
          { figure: 'shepherd', x: 0.82, y: 0.92, scale: 1.1, flip: true },
        ],
        description:
          'The flock rests by calm water while the shepherd stands near.',
        caption: 'He leads me beside quiet waters',
      },
    ],
  },
  {
    id: 'let-down-the-nets',
    title: 'Let Down the Nets',
    scriptureReference: 'Luke 5:5-6',
    panels: [
      {
        setting: 'night',
        figures: [{ figure: 'boat', x: 0.5, y: 0.84, scale: 1.2 }],
        description:
          'An empty fishing boat drifts on dark water at the end of a long night.',
        caption: 'we have worked hard all night without catching anything',
      },
      {
        setting: 'boat',
        figures: [{ figure: 'traveler', x: 0.4, y: 0.78, scale: 1 }],
        description:
          'In the morning light a fisherman stands in the boat and lets the nets down again.',
      },
      {
        setting: 'boat',
        figures: [
          { figure: 'fish', x: 0.2, y: 0.96, scale: 1.3 },
          { figure: 'fish', x: 0.42, y: 0.99, scale: 1.1, flip: true },
          { figure: 'fish', x: 0.64, y: 0.95, scale: 1.4 },
          { figure: 'fish', x: 0.84, y: 0.99, scale: 1.1, flip: true },
        ],
        description: 'The water beside the boat is suddenly crowded with fish.',
      },
    ],
  },
  {
    id: 'the-seed-grows',
    title: 'The Seed Grows',
    scriptureReference: 'Mark 4:26-28',
    panels: [
      {
        setting: 'field',
        figures: [
          { figure: 'sower', x: 0.3, y: 0.86, scale: 1.2 },
          { figure: 'seed', x: 0.66, y: 0.9, scale: 1.2 },
        ],
        description: 'A man scatters seed across his field and goes home.',
      },
      {
        setting: 'night',
        figures: [{ figure: 'sprout', x: 0.5, y: 0.9, scale: 0.8 }],
        description:
          'Overnight, under the moon, a small shoot breaks through the ground.',
        caption: 'the seed sprouts and grows, though he knows not how',
      },
      {
        setting: 'field',
        figures: [
          { figure: 'sprout', x: 0.3, y: 0.9, scale: 1.4 },
          { figure: 'sprout', x: 0.5, y: 0.86, scale: 1.2 },
          { figure: 'sprout', x: 0.7, y: 0.9, scale: 1.4 },
          { figure: 'sun', x: 0.84, y: 0.18, scale: 0.7 },
        ],
        description: 'By day the field stands full of ripe grain.',
      },
    ],
  },
  {
    id: 'shepherds-keeping-watch',
    title: 'Shepherds Keeping Watch',
    scriptureReference: 'Luke 2:8',
    panels: [
      {
        setting: 'night',
        figures: [
          { figure: 'shepherd', x: 0.3, y: 0.88, scale: 1.1 },
          { figure: 'sheep', x: 0.56, y: 0.9, scale: 1 },
          { figure: 'sheep', x: 0.76, y: 0.86, scale: 0.9, flip: true },
        ],
        description:
          'A shepherd stands guard over his sheep in the fields at night.',
        caption: 'keeping watch over their flocks by night',
      },
      {
        setting: 'night',
        figures: [
          { figure: 'star', x: 0.7, y: 0.26, scale: 0.8 },
          { figure: 'shepherd', x: 0.34, y: 0.9, scale: 1.2 },
        ],
        description:
          'The shepherd looks up as a bright light appears in the sky.',
      },
      {
        setting: 'night',
        figures: [
          { figure: 'star', x: 0.5, y: 0.26, scale: 1.3 },
          { figure: 'shepherd', x: 0.26, y: 0.9, scale: 1 },
          { figure: 'sheep', x: 0.56, y: 0.92, scale: 0.9 },
          { figure: 'shepherd', x: 0.8, y: 0.88, scale: 0.95, flip: true },
        ],
        description:
          'The whole sky is bright over the shepherds and their flock.',
      },
    ],
  },
  {
    id: 'the-house-on-the-rock',
    title: 'The House on the Rock',
    scriptureReference: 'Matthew 7:24-25',
    panels: [
      {
        setting: 'hillside',
        figures: [
          { figure: 'door', x: 0.6, y: 0.8, scale: 1.3 },
          { figure: 'traveler', x: 0.24, y: 0.9, scale: 1 },
        ],
        description:
          'A builder finishes a small stone house on a rocky hillside.',
      },
      {
        setting: 'night',
        figures: [
          { figure: 'door', x: 0.54, y: 0.8, scale: 1.3 },
          { figure: 'wave', x: 0.2, y: 0.98, scale: 1.2 },
          { figure: 'wave', x: 0.88, y: 0.98, scale: 1, flip: true },
        ],
        description:
          'In a dark storm the waters rise and beat against the house.',
        caption: 'yet it did not fall, because its foundation was on the rock',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'door', x: 0.6, y: 0.8, scale: 1.3 },
          { figure: 'sun', x: 0.2, y: 0.18, scale: 0.8 },
        ],
        description:
          'Morning comes, and the house is still standing on its hill in the sun.',
      },
    ],
  },
  {
    id: 'the-sun-rises',
    title: 'The Sun Rises',
    scriptureReference: 'Malachi 4:2',
    panels: [
      {
        setting: 'night',
        figures: [
          { figure: 'sheep', x: 0.4, y: 0.9, scale: 1.1 },
          { figure: 'sheep', x: 0.6, y: 0.88, scale: 1, flip: true },
        ],
        description: 'Young animals sleep in the dark before dawn.',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'sun', x: 0.72, y: 0.3, scale: 1 },
          { figure: 'sheep', x: 0.36, y: 0.9, scale: 1.1 },
        ],
        description: 'The sun rises over the hill and warms the waking flock.',
        caption: 'the sun of righteousness will rise with healing in its wings',
      },
      {
        setting: 'hillside',
        figures: [
          { figure: 'sun', x: 0.5, y: 0.16, scale: 0.9 },
          { figure: 'sheep', x: 0.28, y: 0.74, scale: 1 },
          { figure: 'sheep', x: 0.64, y: 0.8, scale: 1.1, flip: true },
        ],
        description:
          'In full daylight the young ones leap and run across the grass.',
      },
    ],
  },
]

/**
 * Deterministic pick: the same seed and exclusions always give the same
 * strip. Excluded ids are skipped unless every template is excluded.
 */
export function pickComicTemplate(
  seed: number,
  excludeIds: readonly string[],
): ComicScript {
  const excluded = new Set(excludeIds)
  const open = COMIC_TEMPLATES.filter((t) => !excluded.has(t.id))
  const pool = open.length > 0 ? open : COMIC_TEMPLATES
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0
  const index = Math.floor(mulberry32(safeSeed)() * pool.length)
  return pool[Math.min(index, pool.length - 1)]
}
