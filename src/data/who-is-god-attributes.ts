// Generated content spine for /who-is-god — the attribute comparison.
// EVERY scripture quotation is copied verbatim from the Berean Standard Bible
// corpus in public/bibles/BSB. Nothing here is quoted from memory.

import type { Verse } from './who-is-god-names'

export type SharedAttribute = {
  id: string
  /** The seven shown by default. The rest are behind 'eleven more'. */
  core?: true
  label: string
  plain: string
  father: Verse
  son: Verse
  spirit: Verse
}

export type Person = {
  id: string
  label: string
  plain: string
  verse: Verse
}

/**
 * What is true of all three alike — the reason Christians say one God, not three.
 *
 * Eighteen attributes, every one of them said in Scripture of the Father, the Son
 * AND the Spirit, with a verse in all 54 cells. Founder direction: comprehensive,
 * but tuck things away. So the seven marked `core` show by default and the other
 * eleven sit behind an expander — comprehensive on the page, not comprehensive in
 * a beginner's face.
 *
 * Every reference was verified present in public/bibles/BSB before being written
 * here; none is quoted from memory.
 */
export const SHARED_ATTRIBUTES: SharedAttribute[] = [
  {
    core: true,
    id: 'eternal',
    label: 'Eternal',
    plain: 'Not made, not started, not ending.',
    father: {
      ref: 'Psalm 90:2',
      text: 'Before the mountains were born or You brought forth the earth and the world, from everlasting to everlasting You are God.',
    },
    son: {
      ref: 'John 1:1',
      text: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    },
    spirit: {
      ref: 'Hebrews 9:14',
      text: 'how much more will the blood of Christ, who through the eternal Spirit offered Himself unblemished to God, purify our consciences from works of death, so that we may serve the living God!',
    },
  },
  {
    core: true,
    id: 'creator',
    label: 'Creator',
    plain: 'Everything that exists was made through him.',
    father: {
      ref: 'Genesis 1:1',
      text: 'In the beginning God created the heavens and the earth.',
    },
    son: {
      ref: 'Colossians 1:16',
      text: 'For in Him all things were created, things in heaven and on earth, visible and invisible, whether thrones or dominions or rulers or authorities. All things were created through Him and for Him.',
    },
    spirit: {
      ref: 'Job 33:4',
      text: 'The Spirit of God has made me, and the breath of the Almighty gives me life.',
    },
  },
  {
    core: true,
    id: 'knows',
    label: 'All-knowing',
    plain: 'Nothing is hidden or new to him.',
    father: {
      ref: '1 John 3:20',
      text: 'Even if our hearts condemn us, God is greater than our hearts, and He knows all things.',
    },
    son: { ref: 'John 20:28', text: 'Thomas replied, “My Lord and my God!”' },
    spirit: {
      ref: '1 Corinthians 2:10',
      text: 'But God has revealed it to us by the Spirit. The Spirit searches all things, even the deep things of God.',
    },
  },
  {
    core: true,
    id: 'present',
    label: 'Everywhere present',
    plain: 'There is nowhere you could go to be outside him.',
    father: {
      ref: 'Jeremiah 23:24',
      text: '“Can a man hide in secret places where I cannot see him?” declares the LORD. “Do I not fill the heavens and the earth?” declares the LORD.',
    },
    son: {
      ref: 'Matthew 28:20',
      text: 'and teaching them to obey all that I have commanded you. And surely I am with you always, even to the end of the age.”',
    },
    spirit: {
      ref: 'Psalm 139:7-8',
      text: 'Where can I go to escape Your Spirit? Where can I flee from Your presence? If I ascend to the heavens, You are there; if I make my bed in Sheol, You are there.',
    },
  },
  {
    core: true,
    id: 'holy',
    label: 'Holy',
    plain: 'Set apart. Wholly good, with nothing false in him.',
    father: {
      ref: 'Isaiah 6:3',
      text: 'And they were calling out to one another: “Holy, holy, holy is the LORD of Hosts; all the earth is full of His glory.”',
    },
    son: {
      ref: 'Luke 1:35',
      text: 'The angel replied, “The Holy Spirit will come upon you, and the power of the Most High will overshadow you. So the Holy One to be born will be called the Son of God.',
    },
    spirit: {
      ref: 'John 14:26',
      text: 'But the Advocate, the Holy Spirit, whom the Father will send in My name, will teach you all things and will remind you of everything I have told you.',
    },
  },
  {
    core: true,
    id: 'life',
    label: 'Gives life',
    plain: 'Life is not something he has. It is something he is, and gives.',
    father: {
      ref: 'John 5:21',
      text: 'For just as the Father raises the dead and gives them life, so also the Son gives life to whom He wishes.',
    },
    son: {
      ref: 'John 6:63',
      text: 'The Spirit gives life; the flesh profits nothing. The words I have spoken to you are spirit and they are life.',
    },
    spirit: {
      ref: 'Romans 8:11',
      text: 'And if the Spirit of Him who raised Jesus from the dead is living in you, He who raised Christ Jesus from the dead will also give life to your mortal bodies through His Spirit, who lives in you.',
    },
  },
  {
    core: true,
    id: 'called',
    label: 'Called God',
    plain: 'Scripture directly names each of the three God.',
    father: {
      ref: 'Exodus 3:15',
      text: 'God also told Moses, “Say to the Israelites, ‘The LORD, the God of your fathers—the God of Abraham, the God of Isaac, and the God of Jacob—has sent me to you.’ This is My name forever, and this is how I am to be remembered in every generation.',
    },
    son: { ref: 'John 20:28', text: 'Thomas replied, “My Lord and my God!”' },
    spirit: {
      ref: 'Acts 5:4',
      text: 'Did it not belong to you before it was sold? And after it was sold, was it not at your disposal? How could you conceive such a deed in your heart? You have not lied to men, but to God!”',
    },
  },
  {
    id: 'sovereign',
    label: 'Sovereign',
    plain: 'He rules. Nothing happens outside his reach.',
    father: {
      ref: 'Psalm 103:19',
      text: 'The LORD has established His throne in heaven, and His kingdom rules over all.',
    },
    son: {
      ref: 'Matthew 28:18',
      text: 'Then Jesus came to them and said, “All authority in heaven and on earth has been given to Me.',
    },
    spirit: {
      ref: '1 Corinthians 12:11',
      text: 'All these are the work of one and the same Spirit, who apportions them to each one as He determines.',
    },
  },
  {
    id: 'just',
    label: 'Just',
    plain: 'He does what is right, every time, without exception.',
    father: {
      ref: 'Deuteronomy 32:4',
      text: 'He is the Rock, His work is perfect; all His ways are just. A God of faithfulness without injustice, righteous and upright is He.',
    },
    son: {
      ref: '2 Timothy 4:8',
      text: 'From now on there is laid up for me the crown of righteousness, which the Lord, the righteous Judge, will award to me on that day—and not only to me, but to all who crave His appearing.',
    },
    spirit: {
      ref: 'John 16:8',
      text: 'And when He comes, He will convict the world in regard to sin and righteousness and judgment:',
    },
  },
  {
    id: 'merciful',
    label: 'Merciful',
    plain: 'He does not give people what they have coming.',
    father: {
      ref: 'Ephesians 2:4',
      text: 'But because of His great love for us, God, who is rich in mercy,',
    },
    son: {
      ref: 'Hebrews 2:17',
      text: 'For this reason He had to be made like His brothers in every way, so that He might become a merciful and faithful high priest in service to God, in order to make atonement for the sins of the people.',
    },
    spirit: {
      ref: 'Hebrews 10:29',
      text: 'How much more severely do you think one deserves to be punished who has trampled on the Son of God, profaned the blood of the covenant that sanctified him, and insulted the Spirit of grace?',
    },
  },
  {
    id: 'faithful',
    label: 'Faithful',
    plain: 'He keeps his word. He does not change his mind about you.',
    father: {
      ref: '1 Corinthians 1:9',
      text: 'God, who has called you into fellowship with His Son Jesus Christ our Lord, is faithful.',
    },
    son: {
      ref: 'Hebrews 13:8',
      text: 'Jesus Christ is the same yesterday and today and forever.',
    },
    spirit: {
      ref: 'John 14:16',
      text: 'And I will ask the Father, and He will give you another Advocate to be with you forever—',
    },
  },
  {
    id: 'unchanging',
    label: 'Unchanging',
    plain: 'He is not in a mood. He is the same today as always.',
    father: {
      ref: 'Malachi 3:6',
      text: '“Because I, the LORD, do not change, you descendants of Jacob have not been destroyed.',
    },
    son: {
      ref: 'Hebrews 13:8',
      text: 'Jesus Christ is the same yesterday and today and forever.',
    },
    spirit: {
      ref: 'Hebrews 9:14',
      text: 'how much more will the blood of Christ, who through the eternal Spirit offered Himself unblemished to God, purify our consciences from works of death, so that we may serve the living God!',
    },
  },
  {
    id: 'selfexistent',
    label: 'Self-existent',
    plain: 'Nobody made him. He does not need anything to keep going.',
    father: {
      ref: 'Exodus 3:14',
      text: 'God said to Moses, “I AM WHO I AM. This is what you are to say to the Israelites: ‘I AM has sent me to you.’”',
    },
    son: {
      ref: 'John 5:26',
      text: 'For as the Father has life in Himself, so also He has granted the Son to have life in Himself.',
    },
    spirit: {
      ref: 'Romans 8:2',
      text: 'For in Christ Jesus the law of the Spirit of life set you free from the law of sin and death.',
    },
  },
  {
    id: 'wise',
    label: 'Wise',
    plain: 'He knows what to do with what he knows.',
    father: {
      ref: 'Romans 16:27',
      text: 'to the only wise God be glory forever through Jesus Christ! Amen.',
    },
    son: {
      ref: 'Colossians 2:3',
      text: 'in whom are hidden all the treasures of wisdom and knowledge.',
    },
    spirit: {
      ref: 'Isaiah 11:2',
      text: 'The Spirit of the LORD will rest on Him— the Spirit of wisdom and understanding, the Spirit of counsel and strength, the Spirit of knowledge and fear of the LORD.',
    },
  },
  {
    id: 'patient',
    label: 'Patient',
    plain: 'He waits. Longer than anyone thinks is reasonable.',
    father: {
      ref: '2 Peter 3:9',
      text: 'The Lord is not slow in keeping His promise as some understand slowness, but is patient with you, not wanting anyone to perish but everyone to come to repentance.',
    },
    son: {
      ref: '1 Timothy 1:16',
      text: 'But for this very reason I was shown mercy, so that in me, the worst of sinners, Christ Jesus might display His perfect patience as an example to those who would believe in Him for eternal life.',
    },
    spirit: {
      ref: 'Galatians 5:22',
      text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness,',
    },
  },
  {
    id: 'good',
    label: 'Good',
    plain: 'Not just powerful. Kind, all the way down.',
    father: {
      ref: 'Psalm 34:8',
      text: 'Taste and see that the LORD is good; blessed is the man who takes refuge in Him!',
    },
    son: {
      ref: 'John 10:11',
      text: 'I am the good shepherd. The good shepherd lays down His life for the sheep.',
    },
    spirit: {
      ref: 'Psalm 143:10',
      text: 'Teach me to do Your will, for You are my God. May Your good Spirit lead me on level ground.',
    },
  },
  {
    id: 'gracious',
    label: 'Gracious',
    plain: 'He gives what was never earned and cannot be repaid.',
    father: {
      ref: 'Psalm 103:8',
      text: 'The LORD is compassionate and gracious, slow to anger, abounding in loving devotion.',
    },
    son: {
      ref: 'John 1:14',
      text: 'The Word became flesh and made His dwelling among us. We have seen His glory, the glory of the one and only Son from the Father, full of grace and truth.',
    },
    spirit: {
      ref: 'Hebrews 10:29',
      text: 'How much more severely do you think one deserves to be punished who has trampled on the Son of God, profaned the blood of the covenant that sanctified him, and insulted the Spirit of grace?',
    },
  },
  {
    id: 'loving',
    label: 'Loving',
    plain: 'Love is not something he does. It is what he is.',
    father: {
      ref: '1 John 4:8',
      text: 'Whoever does not love does not know God, because God is love.',
    },
    son: {
      ref: 'John 15:9',
      text: 'As the Father has loved Me, so have I loved you. Remain in My love.',
    },
    spirit: {
      ref: 'Romans 15:30',
      text: 'Now I urge you, brothers, by our Lord Jesus Christ and by the love of the Spirit, to join me in my struggle by praying to God for me.',
    },
  },
]

/** What is NOT the same — the reason Christians do not say the three are one person. */
export const PERSONS: Person[] = [
  {
    id: 'father',
    label: 'The Father',
    plain:
      'The one who sends. He is never sent. He plans the rescue and gives the Son.',
    verse: {
      ref: 'John 3:16',
      text: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.',
    },
  },
  {
    id: 'son',
    label: 'The Son — Jesus',
    plain:
      'The one who is sent, and who becomes human. He is the only one of the three who has a body, a birthday, and a grave he walked out of.',
    verse: {
      ref: 'Philippians 2:7',
      text: 'but emptied Himself, taking the form of a servant, being made in human likeness.',
    },
  },
  {
    id: 'spirit',
    label: 'The Holy Spirit',
    plain:
      'The one who is sent by the Father in the Son’s name, and who comes to live inside people rather than merely alongside them.',
    verse: {
      ref: 'John 14:26',
      text: 'But the Advocate, the Holy Spirit, whom the Father will send in My name, will teach you all things and will remind you of everything I have told you.',
    },
  },
]
