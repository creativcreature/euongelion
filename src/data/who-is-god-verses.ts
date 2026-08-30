// Verbatim BSB verse bank for /who-is-god narrative sections.
// Extracted from public/bibles/BSB — do not hand-edit the text.
import type { Verse } from './who-is-god-names'

// NOTE: deliberately NOT annotated `Record<string, Verse>`. Letting TypeScript
// infer the literal key union is what makes `k="..."` in <Scripture> a
// compile-time error when the key is absent — a missing key previously only
// surfaced as a prerender crash during `next build`.
export const V = {
  gen1_1: {
    ref: 'Genesis 1:1',
    text: 'In the beginning God created the heavens and the earth.',
  },
  gen1_2: {
    ref: 'Genesis 1:2',
    text: 'Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters.',
  },
  gen1_3: {
    ref: 'Genesis 1:3',
    text: 'And God said, “Let there be light,” and there was light.',
  },
  gen1_27: {
    ref: 'Genesis 1:27',
    text: 'So God created man in His own image; in the image of God He created him; male and female He created them.',
  },
  gen3_9: {
    ref: 'Genesis 3:9',
    text: 'But the LORD God called out to the man, “Where are you?”',
  },
  deu6_4: {
    ref: 'Deuteronomy 6:4',
    text: 'Hear, O Israel: The LORD our God, the LORD is One.',
  },
  exo3_14: {
    ref: 'Exodus 3:14',
    text: 'God said to Moses, “I AM WHO I AM. This is what you are to say to the Israelites: ‘I AM has sent me to you.’”',
  },
  exo34_6: {
    ref: 'Exodus 34:6',
    text: 'Then the LORD passed in front of Moses and called out: “The LORD, the LORD God, is compassionate and gracious, slow to anger, abounding in loving devotion and faithfulness,',
  },
  psa19_1: {
    ref: 'Psalm 19:1',
    text: 'The heavens declare the glory of God; the skies proclaim the work of His hands.',
  },
  isa40_28: {
    ref: 'Isaiah 40:28',
    text: 'Do you not know? Have you not heard? The LORD is the everlasting God, the Creator of the ends of the earth. He will not grow tired or weary; His understanding is beyond searching out.',
  },
  act17_24: {
    ref: 'Acts 17:24',
    text: 'The God who made the world and everything in it is the Lord of heaven and earth and does not live in temples made by human hands.',
  },
  act17_27: {
    ref: 'Acts 17:27',
    text: 'God intended that they would seek Him and perhaps reach out for Him and find Him, though He is not far from each one of us.',
  },
  act17_28: {
    ref: 'Acts 17:28',
    text: '‘For in Him we live and move and have our being.’ As some of your own poets have said, ‘We are His offspring.’',
  },
  jhn1_1: {
    ref: 'John 1:1',
    text: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
  },
  jhn1_14: {
    ref: 'John 1:14',
    text: 'The Word became flesh and made His dwelling among us. We have seen His glory, the glory of the one and only Son from the Father, full of grace and truth.',
  },
  jhn14_6: {
    ref: 'John 14:6',
    text: 'Jesus answered, “I am the way and the truth and the life. No one comes to the Father except through Me.',
  },
  jhn3_16: {
    ref: 'John 3:16',
    text: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.',
  },
  rom3_23: {
    ref: 'Romans 3:23',
    text: 'for all have sinned and fall short of the glory of God,',
  },
  rom6_23: {
    ref: 'Romans 6:23',
    text: 'For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.',
  },
  rom5_8: {
    ref: 'Romans 5:8',
    text: 'But God proves His love for us in this: While we were still sinners, Christ died for us.',
  },
  isa53_5: {
    ref: 'Isaiah 53:5',
    text: 'But He was pierced for our transgressions, He was crushed for our iniquities; the punishment that brought us peace was upon Him, and by His stripes we are healed.',
  },
  isa53_6: {
    ref: 'Isaiah 53:6',
    text: 'We all like sheep have gone astray, each one has turned to his own way; and the LORD has laid upon Him the iniquity of us all.',
  },
  '1co15_3': {
    ref: '1 Corinthians 15:3',
    text: 'For what I received I passed on to you as of first importance: that Christ died for our sins according to the Scriptures,',
  },
  '1co15_4': {
    ref: '1 Corinthians 15:4',
    text: 'that He was buried, that He was raised on the third day according to the Scriptures,',
  },
  '2co5_21': {
    ref: '2 Corinthians 5:21',
    text: 'God made Him who knew no sin to be sin on our behalf, so that in Him we might become the righteousness of God.',
  },
  eph2_8: {
    ref: 'Ephesians 2:8',
    text: 'For it is by grace you have been saved through faith, and this not from yourselves; it is the gift of God,',
  },
  eph2_9: {
    ref: 'Ephesians 2:9',
    text: 'not by works, so that no one can boast.',
  },
  rom10_9: {
    ref: 'Romans 10:9',
    text: 'that if you confess with your mouth, “Jesus is Lord,” and believe in your heart that God raised Him from the dead, you will be saved.',
  },
  jhn1_12: {
    ref: 'John 1:12',
    text: 'But to all who did receive Him, to those who believed in His name, He gave the right to become children of God—',
  },
  tit3_5: {
    ref: 'Titus 3:5',
    text: 'He saved us, not by the righteous deeds we had done, but according to His mercy, through the washing of new birth and renewal by the Holy Spirit.',
  },
  act4_12: {
    ref: 'Acts 4:12',
    text: 'Salvation exists in no one else, for there is no other name under heaven given to men by which we must be saved.”',
  },
  rom8_1: {
    ref: 'Romans 8:1',
    text: 'Therefore, there is now no condemnation for those who are in Christ Jesus.',
  },
  '1jn1_9': {
    ref: '1 John 1:9',
    text: 'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
  },
  '1jn4_8': {
    ref: '1 John 4:8',
    text: 'Whoever does not love does not know God, because God is love.',
  },
  luk24_27: {
    ref: 'Luke 24:27',
    text: 'And beginning with Moses and all the Prophets, He explained to them what was written in all the Scriptures about Himself.',
  },
  jhn5_39: {
    ref: 'John 5:39',
    text: 'You pore over the Scriptures because you presume that by them you possess eternal life. These are the very words that testify about Me,',
  },
  '2ti3_16': {
    ref: '2 Timothy 3:16',
    text: 'All Scripture is God-breathed and is useful for instruction, for conviction, for correction, and for training in righteousness,',
  },
  rev21_3: {
    ref: 'Revelation 21:3',
    text: 'And I heard a loud voice from the throne saying: “Behold, the dwelling place of God is with man, and He will dwell with them. They will be His people, and God Himself will be with them as their God.',
  },
  rev21_4: {
    ref: 'Revelation 21:4',
    text: '‘He will wipe away every tear from their eyes,’ and there will be no more death or mourning or crying or pain, for the former things have passed away.”',
  },
  rev21_5: {
    ref: 'Revelation 21:5',
    text: 'And the One seated on the throne said, “Behold, I make all things new.” Then He said, “Write this down, for these words are faithful and true.”',
  },
  mat3_16: {
    ref: 'Matthew 3:16',
    text: 'As soon as Jesus was baptized, He went up out of the water. Suddenly the heavens were opened, and He saw the Spirit of God descending like a dove and resting on Him.',
  },
  mat3_17: {
    ref: 'Matthew 3:17',
    text: 'And a voice from heaven said, “This is My beloved Son, in whom I am well pleased!”',
  },
  mat28_19: {
    ref: 'Matthew 28:19',
    text: 'Therefore go and make disciples of all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Spirit,',
  },
  '2co13_14': {
    ref: '2 Corinthians 13:14',
    text: 'The grace of the Lord Jesus Christ, and the love of God, and the fellowship of the Holy Spirit be with all of you.',
  },
  '1ti2_5': {
    ref: '1 Timothy 2:5',
    text: 'For there is one God, and there is one mediator between God and men, the man Christ Jesus,',
  },
  heb4_15: {
    ref: 'Hebrews 4:15',
    text: 'For we do not have a high priest who is unable to sympathize with our weaknesses, but we have one who was tempted in every way that we are, yet was without sin.',
  },
  mrk10_45: {
    ref: 'Mark 10:45',
    text: 'For even the Son of Man did not come to be served, but to serve, and to give His life as a ransom for many.”',
  },
  '1pe3_18': {
    ref: '1 Peter 3:18',
    text: 'For Christ also suffered for sins once for all, the righteous for the unrighteous, to bring you to God. He was put to death in the body but made alive in the Spirit,',
  },
  php2_6: {
    ref: 'Philippians 2:6',
    text: 'Who, existing in the form of God, did not consider equality with God something to be grasped,',
  },
  php2_8: {
    ref: 'Philippians 2:8',
    text: 'And being found in appearance as a man, He humbled Himself and became obedient to death— even death on a cross.',
  },
  heb1_3: {
    ref: 'Hebrews 1:3',
    text: 'The Son is the radiance of God’s glory and the exact representation of His nature, upholding all things by His powerful word. After He had provided purification for sins, He sat down at the right hand of the Majesty on high.',
  },
  col1_17: {
    ref: 'Colossians 1:17',
    text: 'He is before all things, and in Him all things hold together.',
  },
  gal4_6: {
    ref: 'Galatians 4:6',
    text: 'And because you are sons, God sent the Spirit of His Son into our hearts, crying out, “Abba, Father!”',
  },
  jhn16_8: {
    ref: 'John 16:8',
    text: 'And when He comes, He will convict the world in regard to sin and righteousness and judgment:',
  },
  jhn15_26: {
    ref: 'John 15:26',
    text: 'When the Advocate comes, whom I will send to you from the Father—the Spirit of truth who proceeds from the Father—He will testify about Me.',
  },
  psa103_8: {
    ref: 'Psalm 103:8',
    text: 'The LORD is compassionate and gracious, slow to anger, abounding in loving devotion.',
  },
} satisfies Record<string, Verse>
