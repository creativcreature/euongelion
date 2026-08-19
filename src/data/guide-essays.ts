/**
 * How to read — the full guides (companion to GUIDES in daily-edition.ts).
 *
 * The Daily Bread prints each guide as a card: kicker, standfirst, four
 * steps. Founder 2026-08-18: the cards "need to lead to more robust pages
 * that explain the section in more detail. They feel incomplete right now."
 * This module is the robust part — one essay, expanded steps, honest
 * mistakes, and passages to try the method on today, keyed by guide slug.
 *
 * HISTORY POLICY (same line the rest of the paper holds): historical claims
 * appear only where genuinely documented — Guigo II's Scala Claustralium for
 * lectio divina, the mediaeval chapter/verse apparatus, Strong's concordance.
 * Everywhere else these essays teach method, not history. Nothing invented.
 *
 * Scripture references in `goDeeper` are real passages chosen because the
 * method bites on them, with one line each on why. No arbitrary picks.
 */

export interface GuideStepDetail {
  /** The step as printed on the Daily Bread card — kept verbatim. */
  step: string
  /** Two or three sentences of actual how-to. */
  how: string
}

export interface GuideMistake {
  /** The mistake, named plainly. */
  name: string
  /** Why it happens and what to do instead. */
  body: string
}

export interface GuidePassage {
  /** A real scripture reference to try the method on today. */
  reference: string
  /** One line on why this passage suits this method. */
  why: string
}

export interface GuideEssay {
  /** Must match a GUIDES slug in daily-edition.ts. */
  slug: string
  /** The essay, one string per paragraph. 500–800 words across the set. */
  essay: string[]
  /** The card's steps, each expanded. Index-aligned with Guide.steps. */
  steps: GuideStepDetail[]
  /** Three or four honest ways this method goes wrong. */
  mistakes: GuideMistake[]
  /** Two or three passages to try the method on today. */
  goDeeper: GuidePassage[]
}

