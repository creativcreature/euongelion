// Soul Audit Questions
// 24 questions across 6 categories to determine spiritual pathway

export type Category =
  | 'faith-foundation'
  | 'spiritual-practices'
  | 'biblical-knowledge'
  | 'life-application'
  | 'community-engagement'
  | 'growth-desire'

export type Pathway = 'sleep' | 'awake' | 'shepherd'

export interface Question {
  id: string
  category: Category
  text: string
  options: {
    text: string
    pathway: Pathway
    weight: number
  }[]
}

export interface CategoryInfo {
  id: Category
  name: string
  description: string
}

export const categories: CategoryInfo[] = [
  {
    id: 'faith-foundation',
    name: 'Faith Foundation',
    description: 'Your relationship with God and understanding of the Gospel',
  },
  {
    id: 'spiritual-practices',
    name: 'Spiritual Practices',
    description: 'Your habits of prayer, worship, and spiritual disciplines',
  },
  {
    id: 'biblical-knowledge',
    name: 'Biblical Knowledge',
    description: 'Your familiarity with Scripture and theological concepts',
  },
  {
    id: 'life-application',
    name: 'Life Application',
    description: 'How faith shapes your daily decisions and relationships',
  },
  {
    id: 'community-engagement',
    name: 'Community',
    description: 'Your involvement in Christian community and service',
  },
  {
    id: 'growth-desire',
    name: 'Growth Desire',
    description: 'Your appetite for deeper spiritual understanding',
  },
]

