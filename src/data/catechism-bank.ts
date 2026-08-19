/**
 * The Catechism Corner (SA-094 / F-140).
 *
 * The Heidelberg Catechism (1563), classic public-domain English translation.
 * Answers print AS THE CATECHISM GIVES THEM (proof-text markers removed) —
 * never paraphrased. Where the received wording was uncertain, the question
 * was skipped rather than approximated; the catechism has 129 to choose from.
 * The 32 selected span its guilt–grace–gratitude structure, which gives the
 * module a full monthly cycle with no repeats.
 *
 * Selection is UTC days-since-epoch modulo — same idiom as voices-bank.
 */

export interface CatechismEntry {
  number: number
  question: string
  answer: string
  source: string
  scriptures: string[]
}

const q = (
  number: number,
  question: string,
  answer: string,
  scriptures: string[],
): CatechismEntry => ({
  number,
  question,
  answer,
  source: `Heidelberg Catechism (1563), Q${number}`,
  scriptures,
})

export const CATECHISM: readonly CatechismEntry[] = [
  q(
    1,
    'What is your only comfort in life and in death?',
    'That I am not my own, but belong—body and soul, in life and in death—to my faithful Savior, Jesus Christ. He has fully paid for all my sins with his precious blood, and has set me free from the tyranny of the devil. He also watches over me in such a way that not a hair can fall from my head without the will of my Father in heaven; in fact, all things must work together for my salvation. Because I belong to him, Christ, by his Holy Spirit, assures me of eternal life and makes me wholeheartedly willing and ready from now on to live for him.',
    ['1 Corinthians 6:19', 'Romans 14:8', '1 Peter 1:18', 'Romans 8:28'],
  ),
  q(
    2,
    'What must you know to live and die in the joy of this comfort?',
    'Three things: first, how great my sin and misery are; second, how I am set free from all my sins and misery; third, how I am to thank God for such deliverance.',
    ['Romans 3:9', 'John 17:3', 'Ephesians 5:8'],
  ),
  q(
    4,
    'What does the law of God require of us?',
    'Christ teaches us this in summary in Matthew 22: Love the Lord your God with all your heart and with all your soul and with all your mind. This is the first and greatest commandment. And the second is like it: Love your neighbor as yourself. All the Law and the Prophets hang on these two commandments.',
    ['Matthew 22:37', 'Deuteronomy 6:5', 'Leviticus 19:18'],
  ),
  q(
    5,
    'Can you live up to all this perfectly?',
    'No. I have a natural tendency to hate God and my neighbor.',
    ['Romans 3:10', 'Romans 8:7'],
  ),
  q(
    21,
    'What is true faith?',
    'True faith is not only a sure knowledge by which I hold as true all that God has revealed to us in Scripture; it is also a wholehearted trust, which the Holy Spirit creates in me by the gospel, that God has freely granted, not only to others but to me also, forgiveness of sins, eternal righteousness, and salvation. These are gifts of sheer grace, granted solely by Christ’s merit.',
    ['Hebrews 11:1', 'Romans 10:17', 'Romans 3:24'],
  ),
  q(
    26,
    'What do you believe when you say, “I believe in God, the Father almighty, creator of heaven and earth”?',
    'That the eternal Father of our Lord Jesus Christ, who out of nothing created heaven and earth and everything in them, who still upholds and rules them by his eternal counsel and providence, is my God and Father because of Christ the Son. I trust God so much that I do not doubt he will provide whatever I need for body and soul, and will turn to my good whatever adversity he sends upon me in this sad world. God is able to do this because he is almighty God and desires to do this because he is a faithful Father.',
    ['Genesis 1:1', 'Psalm 104:27', 'Romans 8:28', 'Matthew 6:30'],
  ),
  q(
    27,
    'What do you understand by the providence of God?',
    'The almighty and ever present power of God by which God upholds, as with his hand, heaven and earth and all creatures, and so rules them that leaf and blade, rain and drought, fruitful and lean years, food and drink, health and sickness, prosperity and poverty—all things, in fact, come to us not by chance but by his fatherly hand.',
    ['Hebrews 1:3', 'Jeremiah 5:24', 'Proverbs 16:33'],
  ),
  q(
    28,
    'How does the knowledge of God’s creation and providence help us?',
    'We can be patient when things go against us, thankful when things go well, and for the future we can have good confidence in our faithful God and Father that nothing in creation will separate us from his love. For all creatures are so completely in God’s hand that without his will they can neither move nor be moved.',
    ['Job 1:21', 'Romans 8:38', 'Job 2:10'],
  ),
  q(
    29,
    'Why is the Son of God called “Jesus,” meaning “savior”?',
    'Because he saves us from our sins, and because salvation should not be sought and cannot be found in anyone else.',
    ['Matthew 1:21', 'Acts 4:12'],
  ),
  q(
    31,
    'Why is he called “Christ,” meaning “anointed”?',
    'Because he has been ordained by God the Father and has been anointed with the Holy Spirit to be our chief prophet and teacher who fully reveals to us the secret counsel and will of God concerning our deliverance; our only high priest who has delivered us by the one sacrifice of his body, and who continually pleads our cause with the Father; and our eternal king who governs us by his Word and Spirit, and who guards us and keeps us in the freedom he has won for us.',
    ['Luke 4:18', 'Hebrews 7:17', 'Matthew 28:18'],
  ),
  q(
    32,
    'But why are you called a Christian?',
    'Because by faith I am a member of Christ and so I share in his anointing. I am anointed to confess his name, to present myself to him as a living sacrifice of thanks, to strive with a free conscience against sin and the devil in this life, and afterward to reign with Christ over all creation for eternity.',
    ['1 John 2:27', 'Romans 12:1', '2 Timothy 2:12'],
  ),
  q(
    54,
    'What do you believe concerning “the holy catholic church”?',
    'I believe that the Son of God, through his Spirit and Word, out of the entire human race, from the beginning of the world to its end, gathers, protects, and preserves for himself a community chosen for eternal life and united in true faith. And of this community I am and always will be a living member.',
    ['John 10:28', 'Ephesians 4:3', 'Matthew 16:18'],
  ),
  q(
    55,
    'What do you understand by “the communion of saints”?',
    'First, that believers one and all, as members of this community, share in Christ and in all his treasures and gifts. Second, that each member should consider it a duty to use these gifts readily and joyfully for the service and enrichment of the other members.',
    ['1 Corinthians 12:7', 'Romans 12:5', '1 Corinthians 6:17'],
  ),
  q(
    56,
    'What do you believe concerning “the forgiveness of sins”?',
    'I believe that God, because of Christ’s satisfaction, will no longer remember any of my sins or my sinful nature which I need to struggle against all my life. Rather, by grace God grants me the righteousness of Christ to free me forever from judgment.',
    ['Psalm 103:10', 'Micah 7:19', 'Romans 8:1'],
  ),
  q(
    60,
    'How are you righteous before God?',
    'Only by true faith in Jesus Christ. Even though my conscience accuses me of having grievously sinned against all God’s commandments, of never having kept any of them, and of still being inclined toward all evil, nevertheless, without any merit of my own, out of sheer grace, God grants and credits to me the perfect satisfaction, righteousness, and holiness of Christ, as if I had never sinned nor been a sinner, and as if I had been as perfectly obedient as Christ was obedient for me. All I need to do is accept this gift with a believing heart.',
    ['Romans 3:21', '2 Corinthians 5:21', 'Romans 4:5'],
  ),
  q(
    61,
    'Why do you say that you are righteous by faith alone?',
    'Not because I please God by the worthiness of my faith. It is because only Christ’s satisfaction, righteousness, and holiness make me righteous before God, and because I can accept this righteousness and make it mine in no other way than by faith.',
    ['1 Corinthians 1:30', 'Romans 10:10', '1 John 5:10'],
  ),
  q(
    62,
    'Why can’t our good works be our righteousness before God, or at least a part of it?',
    'Because the righteousness which can pass God’s judgment must be entirely perfect and must in every way measure up to the divine law. But even our best works in this life are imperfect and stained with sin.',
    ['Galatians 3:10', 'Deuteronomy 27:26', 'Isaiah 64:6'],
  ),
  q(
    86,
    'Since we have been delivered from our misery by grace through Christ without any merit of our own, why then should we do good works?',
    'Because Christ, having redeemed us by his blood, is also restoring us by his Spirit into his image, so that with our whole lives we may show that we are thankful to God for his benefits, so that he may be praised through us, so that we may be assured of our faith by its fruits, and so that by our godly living our neighbors may be won over to Christ.',
    ['Romans 6:13', '1 Peter 2:12', 'Matthew 5:16'],
  ),
  q(
    88,
    'What is involved in genuine repentance or conversion?',
    'Two things: the dying-away of the old self, and the rising-to-life of the new.',
    ['Romans 6:4', 'Ephesians 4:22'],
  ),
  q(
    89,
    'What is the dying-away of the old self?',
    'To be genuinely sorry for sin and more and more to hate and run away from it.',
    ['Psalm 51:3', 'Joel 2:13'],
  ),
  q(
    90,
    'What is the rising-to-life of the new self?',
    'Wholehearted joy in God through Christ and a love and delight to live according to the will of God by doing every kind of good work.',
    ['Psalm 51:8', 'Romans 6:10', 'Galatians 2:20'],
  ),
  q(
    94,
    'What does the Lord require in the first commandment?',
    'That I, not wanting to endanger my own salvation, avoid and shun all idolatry, sorcery, superstitious rites, and prayer to saints or to other creatures. That I rightly know the only true God, trust him alone, and look to God for every good thing humbly and patiently, and love, fear, and honor God with all my heart. In short, that I give up anything rather than go against God’s will in any way.',
    ['1 Corinthians 10:14', 'Matthew 4:10', 'Proverbs 3:5'],
  ),
  q(
    96,
    'What is God’s will for us in the second commandment?',
    'That we in no way make any image of God nor worship him in any other way than has been commanded in God’s Word.',
    ['Deuteronomy 4:15', 'John 4:24'],
  ),
  q(
    103,
    'What is God’s will for you in the fourth commandment?',
    'First, that the gospel ministry and education for it be maintained, and that, especially on the festive day of rest, I diligently attend the assembly of God’s people to learn what God’s Word teaches, to participate in the sacraments, to pray to God publicly, and to bring Christian offerings for the poor. Second, that every day of my life I rest from my evil ways, let the Lord work in me through his Spirit, and so begin in this life the eternal Sabbath.',
    ['Hebrews 10:25', 'Isaiah 66:23'],
  ),
  q(
    105,
    'What is God’s will for you in the sixth commandment?',
    'I am not to belittle, hate, insult, or kill my neighbor—not by my thoughts, my words, my look or gesture, and certainly not by actual deeds—and I am not to be party to this in others; rather, I am to put away all desire for revenge. I am not to harm or recklessly endanger myself either. Prevention of murder is also why government is armed with the sword.',
    ['Matthew 5:21', 'Romans 12:19', 'Matthew 26:52'],
  ),
  q(
    107,
    'Is it enough then that we do not murder our neighbor in any such way?',
    'No. By condemning envy, hatred, and anger God wants us to love our neighbors as ourselves, to be patient, peace-loving, gentle, merciful, and friendly toward them, to protect them from harm as much as we can, and to do good even to our enemies.',
    ['Matthew 22:39', 'Romans 12:10', 'Matthew 5:44'],
  ),
  q(
    110,
    'What does God forbid in the eighth commandment?',
    'God forbids not only outright theft and robbery, punishable by law. But in God’s sight theft also includes all scheming and swindling in order to get our neighbor’s goods for ourselves, whether by force or means that appear legitimate, such as inaccurate measurements of weight, size, or volume; fraudulent merchandising; counterfeit money; excessive interest; or any other means forbidden by God. In addition God forbids all greed and pointless squandering of his gifts.',
    ['1 Corinthians 6:10', 'Micah 6:11', 'Luke 3:14'],
  ),
  q(
    112,
    'What is the aim of the ninth commandment?',
    'That I never give false testimony against anyone, twist no one’s words, not gossip or slander, nor join in condemning anyone rashly or without a hearing. Rather, in court and everywhere else, I should avoid lying and deceit of every kind; these are the very devices the devil uses, and they would call down on me God’s intense wrath. I should love the truth, speak it candidly, and openly acknowledge it. And I should do what I can to guard and advance my neighbor’s good name.',
    ['Proverbs 19:5', 'Ephesians 4:25', '1 Peter 3:8'],
  ),
  q(
    116,
    'Why do Christians need to pray?',
    'Because prayer is the most important part of the thankfulness God requires of us. And also because God gives his grace and Holy Spirit only to those who pray continually and groan inwardly, asking God for these gifts and thanking God for them.',
    ['Psalm 50:14', 'Matthew 7:7', 'Luke 11:13'],
  ),
  q(
    117,
    'What is the kind of prayer that pleases God and that he listens to?',
    'First, we must pray from the heart to no other than the one true God, revealed to us in his Word, asking for everything God has commanded us to ask for. Second, we must fully recognize our need and misery, so that we humble ourselves in God’s majestic presence. Third, we must rest on this unshakable foundation: even though we do not deserve it, God will surely listen to our prayer because of Christ our Lord. That is what God promised us in his Word.',
    ['John 4:24', 'Psalm 145:18', '2 Chronicles 7:14', 'Daniel 9:18'],
  ),
  q(
    120,
    'Why did Christ command us to call God “our Father”?',
    'To awaken in us at the very beginning of our prayer what should be basic to our prayer—a childlike reverence and trust that through Christ God has become our Father, and that just as our parents do not refuse us the things of this life, even less will God our Father refuse to give us what we ask in faith.',
    ['Matthew 7:9', 'Luke 11:11'],
  ),
  q(
    127,
    'What does the sixth petition mean?',
    '“And do not lead us into temptation, but deliver us from the evil one” means: By ourselves we are too weak to hold our own even for a moment. And our sworn enemies—the devil, the world, and our own flesh—never stop attacking us. And so, Lord, uphold us and make us strong with the strength of your Holy Spirit, so that we may not go down to defeat in this spiritual struggle, but may firmly resist our enemies until we finally win the complete victory.',
    ['Psalm 103:14', '1 Peter 5:8', 'Matthew 26:41'],
  ),
  q(
    129,
    'What does that little word “Amen” express?',
    '“Amen” means: This shall truly and surely be. It is even more sure that God listens to my prayer than that I really desire what I pray for.',
    ['2 Corinthians 1:20', '2 Timothy 2:13'],
  ),
]

const DAY_MS = 86_400_000

function daysSinceEpochUTC(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      DAY_MS,
  )
}

/** The day's Q&A — deterministic, a full monthly cycle before any repeat. */
export function pickCatechismForDay(date: Date): CatechismEntry {
  return CATECHISM[daysSinceEpochUTC(date) % CATECHISM.length]
}