export const GUIDE_ESSAYS: GuideEssay[] = [
  /* ── Read a whole book ──────────────────────────────────────────────── */
  {
    slug: 'read-a-whole-book',
    essay: [
      'Philippians is a letter. It was carried by hand from a Roman prison to a small church in northern Greece, and when it arrived, somebody stood up in a crowded room and read it aloud — all of it, start to finish, to everyone at once. Nobody interrupted at the third sentence to ask what verse eleven meant. The letter did what letters do: it made its case in order, each movement leaning on the one before it, and it was over in about fifteen minutes.',
      'That is the normal way to receive almost every book in the Bible, and it has become the rarest. We read in fragments now — a verse on an image, a paragraph in a plan, three minutes spent inside a chapter we entered mid-argument. Fragments are not worthless. But a fragment cannot tell you what a book is doing, any more than one overheard sentence can tell you what a conversation was about.',
      'It helps to know that the numbers are furniture, not text. The chapter divisions were added in the thirteenth century and the verse numbers in the sixteenth — a finding system bolted on so a line could be cited without being copied out. They are useful the way page numbers are useful. But nobody reads a novel one page number at a time, and the apparatus has quietly trained us to treat the Bible as a drawer of sayings rather than a shelf of whole works.',
      'Reading a book whole gives you the one thing no fragment can: shape. Read Mark in a sitting and you feel its pace — the word "immediately" driving the first half forward, then everything slowing, deliberately, as Jerusalem gets close. Read Ruth whole and it turns out to be a single arc from famine to fullness, from a widow with nothing to a child on her lap and a name in a genealogy. Stop at chapter one and you have read a tragedy. The meaning was in the whole.',
      'This costs less than you think. Most of the letters take ten to twenty minutes; Ruth takes about fifteen; Mark runs to roughly ninety, the length of a film — and even Mark divides naturally into two or three sittings if one is too much. The obstacle is not time. It is the habit of stopping, and the suspicion that reading without pausing to decode every line does not count. It counts. It is how these books expected to be met.',
      'None of this is a case against verses. It is a case for reading them last. A verse met after the whole book is a different verse: "I can do all things through him who strengthens me" means one thing on a mug and something sharper at the end of a letter about contentment, written from a cell by a man who had learned to be abased and to abound. The book is what tells you which of those Paul meant. Read the whole thing once, badly, without stopping — and then go get your verse. It will still be there, and it will have grown.',
    ],
    steps: [
      {
        step: 'Pick a short one — Philippians, Ruth, Mark, 1 John.',
        how: 'Short matters more than familiar, because the win here is finishing. Philippians and 1 John are quarter-hour reads; Ruth is four chapters with a plot; Mark is the longest of the four and still shorter than most films. Leave Isaiah and Romans for when the habit is set.',
      },
      {
        step: 'Read it start to finish without stopping to look anything up.',
        how: 'Momentum is the method, so keep moving through whatever you do not understand. A confusion carried forward often resolves itself two chapters later, which is something no footnote can teach you. A pencil dot in the margin is enough to mark where you mean to come back.',
      },
      {
        step: 'Write one sentence on what the whole thing seemed to be about.',
        how: 'One sentence, not a summary — a summary lists things, a sentence forces a verdict. It does not need to be right; it needs to be yours, written before anyone else tells you what the book is about. Date it. Your next whole read of the same book will argue with it, and that argument is the study.',
      },
      {
        step: 'Only then go back for the verse that caught you.',
        how: 'Now the verse has a home: you know what came before it, what it was building toward, and what work it does where it sits. Reread just the paragraph around it and ask what the verse is doing there — comforting, warning, concluding, answering. That is the reading the author intended you to have.',
      },
    ],
    mistakes: [
      {
        name: 'Starting with Genesis and quitting in Leviticus',
        body: 'The Bible is a library, not a novel, and reading it cover to cover is the hardest possible entry. Start with a short book chosen on purpose, finish it, and let finishing teach you what the long books will ask of you.',
      },
      {
        name: 'Stopping to resolve every difficulty',
        body: 'The first read is for the whole, and every pause to look something up costs you the momentum that makes the whole visible. Mark the hard line and keep going — study is the second visit, not the first.',
      },
      {
        name: 'Treating the chapter break as a stopping place',
        body: 'The divisions were added centuries after the writing, and some of them fall mid-argument. If you must stop partway, stop where the text itself exhales — the end of a scene or an argument — not where the number changes.',
      },
      {
        name: 'Turning it into a speed exercise',
        body: 'One sitting is not a stopwatch. The point is receiving the book as one thing, and an unhurried ninety minutes does that; a skimmed twenty does not.',
      },
    ],
    goDeeper: [
      {
        reference: 'Philippians 1–4',
        why: 'A complete letter in fifteen minutes, with its most-quoted verse waiting at the end to be transformed by everything before it.',
      },
      {
        reference: 'Ruth 1–4',
        why: 'Four chapters with a genuine narrative arc — the book only resolves if you reach the last scene.',
      },
      {
        reference: 'Mark 1–8',
        why: 'Half of the fastest gospel in one sitting, ending exactly at the hinge where the whole book turns.',
      },
    ],
  },

  /* ── Who is speaking ────────────────────────────────────────────────── */
  {
    slug: 'who-is-speaking',
    essay: [
      '"For I know the plans I have for you" may be the most quoted promise in the Bible, so it is worth noticing who it was made to. Jeremiah 29 is a letter to exiles — a community deported to Babylon, told to build houses, plant gardens, marry, and settle in, because the rescue would come in seventy years. Most of the people who first heard that promise would not live to see it kept. It is still a magnificent promise. It is just not a promise that this year will go well for you.',
      'This is the most common way to misread the Bible, and it is not really a theological mistake. It is a postal one: a letter delivered to the wrong address. Scripture is full of speech — nearly every line in it is said by someone, to someone, in the middle of something — and when we lift the line out, the speech does not stop being addressed. We just stop noticing the address.',
      'So the method starts blunt: name the speaker, and name the audience. Not "the Bible says" — who says, and to whom? A prophet to a king. God to a fugitive. Paul to a church he founded and loves and is worried about. Usually the answer is sitting in the sentence before the one you underlined, which is why this is the cheapest study skill there is. It requires no Greek, no commentary, and about eight seconds of looking up the page.',
      'Then do the harder thing: ask what those first hearers would have heard. Not what the words mean in your mouth — what they meant in that room. When Jesus tells the story of the prodigal son, Luke has already told you the audience: tax collectors drawing near to listen, Pharisees muttering about the company he keeps. The parable has an elder brother in it because the room did. Read it without the room and you get a warm story about forgiveness; read it with the room and the last scene is aimed, and it is aimed at the resentful.',
      'The third question keeps all this from becoming trivia: what has to be true of God for this line to make sense? A promise made to exiles you are not among still shows you a God who plans good for people in the middle of judgment, on a timescale longer than their lives. That is not nothing. That is, in fact, the transferable part — the character of God holds across audiences even when the particulars do not transfer.',
      'And then, last, what it asks of you. Last is the important word. Most of us run the questions in reverse — me first, then meaning — and end up with a Bible that is all mirror and no window. Run them in order and you do not lose the verse; you earn it. What survives the questions is yours to keep, and it is usually better than what you went in for: not a slogan with your name forced onto the envelope, but the God underneath the promise, who does not change between addressees.',
    ],
    steps: [
      {
        step: 'Name the speaker. Name the audience. Both are usually in the sentence before.',
        how: 'Back up a paragraph and read the framing: who is talking, to whom, and what prompted it. In the gospels, watch who Jesus is answering — a question from a lawyer gets a different shape of reply than a crowd on a hillside. Say both names out loud before you interpret a word.',
      },
      {
        step: 'Ask what that audience would have heard — not what you hear.',
        how: 'Look for what the text tells you about their situation: exile, persecution, prosperity, drift. A line about patience lands differently on the comfortable than on the suffering, and the writer knew which he was writing to. Where the text names the occasion, believe it.',
      },
      {
        step: 'Ask what has to be true of God for the line to make sense.',
        how: 'Every promise, command, and warning rests on something about who God is — faithful, jealous, slow to anger, not mocked. Name that something in your own words. This is the part of the passage that crosses the centuries intact, even when the particulars belong to someone else.',
      },
      {
        step: 'Then ask what it asks of you.',
        how: 'Only now bring the line home, and let the first three answers set the terms. Sometimes the application is direct; sometimes it is the humbler discovery that this promise belongs to someone else and your part is to trust the same God. Both are readings. Only one of them was for sale on the mug.',
      },
    ],
    mistakes: [
      {
        name: 'Reading every promise as addressed to you',
        body: 'Some are — and they are stronger for being distinguishable from the ones that are not. A promise to exiled Israel or to a specific apostle shows you God’s character without becoming your personal guarantee, and pretending otherwise sets you up to feel lied to when it does not arrive.',
      },
      {
        name: 'Skipping the audience because the speaker is God',
        body: 'Divine speech is still addressed speech. "Take off your sandals" was said by God and is still not an instruction to you; the question is never only who speaks, but who is spoken to.',
      },
      {
        name: 'Doing the history and never coming home',
        body: 'The opposite failure: audience, context, background — and no fourth question. The method ends at what it asks of you, and a reading that never gets there is a lecture, not a reading.',
      },
      {
        name: 'Assuming the audience is friendly',
        body: 'Some of the hardest sayings are aimed at opponents, and some of the tenderest at failures. Getting the room wrong reverses the tone: check whether the crowd is drawing near or picking up stones before you decide how the words are meant.',
      },
    ],
    goDeeper: [
      {
        reference: 'Jeremiah 29:1–14',
        why: 'The most misdelivered promise in scripture, printed with its envelope — the address is right there in the first verse.',
      },
      {
        reference: 'Luke 15:1–32',
        why: 'Luke names the two audiences in the opening lines, and the elder brother exists because of the second one.',
      },
      {
        reference: 'Psalm 137',
        why: 'A psalm that is nearly unreadable until you name the speaker: a captive, beside a river, being asked to perform.',
      },
    ],
  },

  /* ── Scripture interprets scripture ─────────────────────────────────── */
  {
    slug: 'scripture-interprets-scripture',
    essay: [
      'In the wilderness, the tempter quotes Psalm 91 at Jesus — angels, hands, not a foot dashed against a stone. It is a real psalm, quoted accurately. Jesus answers it with Deuteronomy: you shall not put the Lord your God to the test. One passage held against another; the misuse corrected not with a new idea but with an older text. If you want a picture of this method, that is the picture: even scripture quoted accurately can be aimed wrongly, and the correction came from scripture.',
      'The principle is simple to say: the Bible is its own best commentary. Before you reach for what a passage might mean, go and find the other places that speak to the same thing — the text it quotes, the story it retells, the promise it fulfils or strains against. The Reformers gave the practice its slogan, but they did not invent it. The New Testament writers were already doing it on nearly every page, reading their scriptures as one long, coherent argument in which the parts explain each other.',
      'The tooling for this is already in your hands. Those small letters and references crowding the margin of most Bibles are cross-references: places where an editor has marked that this verse quotes, echoes, or answers that one. Most readers treat them as decoration. They are the opposite — a map of the book’s internal conversation, compiled so you do not have to hold the whole canon in your head. Following two or three of them is the fastest way to watch a dark verse light up.',
      'The richest seam is quotation. When the New Testament quotes the Old, something is always happening, and the habit to build is refusing to settle for the quoted line alone. Go back and read the whole original paragraph. Hebrews quotes Jeremiah’s new covenant at length — the point is not the ornament but the claim that the promise has arrived. And when the wording shifts between the original and the quotation, slow down: what changed in the quoting is usually the argument itself. The alteration is the sermon.',
      'One rule keeps the whole method honest: let the clear passage govern the obscure one, and not the other way around. Scripture has hard verses — single lines about baptism for the dead, spirits in prison, the sons of God — and a reader determined to build on them can build almost anything. The discipline is humility about proportion: the Bible’s plain, repeated teaching is the frame, and the strange verse hangs inside the frame. When two passages seem to disagree, start from the one you can actually understand.',
      'What this practice slowly builds is not a technique but an instinct — the sense that you are reading one book, not sixty-six strangers. Words start ringing across the shelf: seed, lamb, temple, exile, rest. You hear Genesis under John, Exodus under Matthew, the psalms under nearly everything. No single verse taught you that. The book taught it, one cross-reference at a time, which is why the oldest study tool there is remains the best one: when a passage is dark, the lamp is somewhere else in the same book.',
    ],
    steps: [
      {
        step: 'Follow the cross-references in your margin — they are there for this.',
        how: 'Pick the verse that puzzles you and follow two or three of its marginal references, reading each in its own context rather than as a proof-text. You are looking for the passage your passage is talking to. If your Bible has no margin apparatus, any free online Bible will show cross-references for a verse.',
      },
      {
        step: 'When the New Testament quotes the Old, read the whole original paragraph.',
        how: 'Quotation was done from memory of whole passages, and the writer usually intends the surrounding argument, not just the line. Read the full paragraph — often the full chapter — the quote came from. The point being made frequently sits in the verse just before or after the one quoted.',
      },
      {
        step: 'Notice what changed in the quoting. That is usually the argument.',
        how: 'Set the original and the quotation side by side and look for the seam: a tense shifted, a pronoun widened, a clause dropped or added. Ask why the writer needed the line in that form. The difference between what was written and what was quoted is very often exactly what the writer is claiming.',
      },
      {
        step: 'Prefer the clear passage over the obscure one when they seem to disagree.',
        how: 'When two texts pull against each other, ask which one the rest of scripture repeats plainly and which one stands nearly alone. Build on the repeated one, and let the strange verse stay strange for now. An honest "I do not know yet" is a better reading than a clever system built on one dark line.',
      },
    ],
    mistakes: [
      {
        name: 'Chaining verses that merely share a word',
        body: 'The same English word does not make two passages about the same thing — "flesh" in Genesis and "flesh" in Romans are doing different work. Connect passages by subject and by actual quotation, not by concordance coincidence.',
      },
      {
        name: 'Reading the quoted line without the original context',
        body: 'Stopping at the quoted words themselves misses the argument, because the writer is usually invoking the whole passage. The paragraph around the original is where the meaning of the quotation lives.',
      },
      {
        name: 'Building a doctrine on the obscure verse',
        body: 'The method has a direction: clear interprets unclear. Reversing it — making the strange verse the key and bending the plain ones around it — is how a private theory gets dressed up as a discovery.',
      },
      {
        name: 'Using cross-references to win rather than to read',
        body: 'A margin can be mined for ammunition, three references deep, without a single passage being heard. If every chain you follow ends where you already stood, you are collecting, not reading.',
      },
    ],
    goDeeper: [
      {
        reference: 'Matthew 4:1–11',
        why: 'Both uses of the method in one scene — scripture quoted to distort, and scripture answered with scripture.',
      },
      {
        reference: 'Hebrews 8 with Jeremiah 31:31–34',
        why: 'The New Testament’s longest Old Testament quotation, worth reading in both homes to see what arrival changes.',
      },
      {
        reference: 'Romans 4 with Genesis 15:1–6',
        why: 'Paul builds an entire argument on one sentence about Abraham — watch how much weight the original context carries.',
      },
    ],
  },

  /* ── Lectio divina ──────────────────────────────────────────────────── */
  {
    slug: 'lectio-divina',
    essay: [
      'Somewhere in the twelfth century, a Carthusian prior named Guigo II wrote a short letter about how monks read. He called it the Scala Claustralium — the ladder of monks — and it described four rungs: read, meditate, pray, contemplate. He was not inventing the practice; monasteries had kept hours for sacred reading since Benedict’s rule six centuries earlier. He was doing something more useful. He was writing it down plainly enough that it could be handed to someone else, which is the only reason a way of reading practised in stone cells has survived long enough to reach your kitchen table.',
      'Lectio divina is not Bible study, and confusing the two frustrates people into quitting. Study interrogates a text: context, structure, argument. Lectio sits with one. The aim is not to master the passage but to be addressed by it — closer to how you read a letter from someone who loves you than how you read a textbook. Both kinds of reading matter, and each keeps the other honest. But they are different postures, and this one begins by putting the highlighter down.',
      'The first pass is simply reading — slowly, ideally aloud, all the way through. Slowness is the whole discipline here. You already know how to read fast; every app you own has trained you. Reading a psalm at the pace of speech feels almost physically uncomfortable at first, like walking behind someone elderly. Do it anyway. The speed limit is what lets you notice the text instead of your progress through it.',
      'The second pass listens for the snag — the word or phrase that catches, the way a sleeve catches on a nail. Not the most important word by any scholarly measure; the one that will not let go of you. This is the part of the practice that feels least like technique, and the instruction is simply honesty: notice what actually snagged, not what you think should have. The monks assumed God could be at work in that noticing. The practice makes no sense without that assumption, and no apology for it.',
      'The third pass talks back. Whatever the snagged word raised — memory, resistance, grief, want — say it. This is prayer of the unpolished kind, and its only rule is that it must be a response to what you read rather than the list you walked in with. Sometimes it is one sentence. Sometimes it is an argument. The psalms suggest both are admissible.',
      'And then the strange fourth rung: stop. No more words, no more effort — just stay, the way you might stay at a table after a good conversation has finished. A minute longer than is comfortable, the guide says, because the discomfort is the point at which most of us reach for the phone. Nothing measurable happens in that minute. The monks would say that what happens is precisely the unmeasurable thing, and that the other three rungs exist for its sake. Eight minutes, four passes, one short passage — no expertise required. It is the lowest doorway in Christian practice, and it has borne the weight of eight centuries of ordinary readers walking through it.',
    ],
    steps: [
      {
        step: 'Read: hear it once, slowly, all the way through.',
        how: 'Choose a short passage — a psalm, a paragraph of a gospel — and read it at speaking pace, aloud if you can. Do not analyse, underline, or skip. You are letting the whole thing pass through you once, the way you would listen to a piece of music before deciding anything about it.',
      },
      {
        step: 'Reflect: read again, and stop on the word that snags.',
        how: 'Go through a second time even more slowly, and watch for the word or phrase that catches at you. Do not audition candidates for the most theological word; take the one that actually snagged. Stay with it — repeat it, turn it over, ask why it and why today.',
      },
      {
        step: 'Respond: say back to God whatever that word raised.',
        how: 'Whatever surfaced — a memory, a refusal, a longing, a name — say it plainly, out loud or on paper. This is not the moment for composed prayer; it is answering speech. If what came up is an argument, have the argument. The psalms establish the precedent.',
      },
      {
        step: 'Rest: stop reading. Stay a minute longer than is comfortable.',
        how: 'Close the book and do not fill the silence — no summary, no takeaway, no phone. Sit as you would after a conversation that ended well. When your attention drifts, return to the snagged word without scolding yourself. The minute past comfortable is where the practice actually lives.',
      },
    ],
    mistakes: [
      {
        name: 'Turning it into study',
        body: 'Reaching for context and commentary mid-lectio restarts the analytical engine the practice exists to rest. Study the passage another time — the same text can receive both readings, just not in the same eight minutes.',
      },
      {
        name: 'Choosing too much text',
        body: 'A chapter cannot be read at lectio’s pace without the clock winning. A paragraph is plenty; a single psalm is generous. The practice goes deep precisely because it does not go wide.',
      },
      {
        name: 'Grading the session',
        body: 'Expecting a feeling — and calling the time wasted when none arrives — turns prayer into performance review. Some sessions are dry. The monks kept the hours anyway, which is why the practice outlived their feelings about it.',
      },
      {
        name: 'Skipping the rest',
        body: 'The fourth pass is the one modern readers cut, because it produces nothing to show. It is also the rung the other three were built to reach. If you must shorten something, shorten the reading, not the silence.',
      },
    ],
    goDeeper: [
      {
        reference: 'Psalm 23',
        why: 'Six verses you half know by heart — familiarity is an asset here, because the practice is listening, not decoding.',
      },
      {
        reference: 'John 15:1–11',
        why: 'A passage about abiding, read by a method that is itself abiding — the form and the content teach each other.',
      },
      {
        reference: 'Matthew 11:28–30',
        why: 'Three sentences of invitation, dense enough to snag a different word every time you return.',
      },
    ],
  },

  /* ── Word roots ─────────────────────────────────────────────────────── */
  {
    slug: 'word-roots',
    essay: [
      'There is a Hebrew word, hesed, that no English Bible has ever managed to carry across in one piece. Translators have tried mercy, kindness, lovingkindness, steadfast love, loyalty — and each is right, and each leaks. The word means something like love that has bound itself: covenant loyalty that keeps showing up. Ruth is soaked in it; so are the psalms. An English reader can go years without noticing that "mercy" in one verse and "steadfast love" in another are the same word, making the same claim, about the same God.',
      'That is what translation does — not lying, just flattening. One original word fans out into five English ones; five original words collapse into one English one. The reader who only ever sees the English surface misses the threads running underneath it. The good news is that you do not need Hebrew or Greek to follow those threads. You need a concordance — an index of every word in the Bible and everywhere it occurs — and the patience to follow one word around for twenty minutes.',
      'The concordance is an old tool. The most famous English one, Strong’s, was compiled in the nineteenth century, and its numbering system — every Hebrew and Greek word assigned a number — is still how readers without the languages get underneath the English. Look up "wait" in Isaiah 40:31, and the entry tells you the Hebrew behind it is qavah, number H6960, and lists every other verse where qavah appears. That list is the study. You have just been handed every place the Bible uses this word, and nobody needed to teach you an alphabet.',
      'The method matters more than the tool, though, and the method is: read the occurrences in full, not as a list. A word’s meaning is not hiding in its dictionary entry; it lives in its uses, the way you learned every English word you know. So pick three of the passages where your word appears and read each as an actual passage — a paragraph or more, with the questions you would ask of any text. Watch what the word is doing in each place. Qavah in Isaiah is not passive waiting; it is the taut expectancy of a rope pulled tight. You only see that by watching it work.',
      'One honest warning, because this method has a famous failure mode: a word’s history is not its meaning. Taking a word apart into its ancient roots — or importing everything a word ever meant into one verse — produces readings that feel like discoveries and are actually just etymology dressed up. English should teach us this: a butterfly is not a fly made of butter. Usage, not derivation, is where meaning lives. The concordance protects you here precisely because it shows you usage — dozens of real sentences — rather than a story about where the word came from.',
      'The payoff of all this is quiet but permanent. Follow hesed around for an afternoon and every "steadfast love" you meet afterward rings with the other places you have seen it. The verse you started from will have thickened — same words, more weight. That is the whole aim: not vocabulary for its own sake, but a Bible whose load-bearing words you have actually watched bearing load.',
    ],
    steps: [
      {
        step: 'Pick a word that is carrying weight — grace, remember, wait.',
        how: 'Choose from a verse that already matters to you, and prefer the word the passage leans on over the one that merely interests you. Verbs and covenant words — remember, wait, know, love, rest — tend to repay the digging most. One word per session; the discipline is depth.',
      },
      {
        step: 'Look up every place the same original word appears.',
        how: 'Use a concordance with Strong’s numbers — any free online Bible tool has one — so you are following the Hebrew or Greek word, not its English disguise. Note the spread: which books use it, whether it clusters in law or psalm or gospel. The shape of the list is itself information.',
      },
      {
        step: 'Read three of those passages in full.',
        how: 'Choose occurrences from different books if you can, and read each as a real passage rather than a search result — context, speaker, situation. Ask what the word is doing in each place: what is claimed, promised, or asked with it. Three careful readings beat thirty glances.',
      },
      {
        step: 'Come back to your verse. It will have thickened.',
        how: 'Reread the verse you started from and let the other passages sound underneath it. Write one sentence on what the word carries here that you could not see before. That sentence is the finding — and it will still be true the next time the word finds you in a different chapter.',
      },
    ],
    mistakes: [
      {
        name: 'Mistaking etymology for meaning',
        body: 'A word’s ancient roots make a good story and a bad definition — meaning lives in use, not derivation. If your discovery depends on taking the word apart rather than watching it work in sentences, distrust it.',
      },
      {
        name: 'Importing every sense into one verse',
        body: 'A word that can mean five things means one or two of them in any given sentence, chosen by context. Loading the whole dictionary entry into your verse produces richness the author never put there.',
      },
      {
        name: 'Chasing the English word instead of the original',
        body: 'Searching "love" in English rounds up several different Greek and Hebrew words and calls them one. The Strong’s number exists exactly so you can follow the actual word — use it.',
      },
      {
        name: 'Skimming the occurrence list instead of reading passages',
        body: 'Forty references glanced at teach less than three read properly, because glances only confirm what you already thought. The method is reading, and the concordance is just the map to where the reading is.',
      },
    ],
    goDeeper: [
      {
        reference: 'Ruth 1:8, 2:20, 3:10',
        why: 'Hesed threads through the whole book — follow one word and you have followed the plot.',
      },
      {
        reference: 'Isaiah 40:27–31',
        why: 'The famous "wait" is qavah — reading its other occurrences turns a passive verse into a taut one.',
      },
      {
        reference: 'John 15:4–10',
        why: 'One Greek word, meno — abide, remain, dwell — repeated ten times in seven verses; the repetition is invisible in some translations and is the whole point.',
      },
    ],
  },

  /* ── Read together ──────────────────────────────────────────────────── */
  {
    slug: 'read-together',
    essay: [
      'When the wall around Jerusalem was finally rebuilt, the people did not scatter to read about it privately. They gathered in a square, Ezra opened the book on a wooden platform, and readers went through the law aloud while Levites moved among the crowd "giving the sense" — explaining, as they went, what the words meant. The people stood listening from first light until midday. Whatever else that scene is, it is the Bible’s own picture of how the Bible gets read: out loud, in company, with the meaning worked out together on the spot.',
      'It was the ordinary picture for most of the centuries since. Scrolls were rare and expensive; most believers for most of history could not have owned a Bible, and many could not have read one. Scripture was something heard in a room full of other people — which is why Paul tells Timothy to devote himself to the public reading, and why the letters keep assuming a listening "you" that is plural. A private Bible on a private shelf, read silently by one person, is a very recent way to hold this book. A good one. But the exception, not the rule.',
      'Something real is lost when the exception becomes the only practice, and it is not warmth — it is correction. Alone, you cannot easily tell the difference between what the text says and what you always assume it says; your blind spots read along with you, nodding. Another reader is the cheapest instrument ever devised for detecting them. They noticed the verse you skated over. They were not troubled by the line that stopped you cold. They grew up hearing the passage used one way, and you another, and the gap between you is where the actual text starts becoming visible.',
      'The practice does not require a program, a workbook, or a leader with answers. It requires one other person and a shared passage — read separately beforehand, so both of you arrive having actually met the text rather than encountering it cold in front of an audience. Then two honest offerings each: the thing you noticed, and the thing you did not follow. That second one is the engine. Admitting confusion out loud is the moment the meeting stops being performance, and nearly everything good that happens afterward comes through that door.',
      'Expect disagreement, and do not treat it as failure. The stranger on the Emmaus road found two readers who had the whole story and had assembled it into despair; the correction came from outside them, walking alongside. Your reading partner is not that stranger — but the shape holds: it is other voices that break the private version open. Some differences will resolve in an hour. Some should be left standing, honestly unresolved, until the next passage or the next year loosens them. A question carried between two people keeps working long after the meeting ends.',
      'Keep it small and keep it plain. Two people is a reading; three is a study; much past that and you have a schedule, a host, and a reason to cancel. The mechanics matter less than the recurrence — same rhythm, same honesty, passage after passage. What builds is not just better readings, though the readings do get better. It is a shared history with the book: an accumulating set of passages you have walked through with a witness, which is how this book was almost always meant to be walked.',
    ],
    steps: [
      {
        step: 'Find one person. Two is a study; three is a schedule.',
        how: 'Ask someone specific, and ask small: one passage, one conversation, no commitment beyond it. A spouse, a friend, someone from church, someone further from faith than you — difference of vantage is an asset here, not a problem. Let the habit form before you let it grow.',
      },
      {
        step: 'Read the same passage separately, before you meet.',
        how: 'Agree on a short passage and each read it alone during the week, more than once if you can. Arriving prepared changes the meeting from a cold reading into a comparison of two real encounters. Keep the passage short enough that neither of you can plead time.',
      },
      {
        step: 'Each say the one thing you noticed and the one thing you did not follow.',
        how: 'One of each, and confusion is not optional — the admission is what makes the honesty mutual. Then talk about the gaps: why one of you snagged where the other glided through. Resist settling questions by whoever sounds most certain; go back to the text and look together.',
      },
      {
        step: 'Leave the unresolved thing unresolved. Come back to it.',
        how: 'Name the open question out loud, write it down, and end the meeting without forcing a verdict. Next time, start by asking whether the week changed anything. Some questions close on the second visit; some become the long companions of the reading — both outcomes are the practice working.',
      },
    ],
    mistakes: [
      {
        name: 'Waiting until you feel qualified',
        body: 'The method needs two readers, not an expert and a pupil — the eunuch’s "how can I, unless someone guides me?" was answered by a fellow traveller, not a credential. Your confusion, offered honestly, is a contribution.',
      },
      {
        name: 'Letting one voice give all the answers',
        body: 'When the same person always resolves every question, the other has stopped reading and started attending. Trade who speaks first, and treat "I read it differently" as the beginning of the work rather than a problem to manage.',
      },
      {
        name: 'Arriving unread',
        body: 'Meeting the passage for the first time in front of each other produces reactions, not readings. The separate reading beforehand is the practice; the conversation is just where it becomes visible.',
      },
      {
        name: 'Forcing agreement before parting',
        body: 'Closing every gap by the end of the hour usually means the more tired reader conceded. An honest open question, carried to the next meeting, does more work than a hasty consensus.',
      },
    ],
    goDeeper: [
      {
        reference: 'Luke 24:13–35',
        why: 'Two readers with the same texts and the same grief, and the meaning arrives through a third voice on the road.',
      },
      {
        reference: 'Acts 8:26–39',
        why: 'A man reading Isaiah alone, asked one question — the honest "how can I, unless someone guides me?" is this whole practice in a sentence.',
      },
      {
        reference: 'Ecclesiastes 4:9–12',
        why: 'Short enough to read twice in the meeting, and it argues the method’s own case: two are better than one.',
      },
    ],
  },
]

/**
 * The essay for one guide slug. THROWS when no essay exists — a guide listed
 * in GUIDES without its essay is a build defect, never a thinner page
 * (Development Rule 1).
 */
export function getGuideEssay(slug: string): GuideEssay {
  const essay = GUIDE_ESSAYS.find((e) => e.slug === slug)
  if (!essay) {
    throw new Error(`no guide essay for slug: ${slug}`)
  }
  return essay
}
