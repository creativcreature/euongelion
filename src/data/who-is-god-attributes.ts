// Generated content spine for /who-is-god — the attribute comparison.
// EVERY scripture quotation is copied verbatim from the Berean Standard Bible
// corpus in public/bibles/BSB. Nothing here is quoted from memory.

import type { Verse } from './who-is-god-names'

export type SharedAttribute = {
  id: string
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

/** What is true of all three alike — the reason Christians say one God, not three. */
export const SHARED_ATTRIBUTES: SharedAttribute[] = [
  {
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
