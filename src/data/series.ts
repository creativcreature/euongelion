export interface SeriesInfo {
  title: string
  question: string
  introduction: string
  context: string
  framework: string
  pathway: 'Sleep' | 'Awake' | 'Shepherd'
  days: Array<{ day: number; title: string; slug: string }>
  keywords: string[]
  heroImage?: string
}

// ============================================
// 7 Wake-Up Magazine Series (original)
// ============================================

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
    pathway: 'Awake',
    keywords: [
      'identity',
      'who am i',
      'lost',
      'shaken',
      'labels',
      'defined',
      'purpose',
      'meaning',
      'self',
      'belong',
    ],
    days: [
      {
        day: 1,
        title: 'When everything shakes',
        slug: 'identity-crisis-day-1',
      },
      {
        day: 2,
        title: 'The narrative breaks',
        slug: 'identity-crisis-day-2',
      },
      {
        day: 3,
        title: 'You are whose you are',
        slug: 'identity-crisis-day-3',
      },
      {
        day: 4,
        title: 'Living from identity',
        slug: 'identity-crisis-day-4',
      },
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
    pathway: 'Sleep',
    keywords: [
      'peace',
      'anxious',
      'anxiety',
      'control',
      'worry',
      'stressed',
      'overwhelmed',
      'restless',
      'fear',
      'panic',
    ],
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
    pathway: 'Shepherd',
    keywords: [
      'lonely',
      'alone',
      'isolated',
      'friends',
      'community',
      'church',
      'people',
      'relationships',
      'trust',
      'betrayed',
    ],
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
    pathway: 'Awake',
    keywords: [
      'politics',
      'government',
      'system',
      'searching',
      'looking',
      'refuge',
      'power',
      'kingdom',
      'world',
      'broken',
    ],
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
    pathway: 'Shepherd',
    keywords: [
      'money',
      'finances',
      'job',
      'work',
      'provide',
      'enough',
      'scarcity',
      'poor',
      'rich',
      'economy',
      'inflation',
    ],
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
    pathway: 'Awake',
    keywords: [
      'truth',
      'lies',
      'misinformation',
      'confused',
      'real',
      'fake',
      'trust',
      'media',
      'believe',
      'discern',
    ],
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
    pathway: 'Sleep',
    keywords: [
      'hope',
      'hopeless',
      'dark',
      'despair',
      'pessimistic',
      'depressed',
      'grief',
      'loss',
      'tired',
      'exhausted',
      'doubt',
    ],
    days: [
      { day: 1, title: 'Optimism is dead', slug: 'hope-day-1' },
      { day: 2, title: 'Grief is holy', slug: 'hope-day-2' },
      { day: 3, title: 'Hope enters darkness', slug: 'hope-day-3' },
      { day: 4, title: 'Practicing faithfulness', slug: 'hope-day-4' },
      { day: 5, title: 'Resurrection promise', slug: 'hope-day-5' },
    ],
  },

  // ============================================
  // 19 Substack Series
  // ============================================

  'too-busy-for-god': {
    title: 'Too Busy for God',
    question:
      "What are you so busy doing that you're missing the One who gave you life?",
    introduction:
      'Your calendar is full but your soul is empty. This series explores what happens when busyness becomes a barrier to the presence of God.',
    context:
      "You're productive, efficient, always moving. But somewhere along the way, you stopped making room for the One who actually matters.",
    framework: 'Luke 10:38-42 - Martha and Mary',
    pathway: 'Sleep',
    keywords: [
      'busy',
      'overwhelmed',
      'exhausted',
      'no time',
      'distracted',
      'hurry',
      'rest',
      'margin',
      'priorities',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `too-busy-for-god-day-${i + 1}`,
    })),
  },
  'hearing-god-in-the-noise': {
    title: 'Hearing God in the Noise',
    question:
      "How do you recognize Jesus' voice amid all the noise around you?",
    introduction:
      'The world is loud. Social media, news, opinions—everyone is shouting. This series helps you learn to hear the one voice that matters.',
    context:
      "You scroll, you listen, you absorb. But can you distinguish God's voice from the noise?",
    framework: 'John 10:27 - My sheep hear my voice',
    pathway: 'Sleep',
    keywords: [
      'distracted',
      'confused',
      'overwhelmed',
      'noise',
      'voices',
      'discernment',
      'listening',
      'quiet',
      'still',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `hearing-god-in-the-noise-day-${i + 1}`,
    })),
  },
  'abiding-in-his-presence': {
    title: 'Abiding in His Presence',
    question:
      "What's the difference between visiting God and dwelling with Him?",
    introduction:
      'Most of us visit God on Sundays or during crisis. This series explores what it means to actually dwell—to make your home in His presence.',
    context:
      "You check in with God but don't live with Him. You visit but don't dwell. What changes when you stop commuting to God and start residing?",
    framework: 'John 15:4 - Remain in me, as I also remain in you',
    pathway: 'Sleep',
    keywords: [
      'presence',
      'abiding',
      'dwelling',
      'intimacy',
      'connection',
      'communion',
      'relationship',
      'refuge',
      'rest',
      'stillness',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `abiding-in-his-presence-day-${i + 1}`,
    })),
  },
  'surrender-to-gods-will': {
    title: "Surrender to God's Will",
    question:
      "What does it truly mean to pray 'not my will, but yours be done'?",
    introduction:
      "Surrender sounds like defeat. But what if it's the only path to freedom? This series explores the radical act of releasing control to God.",
    context:
      'You plan, you strategize, you grip tightly. But the more you try to control your life, the more it slips away.',
    framework: 'Luke 22:42 - Not my will, but yours be done',
    pathway: 'Sleep',
    keywords: [
      'surrender',
      'control',
      'obedience',
      'will',
      'submission',
      'trust',
      'letting go',
      'freedom',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `surrender-to-gods-will-day-${i + 1}`,
    })),
  },
  'in-the-beginning-week-1': {
    title: 'In the Beginning',
    question:
      "How does God's creative word in Genesis connect to Christ as the living Word?",
    introduction:
      "Before anything existed, God spoke. This series traces the thread from creation's first word to the Word made flesh.",
    context:
      "The opening chapters of Genesis aren't just ancient history—they're the foundation for understanding who Christ is and why He came.",
    framework: 'Genesis 1:1 / John 1:1 - In the beginning',
    pathway: 'Awake',
    keywords: [
      'creation',
      'beginning',
      'origin',
      'purpose',
      'chaos',
      'order',
      'word',
      'genesis',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `in-the-beginning-week-1-day-${i + 1}`,
    })),
  },
  'what-is-the-gospel': {
    title: 'What is the Gospel?',
    question:
      "Why does the 'good news' begin so abruptly, and who are these first characters of faith?",
    introduction:
      "The word 'gospel' gets thrown around a lot. But what does it actually mean? This series goes back to the source.",
    context:
      "Mark's Gospel opens without preamble. No genealogy, no birth narrative. Just a voice in the wilderness and the beginning of the good news.",
    framework: 'Mark 1:1 - The beginning of the good news about Jesus',
    pathway: 'Awake',
    keywords: [
      'searching',
      'skeptical',
      'curious',
      'seeking',
      'questioning',
      'gospel',
      'good news',
      'basics',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `what-is-the-gospel-day-${i + 1}`,
    })),
  },
  'why-jesus': {
    title: 'Why Jesus?',
    question:
      'Why is Jesus necessary, and what makes Him different from every other religious figure?',
    introduction:
      'In a world of spiritual options, why does Jesus matter? This series explores the necessity of Christ and His unique claim on human history.',
    context:
      "You've heard of Jesus. Maybe you grew up with Him, maybe you didn't. But the question remains: why Him? Why not Buddha, or Muhammad, or just being a good person?",
    framework: 'Luke 2:10-11 - A Savior has been born to you',
    pathway: 'Awake',
    keywords: [
      'why Jesus',
      'is Jesus necessary',
      'savior',
      'messiah',
      'salvation',
      'purpose of Jesus',
      'who is Jesus',
      'why believe',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `why-jesus-day-${i + 1}`,
    })),
  },
  'what-does-it-mean-to-believe': {
    title: 'What Does It Mean to Believe?',
    question:
      'What is the difference between believing facts about Jesus and actually believing in Him?',
    introduction:
      "Belief isn't just intellectual agreement. This series explores what it means to move from knowing about Jesus to knowing Him.",
    context:
      'You can recite the facts. You know the story. But knowing about someone and actually trusting them are two different things.',
    framework: 'John 3:16 - For God so loved the world',
    pathway: 'Awake',
    keywords: [
      'doubt',
      'faith',
      'belief',
      'trust',
      'skepticism',
      'intellectual',
      'head vs heart',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `what-does-it-mean-to-believe-day-${i + 1}`,
    })),
  },
  'what-is-carrying-a-cross': {
    title: 'What Is Carrying a Cross?',
    question:
      'What does it actually cost to follow Jesus, and why would anyone choose to pay that price?',
    introduction:
      'Jesus said to pick up your cross. But what does that mean in a world where comfort is king? This series explores the real cost of discipleship.',
    context:
      "Following Jesus isn't a lifestyle upgrade. It's a death sentence to your old self. And somehow, it's the best news you've ever heard.",
    framework: 'Luke 9:23 - Take up your cross daily',
    pathway: 'Awake',
    keywords: [
      'sacrifice',
      'cost',
      'discipleship',
      'cross',
      'suffering',
      'commitment',
      'following Jesus',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `what-is-carrying-a-cross-day-${i + 1}`,
    })),
  },
  'once-saved-always-saved': {
    title: 'Once Saved, Always Saved?',
    question:
      'If salvation is by grace through faith, what role does ongoing faithfulness play?',
    introduction:
      'One of the most debated questions in Christianity. This series dives deep into what Scripture actually says about the security of salvation.',
    context:
      'Can you lose your salvation? Is it a one-time decision or an ongoing relationship? These questions matter because they shape how you live.',
    framework: 'Hebrews 6:4-6 / John 10:28-29',
    pathway: 'Awake',
    keywords: [
      'security',
      'salvation',
      'perseverance',
      'doubt',
      'faith',
      'backsliding',
      'eternal security',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `once-saved-always-saved-day-${i + 1}`,
    })),
  },
  'what-happens-when-you-repeatedly-sin': {
    title: 'What Happens When You Repeatedly Sin?',
    question:
      "Does repeatedly falling into the same sin mean you're not really saved?",
    introduction:
      'The cycle of sin, guilt, and shame can feel endless. This series explores what happens when you keep falling—and whether God keeps catching.',
    context:
      "You've confessed this sin a hundred times. You've promised to stop. You haven't. And now you're wondering if God is still listening.",
    framework: 'Romans 7:15-25 - The battle within',
    pathway: 'Awake',
    keywords: [
      'sin',
      'guilt',
      'shame',
      'addiction',
      'struggle',
      'repeated sin',
      'forgiveness',
      'grace',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `what-happens-when-you-repeatedly-sin-day-${i + 1}`,
    })),
  },
  'the-nature-of-belief': {
    title: 'The Nature of Belief',
    question:
      'How can you maintain consistent faith when facing difficult circumstances?',
    introduction:
      "Faith isn't the absence of doubt—it's trust in the middle of it. This series explores what belief looks like under pressure.",
    context:
      "Life happens. Pain, loss, unanswered prayers. And your faith gets tested. This series doesn't pretend that's easy.",
    framework: 'James 1:2-4 - Consider it pure joy',
    pathway: 'Awake',
    keywords: [
      'doubt',
      'faith',
      'trials',
      'testing',
      'wisdom',
      'perseverance',
      'suffering',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `the-nature-of-belief-day-${i + 1}`,
    })),
  },
  'the-work-of-god': {
    title: 'The Work of God',
    question:
      'What does it mean to be truly satisfied, and how does Jesus fulfill our deepest hunger?',
    introduction:
      "We work for satisfaction that never comes. This series explores Jesus' claim that He alone satisfies the deepest human hunger.",
    context:
      "You chase achievement, pleasure, recognition—and the hunger only grows. What if the thing you're starving for can't be earned?",
    framework: 'John 6:28-29 - This is the work of God: to believe',
    pathway: 'Awake',
    keywords: [
      'hunger',
      'satisfaction',
      'belief',
      'works',
      'grace',
      'striving',
      'enough',
    ],
    days: Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `the-work-of-god-day-${i + 1}`,
    })),
  },
  'the-word-before-words': {
    title: 'The Word Before Words',
    question:
      'What if the Gospel was not merely predicted in Genesis, but actively present from the very first verse?',
    introduction:
      'Before the prophets, before the Law, the Gospel was already being told. This series traces Christ through the opening chapters of Scripture.',
    context:
      "Most people start the Bible at Genesis 1. Few realize they're already reading about Jesus.",
    framework: 'John 1:1 - In the beginning was the Word',
    pathway: 'Awake',
    keywords: [
      'beginning',
      'creation',
      'purpose',
      'identity',
      'meaning',
      'word',
      'genesis',
      'christ in genesis',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `the-word-before-words-day-${i + 1}`,
    })),
  },
  'genesis-two-stories-of-creation': {
    title: 'Genesis: Two Stories of Creation?',
    question:
      'Are the two creation accounts in Genesis contradictory, or do they reveal complementary truths?',
    introduction:
      "Critics point to two creation accounts as proof of error. This series shows they're two lenses on the same magnificent truth.",
    context:
      'Genesis 1 and 2 tell different stories. Or do they? This series examines the apparent contradiction and finds purposeful design.',
    framework: 'Genesis 1-2',
    pathway: 'Awake',
    keywords: [
      'creation',
      'identity',
      'purpose',
      'image of God',
      'community',
      'genesis',
      'contradiction',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `genesis-two-stories-of-creation-day-${i + 1}`,
    })),
  },
  'the-blueprint-of-community': {
    title: 'The Blueprint of Community',
    question:
      'What does authentic Christian community look like, and how can we build it?',
    introduction:
      "The early church wasn't a weekly meeting—it was a way of life. This series explores the blueprint they left us.",
    context:
      "Church attendance is declining, but the hunger for genuine community is increasing. What if we've been doing church wrong?",
    framework: 'Acts 2:42-47 - They devoted themselves',
    pathway: 'Shepherd',
    keywords: [
      'lonely',
      'disconnected',
      'isolated',
      'community',
      'church',
      'fellowship',
      'belonging',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `the-blueprint-of-community-day-${i + 1}`,
    })),
  },
  'signs-boldness-opposition-integrity': {
    title: 'Signs, Boldness & Integrity',
    question:
      'What does it look like to follow the risen Christ publicly rather than privately?',
    introduction:
      'Faith behind closed doors is safe. But Jesus called His followers into the open. This series explores public faith in a hostile world.',
    context:
      "It's easier to be a Christian in private. But the early church didn't have that option. And neither do we.",
    framework: 'Acts 4:29-31 - Grant your servants boldness',
    pathway: 'Shepherd',
    keywords: [
      'boldness',
      'courage',
      'integrity',
      'honesty',
      'persecution',
      'public faith',
      'witness',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `signs-boldness-opposition-integrity-day-${i + 1}`,
    })),
  },
  'witness-under-pressure-expansion': {
    title: 'Witness Under Pressure',
    question:
      'What happens when following Jesus begins to cost something real?',
    introduction:
      'When faith gets uncomfortable, most people retreat. This series explores what happens when you stay faithful under pressure.',
    context:
      'The early church thrived under persecution. Not despite it—through it. What did they know that we forgot?',
    framework: 'Acts 5:41 - Rejoicing that they were counted worthy to suffer',
    pathway: 'Shepherd',
    keywords: [
      'persecution',
      'pressure',
      'cost',
      'witness',
      'expansion',
      'suffering',
      'faithfulness',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `witness-under-pressure-expansion-day-${i + 1}`,
    })),
  },

  // ============================================
  // New Series (Phase 1C — from docx sources)
  // ============================================

  anointed: {
    title: 'Anointed',
    question:
      'What does it mean to be chosen, set apart, and empowered by God?',
    introduction:
      "Anointing isn't a feeling—it's a calling. This 5-day series explores what it means to be chosen before you're ready, empowered beyond your ability, and sent into a world that needs what only God can give through you.",
    context:
      "David was anointed in a field while his brothers watched. The disciples were empowered in an upper room while the world slept. God's anointing doesn't follow human logic—it precedes human readiness.",
    framework: '1 Samuel 16:13 / Acts 1:8 - Anointed with purpose and power',
    pathway: 'Awake',
    keywords: [
      'anointing',
      'chosen',
      'purpose',
      'empowerment',
      'calling',
      'Holy Spirit',
      'set apart',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `anointed-day-${i + 1}`,
    })),
  },
  'coming-to-the-end-of-ourselves': {
    title: 'Coming to the End of Ourselves',
    question:
      'What happens when you reach the place where your own strength runs out?',
    introduction:
      'There is a strange grace at the end of yourself. When striving stops and surrender begins, something unexpected happens. This series explores the holy ground of human limitation—and the God who meets us there.',
    context:
      "Joni Eareckson Tada dove into shallow water at age 17 and became a quadriplegic. What looked like the end of everything became the beginning of a life she never imagined. Her story isn't unique—it's a pattern. God's deepest work begins where human capability ends.",
    framework: '2 Corinthians 12:9-10 - My grace is sufficient for you',
    pathway: 'Sleep',
    keywords: [
      'surrender',
      'weakness',
      'limitation',
      'grace',
      'suffering',
      'purpose',
      'letting go',
      'brokenness',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `coming-to-the-end-of-ourselves-day-${i + 1}`,
    })),
  },
  valued: {
    title: 'Valued',
    question:
      'Where does your worth come from when the world says you have none?',
    introduction:
      "Nick Vujicic was born without arms or legs. The world said he was broken. God said he was beloved. This 5-day series explores the radical claim that your value isn't earned, achieved, or measured—it's given.",
    context:
      'In a culture that measures worth by productivity, appearance, and achievement, the gospel makes an outrageous claim: you are valuable simply because you exist. Not because of what you do, but because of whose you are.',
    framework: 'Psalm 139:14 - Fearfully and wonderfully made',
    pathway: 'Sleep',
    keywords: [
      'worth',
      'value',
      'identity',
      'self-worth',
      'image of God',
      'beloved',
      'enough',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `valued-day-${i + 1}`,
    })),
  },
  rooted: {
    title: 'Rooted',
    question:
      'How do you hold onto faith when everything around you is trying to tear it out?',
    introduction:
      "During the Rwandan genocide, Immaculee Ilibagiza spent 91 days hiding in a tiny bathroom with seven other women. In that darkness, she discovered a faith so deep that even genocide couldn't uproot it. This series explores what it means to be rooted in something the world cannot destroy.",
    context:
      "Faith under extreme pressure either deepens or dies. There is no middle ground. This series walks through the reality of what it takes to stay rooted when the storm isn't metaphorical—it's your life.",
    framework: 'Colossians 2:6-7 - Rooted and built up in Him',
    pathway: 'Awake',
    keywords: [
      'faith',
      'roots',
      'perseverance',
      'suffering',
      'resilience',
      'foundation',
      'unshakeable',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `rooted-day-${i + 1}`,
    })),
  },
  'present-in-the-chaos': {
    title: 'Present in the Chaos',
    question:
      "How do you find God's presence when your life is moving too fast to stop?",
    introduction:
      'Chad Reynolds built a company, gained everything the world promises, and found himself emptier than when he started. This series explores the radical invitation to find God not after the chaos settles, but right in the middle of it.',
    context:
      "Busyness isn't just a schedule problem—it's a spiritual crisis. When your calendar is your identity and your inbox is your altar, something sacred gets lost. This series is for anyone running too fast to notice they're running from God.",
    framework: 'Psalm 46:10 - Be still, and know that I am God',
    pathway: 'Sleep',
    keywords: [
      'busyness',
      'presence',
      'stillness',
      'chaos',
      'overwhelmed',
      'rest',
      'peace',
      'burnout',
    ],
    days: Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `present-in-the-chaos-day-${i + 1}`,
    })),
  },
  'standing-strong': {
    title: 'Standing Strong',
    question:
      'How do you move from doubt to unshakeable faith in a world that constantly tests your convictions?',
    introduction:
      "Standing strong isn't about never wavering—it's about knowing where to plant your feet when the ground shakes. This 7-day series traces the journey from doubt to deep, tested conviction through the lens of Philippians and the story of Sarah Chen.",
    context:
      "Sarah Chen was a neuroscientist who thought faith was for people who couldn't think clearly. Then her research led her somewhere she never expected. This series follows her journey alongside Paul's letter to the Philippians—two stories of conviction forged under pressure.",
    framework: 'Philippians 4:13 - I can do all things through Christ',
    pathway: 'Awake',
    keywords: [
      'doubt',
      'conviction',
      'strength',
      'Philippians',
      'endurance',
      'faith',
      'perseverance',
      'standing firm',
    ],
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      slug: `standing-strong-day-${i + 1}`,
    })),
  },

  // ============================================
  // Phase 1D: Drew's Devotional Rewrite
  // ============================================

  'what-is-christianity': {
    title: 'What is Christianity?',
    question:
      'What is Christianity when you strip away the bumper stickers, the politics, and the performance?',
    introduction:
      "Most people have opinions about Christianity. Fewer have asked what it actually claims. This 5-day series goes back to the source — Paul's letter to the Galatians — and asks the question most churches skip: is Christianity news about what God has done, or advice about what you should do? The answer changes everything.",
    context:
      "Through the story of Dennis Quaid — an actor whose inherited Baptist faith collapsed under Hollywood's weight, whose cocaine addiction exposed the emptiness beneath success, and whose slow return to faith defied every neat conversion narrative — we trace Paul's argument that Christianity is not a performance system. It is an announcement. And the freedom it offers is stranger, messier, and more durable than religion.",
    framework:
      'Galatians 1-5 — From counterfeit gospels through justification by faith to the freedom of the Spirit',
    pathway: 'Sleep',
    keywords: [
      'christianity',
      'gospel',
      'grace',
      'freedom',
      'performance',
      'doubt',
      'skepticism',
      'Galatians',
      'Dennis Quaid',
      'addiction',
      'recovery',
    ],
    days: [
      {
        day: 1,
        title: "The Question Everyone's Afraid to Ask",
        slug: 'what-is-christianity-day-1',
      },
      {
        day: 2,
        title: 'When Religion Becomes a Cage',
        slug: 'what-is-christianity-day-2',
      },
      {
        day: 3,
        title: "The God Who Doesn't Need Your Resume",
        slug: 'what-is-christianity-day-3',
      },
      {
        day: 4,
        title: 'Free, Not Fixed',
        slug: 'what-is-christianity-day-4',
      },
      {
        day: 5,
        title: 'A Faith Worth Having',
        slug: 'what-is-christianity-day-5',
      },
    ],
  },
}

