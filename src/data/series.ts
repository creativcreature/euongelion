export interface SeriesInfo {
  title: string
  question: string
  introduction: string
  context: string
  framework: string
  days: Array<{ day: number; title: string; slug: string }>
}

export const SERIES_DATA: Record<string, SeriesInfo> = {
  identity: {
    title: 'Identity Crisis',
    question: 'When everything that defined you is shaken, who are you?',
    introduction:
      'Your country, your job, your security—all unstable. So who are you, really? This 5-day journey explores what remains when the labels fall away.',
    context:
      "In 2026, political violence is at 1970s levels. Your job title doesn't guarantee security anymore. The definitions that once told you who you were are fracturing. This series asks the uncomfortable question: if you're not what you do, what you earn, or what country you belong to—then who are you?",
    framework:
      'Matthew 6:33 - Seek first the kingdom, and all these things will be added',
    days: [
      {
        day: 1,
        title: 'When everything shakes',
        slug: 'identity-crisis-day-1',
      },
      { day: 2, title: 'The narrative breaks', slug: 'identity-crisis-day-2' },
      { day: 3, title: 'You are whose you are', slug: 'identity-crisis-day-3' },
      { day: 4, title: 'Living from identity', slug: 'identity-crisis-day-4' },
      { day: 5, title: 'What remains', slug: 'identity-crisis-day-5' },
    ],
  },
  peace: {
    title: 'Peace',
    question: "What if peace isn't found by controlling your circumstances?",
    introduction:
      "You've tried to control everything. And you're exhausted. This 5-day journey explores a different kind of peace—one that doesn't depend on your circumstances.",
    context:
      '43% more anxious than last year. You refresh the news obsessively, doomscrolling to see if your world is still intact. You try to manage every variable, control every outcome. But the tighter you grip, the less peace you have.',
    framework: 'John 14:27 - Peace I give you, not as the world gives',
    days: [
      { day: 1, title: 'The illusion of control', slug: 'peace-day-1' },
      { day: 2, title: 'The exhaustion of managing', slug: 'peace-day-2' },
      { day: 3, title: "Peace the world can't give", slug: 'peace-day-3' },
      { day: 4, title: 'Practicing surrender', slug: 'peace-day-4' },
      { day: 5, title: 'Peace as gift', slug: 'peace-day-5' },
    ],
  },
  community: {
    title: 'Community',
    question: 'Who are your people when systems fail?',
    introduction:
      'Institutions are failing. Networks are transactional. 29% are frequently lonely. This 5-day journey explores covenant community—the kind that remains when everything else collapses.',
    context:
      '71% are dissatisfied with democracy. The systems you trusted are fracturing. Your professional network disappears when you lose your job. Your contacts ghost you in crisis. In a world of transactional relationships, who actually stays?',
    framework: 'Matthew 18:20 - Where two or three gather in my name',
    days: [
      { day: 1, title: 'When systems fail', slug: 'community-day-1' },
      { day: 2, title: 'The loneliness epidemic', slug: 'community-day-2' },
      {
        day: 3,
        title: "You're not meant to be alone",
        slug: 'community-day-3',
      },
      { day: 4, title: 'Covenant in practice', slug: 'community-day-4' },
      { day: 5, title: 'Who remains', slug: 'community-day-5' },
    ],
  },
  kingdom: {
    title: 'Kingdom',
    question: "What if the kingdom you're looking for is already here?",
    introduction:
      "You've been searching for refuge in politics, economics, and curated spirituality. You're exhausted. This 5-day journey reveals the kingdom that's been here all along.",
    context:
      "You voted, donated, argued online. You optimized your finances, stockpiled savings. You sampled Buddhism, mindfulness, astrology. You've been looking for a kingdom that won't collapse. But you've been looking in empires.",
    framework:
      'Luke 17:21 + Matthew 6:33 - The kingdom is in your midst. Seek it first.',
    days: [
      { day: 1, title: 'Searching in wrong places', slug: 'kingdom-day-1' },
      { day: 2, title: 'The exhaustion of empires', slug: 'kingdom-day-2' },
      { day: 3, title: 'The kingdom is here', slug: 'kingdom-day-3' },
      { day: 4, title: 'Seeking first', slug: 'kingdom-day-4' },
      { day: 5, title: 'Everything else added', slug: 'kingdom-day-5' },
    ],
  },
  provision: {
    title: 'Provision',
    question:
      "What if provision isn't about having enough, but sharing what you have?",
    introduction:
      "47.9M are food insecure while others stockpile. This 5-day journey explores God's backwards economy: sharing creates abundance, hoarding creates scarcity.",
    context:
      "Inflation has eaten 25% of your purchasing power. You're stockpiling, building contingencies, trying to have enough. But the fear of scarcity is making you hoard. And the hoarding is making you emptier.",
    framework:
      'Matthew 6:33 - Seek first the kingdom, and all these things will be added',
    days: [
      { day: 1, title: 'The scarcity mindset', slug: 'provision-day-1' },
      { day: 2, title: 'Fear drives hoarding', slug: 'provision-day-2' },
      { day: 3, title: "God's backwards economy", slug: 'provision-day-3' },
      { day: 4, title: 'Mutual aid in practice', slug: 'provision-day-4' },
      {
        day: 5,
        title: 'When you share, needs are met',
        slug: 'provision-day-5',
      },
    ],
  },
  truth: {
    title: 'Truth',
    question: "How do you know what's real when misinformation is everywhere?",
    introduction:
      "Deepfakes. AI-generated content. Partisan bubbles. You can't trust anything. This 5-day journey moves from information overload to knowing the one who is true.",
    context:
      "You're drowning in 500M tweets per day. Deepfakes are indistinguishable from reality. 60-73% encounter misinformation daily. You don't know what's real anymore. And the hypervigilance is exhausting you.",
    framework: 'John 14:6 - I am the way, the truth, and the life',
    days: [
      { day: 1, title: 'Drowning in information', slug: 'truth-day-1' },
      { day: 2, title: "Can't trust yourself", slug: 'truth-day-2' },
      { day: 3, title: 'Truth is a person', slug: 'truth-day-3' },
      { day: 4, title: 'From information to wisdom', slug: 'truth-day-4' },
      { day: 5, title: 'Truth was searching for you', slug: 'truth-day-5' },
    ],
  },
  hope: {
    title: 'Hope',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    introduction:
      '57% are pessimistic about 2026. Optimism is dead. Toxic positivity fails. This 5-day journey explores resurrection hope—the kind that enters darkness instead of denying it.',
    context:
      'Climate crisis. Political violence. Economic collapse. Everything feels apocalyptic. Toxic positivity says "stay positive!" But that\'s not working. This series offers something different: hope that\'s honest about the dark.',
    framework: 'Lamentations 3:22-23 - His mercies are new every morning',
    days: [
      { day: 1, title: 'Optimism is dead', slug: 'hope-day-1' },
      { day: 2, title: 'Grief is holy', slug: 'hope-day-2' },
      { day: 3, title: 'Hope enters darkness', slug: 'hope-day-3' },
      { day: 4, title: 'Practicing faithfulness', slug: 'hope-day-4' },
      { day: 5, title: 'Resurrection promise', slug: 'hope-day-5' },
    ],
  },
}

export const SERIES_ORDER = [
  'identity',
  'peace',
  'community',
  'kingdom',
  'provision',
  'truth',
  'hope',
] as const

export const DEVOTIONAL_SERIES = SERIES_ORDER.map((slug, i) => ({
  number: String(i + 1).padStart(2, '0'),
  slug,
  theme: SERIES_DATA[slug].title,
  question: SERIES_DATA[slug].question,
  isCenter: slug === 'kingdom',
}))