export const questions: Question[] = [
  // Faith Foundation (4 questions)
  {
    id: 'ff-1',
    category: 'faith-foundation',
    text: 'How would you describe your current relationship with God?',
    options: [
      { text: "I'm curious but not sure what I believe", pathway: 'sleep', weight: 1 },
      { text: 'I believe in God and want to grow closer', pathway: 'awake', weight: 1 },
      { text: 'I have a deep, personal relationship with Christ', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ff-2',
    category: 'faith-foundation',
    text: 'When you think about the Gospel, what comes to mind?',
    options: [
      { text: "I'm not entirely sure what that means", pathway: 'sleep', weight: 1 },
      { text: 'Jesus died for my sins so I can be forgiven', pathway: 'awake', weight: 1 },
      { text: 'The full story of creation, fall, redemption, and restoration', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ff-3',
    category: 'faith-foundation',
    text: 'How certain are you about your salvation?',
    options: [
      { text: "I don't think about it much or I'm unsure", pathway: 'sleep', weight: 1 },
      { text: 'I believe I am saved but sometimes have doubts', pathway: 'awake', weight: 1 },
      { text: 'I have assurance rooted in Scripture and the Spirit', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ff-4',
    category: 'faith-foundation',
    text: 'What drew you to explore faith or spirituality?',
    options: [
      { text: 'A life event, crisis, or searching for meaning', pathway: 'sleep', weight: 1 },
      { text: 'Growing up in faith or a desire to understand more', pathway: 'awake', weight: 1 },
      { text: 'A calling to go deeper and help others grow', pathway: 'shepherd', weight: 1 },
    ],
  },

  // Spiritual Practices (4 questions)
  {
    id: 'sp-1',
    category: 'spiritual-practices',
    text: 'How often do you pray?',
    options: [
      { text: 'Rarely or only in crisis moments', pathway: 'sleep', weight: 1 },
      { text: 'Regularly, though not always consistently', pathway: 'awake', weight: 1 },
      { text: 'Daily, as a natural part of my relationship with God', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'sp-2',
    category: 'spiritual-practices',
    text: 'How would you describe your Bible reading habits?',
    options: [
      { text: "I rarely read the Bible or don't know where to start", pathway: 'sleep', weight: 1 },
      { text: 'I read occasionally or follow a devotional', pathway: 'awake', weight: 1 },
      { text: 'I study Scripture regularly and dig into original meanings', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'sp-3',
    category: 'spiritual-practices',
    text: 'When was the last time you fasted or practiced a spiritual discipline?',
    options: [
      { text: "I haven't or I'm not sure what that means", pathway: 'sleep', weight: 1 },
      { text: "I've tried it a few times", pathway: 'awake', weight: 1 },
      { text: 'I regularly practice fasting, solitude, or other disciplines', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'sp-4',
    category: 'spiritual-practices',
    text: 'How do you typically worship?',
    options: [
      { text: "I'm not sure how to worship or what it looks like", pathway: 'sleep', weight: 1 },
      { text: 'Mostly through music at church or personal moments', pathway: 'awake', weight: 1 },
      { text: 'Worship flows through all areas of my life', pathway: 'shepherd', weight: 1 },
    ],
  },

  // Biblical Knowledge (4 questions)
  {
    id: 'bk-1',
    category: 'biblical-knowledge',
    text: 'How familiar are you with the structure of the Bible?',
    options: [
      { text: "I know it has two parts but couldn't name many books", pathway: 'sleep', weight: 1 },
      { text: 'I know the major sections and can find key passages', pathway: 'awake', weight: 1 },
      { text: 'I understand the overarching narrative and how books connect', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'bk-2',
    category: 'biblical-knowledge',
    text: 'When you encounter a theological term (like "justification" or "sanctification"), how do you respond?',
    options: [
      { text: 'I usually skip over it or feel confused', pathway: 'sleep', weight: 1 },
      { text: 'I have a basic understanding of common terms', pathway: 'awake', weight: 1 },
      { text: 'I can explain these concepts and their biblical basis', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'bk-3',
    category: 'biblical-knowledge',
    text: 'How would you describe your understanding of church history?',
    options: [
      { text: "I don't know much about it", pathway: 'sleep', weight: 1 },
      { text: 'I know the basics (Reformation, major figures)', pathway: 'awake', weight: 1 },
      { text: 'I can trace theological developments through history', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'bk-4',
    category: 'biblical-knowledge',
    text: 'Can you explain the Gospel to someone who has never heard it?',
    options: [
      { text: "I wouldn't know where to start", pathway: 'sleep', weight: 1 },
      { text: 'I could share the basics of what Jesus did', pathway: 'awake', weight: 1 },
      { text: 'I can articulate the Gospel clearly and answer questions', pathway: 'shepherd', weight: 1 },
    ],
  },

  // Life Application (4 questions)
  {
    id: 'la-1',
    category: 'life-application',
    text: 'How does your faith influence your daily decisions?',
    options: [
      { text: "I don't think about faith in everyday choices", pathway: 'sleep', weight: 1 },
      { text: 'I try to make choices that honor God', pathway: 'awake', weight: 1 },
      { text: 'Every decision is filtered through my relationship with Christ', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'la-2',
    category: 'life-application',
    text: 'When you face a difficult situation, what is your first response?',
    options: [
      { text: 'Worry, stress, or trying to fix it myself', pathway: 'sleep', weight: 1 },
      { text: 'I eventually turn to prayer after trying other things', pathway: 'awake', weight: 1 },
      { text: 'Prayer and seeking God\'s wisdom is my first instinct', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'la-3',
    category: 'life-application',
    text: 'How do you handle conflict in relationships?',
    options: [
      { text: 'I avoid it or react emotionally', pathway: 'sleep', weight: 1 },
      { text: 'I try to resolve it but struggle with forgiveness', pathway: 'awake', weight: 1 },
      { text: 'I seek reconciliation and extend grace as Christ does', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'la-4',
    category: 'life-application',
    text: 'How do you view your work or vocation?',
    options: [
      { text: 'As separate from my spiritual life', pathway: 'sleep', weight: 1 },
      { text: 'As a place where I can be a good witness', pathway: 'awake', weight: 1 },
      { text: 'As a calling where I serve God and others', pathway: 'shepherd', weight: 1 },
    ],
  },

  // Community Engagement (4 questions)
  {
    id: 'ce-1',
    category: 'community-engagement',
    text: 'How connected are you to a local church?',
    options: [
      { text: "I don't attend or attend very occasionally", pathway: 'sleep', weight: 1 },
      { text: 'I attend regularly but am not deeply involved', pathway: 'awake', weight: 1 },
      { text: 'I am actively serving and invested in my church community', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ce-2',
    category: 'community-engagement',
    text: 'Do you have relationships where you discuss faith openly?',
    options: [
      { text: 'No, I keep faith private', pathway: 'sleep', weight: 1 },
      { text: 'A few close friends or family', pathway: 'awake', weight: 1 },
      { text: "Yes, I'm part of a small group or I disciple others", pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ce-3',
    category: 'community-engagement',
    text: 'How often do you share your faith with others?',
    options: [
      { text: 'Never or very rarely', pathway: 'sleep', weight: 1 },
      { text: 'When it comes up naturally in conversation', pathway: 'awake', weight: 1 },
      { text: 'Regularly—I look for opportunities to share', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'ce-4',
    category: 'community-engagement',
    text: 'Have you ever mentored or been mentored spiritually?',
    options: [
      { text: 'No, I haven\'t experienced that', pathway: 'sleep', weight: 1 },
      { text: "I've been mentored or am seeking that", pathway: 'awake', weight: 1 },
      { text: 'I actively mentor others in their faith journey', pathway: 'shepherd', weight: 1 },
    ],
  },

  // Growth Desire (4 questions)
  {
    id: 'gd-1',
    category: 'growth-desire',
    text: 'What best describes your appetite for spiritual growth?',
    options: [
      { text: "I'm open but not actively pursuing it", pathway: 'sleep', weight: 1 },
      { text: 'I want to grow and am taking steps', pathway: 'awake', weight: 1 },
      { text: 'I hunger for deeper understanding and transformation', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'gd-2',
    category: 'growth-desire',
    text: 'How do you respond to challenging teachings in Scripture?',
    options: [
      { text: 'I tend to skip over what I don\'t understand', pathway: 'sleep', weight: 1 },
      { text: 'I wrestle with them and seek to understand', pathway: 'awake', weight: 1 },
      { text: 'I dig deep, study context, and let Scripture shape me', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'gd-3',
    category: 'growth-desire',
    text: 'What kind of content do you prefer for spiritual growth?',
    options: [
      { text: 'Simple, practical, easy to understand', pathway: 'sleep', weight: 1 },
      { text: 'Balanced—some depth with clear application', pathway: 'awake', weight: 1 },
      { text: 'Deep theological content that challenges me', pathway: 'shepherd', weight: 1 },
    ],
  },
  {
    id: 'gd-4',
    category: 'growth-desire',
    text: 'Where do you see yourself spiritually in one year?',
    options: [
      { text: 'I hope to have a clearer understanding of faith', pathway: 'sleep', weight: 1 },
      { text: 'Growing in my walk and serving in some capacity', pathway: 'awake', weight: 1 },
      { text: 'Equipped to teach, lead, or disciple others', pathway: 'shepherd', weight: 1 },
    ],
  },
]

// Calculate pathway from responses
export function calculatePathway(responses: Record<string, Pathway>): {
  pathway: Pathway
  scores: Record<Pathway, number>
  breakdown: Record<Category, Pathway>
} {
  const scores: Record<Pathway, number> = { sleep: 0, awake: 0, shepherd: 0 }
  const categoryResponses: Record<Category, Pathway[]> = {
    'faith-foundation': [],
    'spiritual-practices': [],
    'biblical-knowledge': [],
    'life-application': [],
    'community-engagement': [],
    'growth-desire': [],
  }

  // Tally scores
  for (const [questionId, pathway] of Object.entries(responses)) {
    scores[pathway]++
    const question = questions.find((q) => q.id === questionId)
    if (question) {
      categoryResponses[question.category].push(pathway)
    }
  }

  // Determine dominant pathway per category
  const breakdown: Record<Category, Pathway> = {} as Record<Category, Pathway>
  for (const [category, pathways] of Object.entries(categoryResponses)) {
    const categoryScores: Record<Pathway, number> = { sleep: 0, awake: 0, shepherd: 0 }
    pathways.forEach((p) => categoryScores[p]++)
    breakdown[category as Category] = (Object.entries(categoryScores) as [Pathway, number][])
      .sort((a, b) => b[1] - a[1])[0][0]
  }

  // Determine overall pathway
  const pathway = (Object.entries(scores) as [Pathway, number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  return { pathway, scores, breakdown }
}

// Get recommended series based on pathway
export function getRecommendedSeries(pathway: Pathway): string[] {
  const recommendations: Record<Pathway, string[]> = {
    sleep: [
      'what-is-the-gospel',
      'why-jesus',
      'in-the-beginning',
      'what-does-it-mean-to-believe',
    ],
    awake: [
      'hearing-god-in-the-noise',
      'abiding-in-his-presence',
      'surrender-to-gods-will',
      'too-busy-for-god',
    ],
    shepherd: [
      'the-nature-of-belief',
      'the-work-of-god',
      'the-blueprint-of-community',
      'the-word-before-words',
    ],
  }
  return recommendations[pathway]
}