// ============================================
// Series ordering and grouping
// ============================================

// Original 7 Wake-Up series
export const WAKEUP_SERIES_ORDER = [
  'identity',
  'peace',
  'community',
  'kingdom',
  'provision',
  'truth',
  'hope',
] as const

// All 18 Substack series
export const SUBSTACK_SERIES_ORDER = [
  'too-busy-for-god',
  'hearing-god-in-the-noise',
  'abiding-in-his-presence',
  'surrender-to-gods-will',
  'in-the-beginning-week-1',
  'what-is-the-gospel',
  'why-jesus',
  'what-does-it-mean-to-believe',
  'what-is-carrying-a-cross',
  'once-saved-always-saved',
  'what-happens-when-you-repeatedly-sin',
  'the-nature-of-belief',
  'the-work-of-god',
  'the-word-before-words',
  'genesis-two-stories-of-creation',
  'the-blueprint-of-community',
  'signs-boldness-opposition-integrity',
  'witness-under-pressure-expansion',
] as const

// New series (from docx sources, Phase 1C)
export const NEW_SERIES_ORDER = [
  'anointed',
  'coming-to-the-end-of-ourselves',
  'valued',
  'rooted',
  'present-in-the-chaos',
  'standing-strong',
  'what-is-christianity',
] as const

// All 32 series combined (7 Wake-Up + 18 Substack + 7 new)
export const ALL_SERIES_ORDER = [
  ...WAKEUP_SERIES_ORDER,
  ...SUBSTACK_SERIES_ORDER,
  ...NEW_SERIES_ORDER,
] as const

// Backward compat: SERIES_ORDER = original 7
export const SERIES_ORDER = ALL_SERIES_ORDER

// Landing page compatible format (original 7)
export const DEVOTIONAL_SERIES = WAKEUP_SERIES_ORDER.map((slug, i) => ({
  number: String(i + 1).padStart(2, '0'),
  slug,
  theme: SERIES_DATA[slug].title,
  question: SERIES_DATA[slug].question,
  isCenter: slug === 'kingdom',
}))

// Featured series for landing page (curated selection)
export const FEATURED_SERIES = [
  'identity',
  'too-busy-for-god',
  'why-jesus',
  'hope',
] as const
