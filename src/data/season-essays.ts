/**
 * The Season, explained — companion bank to `liturgicalDay` in
 * src/lib/liturgical.ts.
 *
 * Founder, 2026-08-18: "The season week after Pentecost is poorly designed,
 * and can be a more elaborate section detailing what the week or the feast
 * is. It's so arbitrary, no one will know what it is." This module is the
 * fix: for every season the calendar can emit, a plain name a stranger can
 * read, when it runs, the traditional color and why, an essay on what the
 * season IS, and a one-sentence pattern that explains a numbered week —
 * so "12th Week after Pentecost" never renders as a bare, unexplained
 * number again. Every feast the calendar can name gets the same treatment.
 *
 * HISTORY POLICY (same line the rest of the paper holds): historical claims
 * appear only where genuinely documented — the fourth-century keeping of
 * December 25 in the West, the Council of Ephesus on Theotokos, the 335
 * dedication behind Holy Cross Day, the Nicene reckoning of Easter's date.
 * Everywhere else these essays describe what the church does and what the
 * scriptures record. Nothing invented.
 *
 * Typing SEASON_ESSAYS as a total Record over `LiturgicalSeason` means a
 * new season cannot be added to the calendar without the compiler demanding
 * an essay for it, and `getSeasonEssay` throws at runtime if one is ever
 * missing anyway — a new season must not render unexplained. Pure data +
 * pure functions: safe to import page-side on Workers, no fs, no clock, no
 * randomness.
 */
import type { LiturgicalDay, LiturgicalSeason } from '@/lib/liturgical'

export interface SeasonEssay {
  /** Display name, identical to the `seasonLabel` the calendar emits. */
  name: string
  /** What a stranger calls it — name plus a one-breath description. */
  plainName: string
  /** When the season runs, in plain words. */
  span: string
  /** The traditional liturgical color, plus one line on why. */
  color: string
  /** Hex for the color swatch. Matches ChurchYearCard's palette. */
  colorHex: string
  /** 120–180 words on what the season IS and what the church does in it. */
  essay: string
  /**
   * One-sentence pattern explaining a numbered week. For seasons that
   * number their weeks the literal token "Nth" is replaced with the
   * ordinal from the day label ("12th"); for seasons that keep no
   * numbered weeks it is a plain sentence saying how the season counts.
   */
  thisWeek: string
}

export interface FeastEssay {
  /** Display name, identical to the string the calendar emits. */
  name: string
  /** Date-ish: when the feast falls, in plain words. */
  when: string
  /** 60–120 words on what the day commemorates. Documented only. */
  essay: string
}

/** The assembled, render-ready explanation for one liturgical day. */
export interface SeasonEssayView {
  name: string
  plainName: string
  span: string
  color: string
  colorHex: string
  essay: string
  /**
   * The day label rendered THROUGH the season's thisWeek pattern — a
   * numbered week arrives as a full sentence with the number explained,
   * a named day arrives as its own one-sentence explanation. Never a
   * bare "12th Week after Pentecost".
   */
  weekLine: string
}

/* ── Seasons ──────────────────────────────────────────────────────────── */

export const SEASON_ESSAYS: Record<LiturgicalSeason, SeasonEssay> = {
  advent: {
    name: 'Advent',
    plainName: 'Advent — the four weeks of waiting before Christmas',
    span: 'From the fourth Sunday before Christmas — late November or the first days of December — through December 24.',
    color:
      'Purple — the old color of penitence and of kings, worn for a season that waits for one.',
    colorHex: '#5b3a8e',
    essay:
      'The church starts its year in the dark, on purpose. Advent — from the Latin adventus, "arrival" — is the four weeks before Christmas, and it is not an early celebration of the feast. It is the wait for it. The readings look two directions at once: back to Israel waiting centuries for a promised Messiah, and forward to the return of Christ, which the church is still waiting for. So the season is quiet on purpose. Churches that keep it hold off on the carols, light one more candle on a wreath each Sunday, and let the ache build. That is Advent’s whole argument: you cannot hear "a child is born" as news if you have never stood in the dark wanting one. Four weeks is short. The waiting it rehearses is most of a life, and the season is honest about that — it teaches a hope that has learned how to sit still.',
    thisWeek:
      'The Nth Sunday of Advent lights one more candle against the dark — four Sundays of waiting, counted down toward Christmas.',
  },
  christmas: {
    name: 'Christmas',
    plainName:
      'Christmas — the twelve-day feast of the Nativity, December 25 to January 5',
    span: 'December 25 through January 5 — the twelve days ending on the eve of Epiphany.',
    color:
      'White — the color of feast and joy, kept for the brightest days of the year.',
    colorHex: '#efe5d8',
    essay:
      'Christmas here is not a day; it is a season — twelve days of feast, from December 25 to the eve of Epiphany. The date has been kept in the West since at least the fourth century, and what it celebrates is stated plainly in John’s Gospel: the Word became flesh and dwelt among us. Not appeared. Not visited. Became. The church gives that sentence twelve days because it takes at least that long to say it without flinching — God with a body, a birthday, a mother. The world’s version of Christmas ends at midnight on the 25th, exhausted. The church’s version starts there and keeps going, unhurried, while the trees come down around it. Inside the twelve days sit the feasts of Stephen, of John, and of the Holy Innocents — martyrdom, testimony, and grief, right up against the crib. The season never pretends the story is safe.',
    thisWeek:
      'Christmas keeps no numbered weeks — it is one feast held for twelve days, from December 25 to the eve of Epiphany.',
  },
  epiphany: {
    name: 'Epiphany',
    plainName:
      'Epiphany — the season of showing, from January 6 until Lent begins',
    span: 'From January 6 until Ash Wednesday — anywhere from four to nine weeks, depending on when Easter falls.',
    color:
      'Green — the color of growth, worn through the counted weeks between the great feasts.',
    colorHex: '#3a6b4a',
    essay:
      'Epiphany means "showing," and that is the season’s entire subject. It opens on January 6 with the magi — foreigners following a star to a Jewish child, the first hint that this birth is news for everyone — and the Sundays that follow keep widening the reveal: Jesus baptized in the Jordan while a voice names him the beloved Son; water turned to wine at Cana, the first sign. The question underneath the whole stretch is quietly shifting from whether the child was born to who he turns out to be. In many churches these are simply counted as ordinary weeks; the older name for the stretch, kept here, is the season after Epiphany. It runs until Ash Wednesday cuts it off — some years four weeks, some years nine, depending on where Easter lands. However long it lasts, the work is the same: watching, and revising your answer.',
    thisWeek:
      'The weeks after Epiphany are not numbered on this page — the season simply runs from January 6 until Ash Wednesday interrupts it.',
  },
  lent: {
    name: 'Lent',
    plainName: 'Lent — the forty days of fasting before Easter',
    span: 'From Ash Wednesday to the edge of Holy Week — forty days before Easter, not counting Sundays.',
    color:
      'Purple — the color of penitence, worn for the church’s long season of turning around.',
    colorHex: '#5b3a8e',
    essay:
      'Lent is forty days walked deliberately toward a cross. It opens on Ash Wednesday, when the church marks foreheads with ash and says the oldest true thing it knows: remember that you are dust. The forty days echo Jesus’s forty in the wilderness, and the Sundays are not counted — every Sunday, even in Lent, is a little Easter. The season’s classic practices are fasting, prayer, and giving to the poor, and none of them is a performance of misery. Fasting is just the honest admission, made with the body, that we were never sustained by bread alone. In the early church these weeks were the final stretch of preparation for baptism at Easter, and the season still carries that shape: it is training, not punishment. Nobody keeps Lent perfectly. That is close to the point. The season exists for people who already know they can’t.',
    thisWeek:
      'The Nth week of Lent counts the forty days from Ash Wednesday toward the cross, one deliberate week at a time.',
  },
  'holy-week': {
    name: 'Holy Week',
    plainName:
      'Holy Week — the last week before Easter, from Palm Sunday to the tomb',
    span: 'The seven days before Easter — Palm Sunday through Holy Saturday, moving day by day.',
    color:
      'Red — the color of blood and of passion, for the week the church walks toward the cross.',
    colorHex: '#a8252a',
    essay:
      'For fifty-one weeks a year the church summarizes. In Holy Week it stops and walks. The week moves almost hour by hour through the last days of Jesus: the entry into Jerusalem on Palm Sunday, crowds and cloaks and branches on the road; the last supper on Maundy Thursday, where he washed his friends’ feet and gave the commandment the day is named for — love one another; the crucifixion on Good Friday; and then Holy Saturday, the strangest day in the calendar, when nothing is celebrated at all and the church simply waits at a sealed tomb. Pilgrims in Jerusalem were already keeping this week as a walk — actual places, actual days — by the fourth century, and the shape has not changed since. The week refuses to skip ahead. Whatever Easter is going to mean, the church insists you arrive at it the long way, through Friday.',
    thisWeek:
      'Holy Week does not count weeks at all — it counts days, walking from Palm Sunday to the tomb one day at a time.',
  },
  easter: {
    name: 'Easter',
    plainName: 'Easter — the fifty-day feast of the resurrection',
    span: 'From Easter Sunday through the eve of Pentecost — fifty days, always in spring, the date set by the moon.',
    color:
      'White — the color of resurrection light, worn from the empty tomb to Pentecost.',
    colorHex: '#efe5d8',
    essay:
      'Easter is the oldest feast the church has, and it is not a day. It is fifty days — a week of weeks and one day more, running from the empty tomb to Pentecost. Lent was forty days; the feast outlasts the fast on purpose. The date moves because it is set by the moon: the Sunday after the first full moon of spring, a reckoning settled in the fourth century, which is why Easter wanders across March and April dragging half the calendar behind it. Inside the fifty days the readings stay with the strange, bodily appearances of the risen Jesus — eating fish, showing scars, cooking breakfast on a beach — and on the fortieth day comes the Ascension. The length is the argument. An answer to Good Friday that lasted one morning could be mistaken for a mood. Fifty days of feasting is a verdict, and the church renders it every spring.',
    thisWeek:
      'The Nth week of Easter counts the fifty days of feasting between the empty tomb and the Spirit’s arrival at Pentecost.',
  },
  pentecost: {
    name: 'Pentecost',
    plainName: 'Pentecost — the day the Spirit came, fifty days after Easter',
    span: 'One day — the fiftieth day of Easter, seven weeks after Easter Sunday, falling in May or June.',
    color:
      'Red — the color of fire, for the flames that rested on the disciples.',
    colorHex: '#a8252a',
    essay:
      'Pentecost is Greek for "fiftieth." The name belonged first to a Jewish harvest feast — Shavuot, the Feast of Weeks, fifty days after Passover — and Jerusalem was crowded for it when, as Acts 2 tells it, the followers of Jesus heard a sound like rushing wind and saw what looked like tongues of fire resting on each of them. They began proclaiming the good news, and every pilgrim in the crowd heard it in their own language. That is the day’s whole shape: the Spirit arrives, and the message immediately goes multilingual. The church has long called Pentecost its birthday, because this is where a huddled room of disciples becomes a public, spreading community. The vestments are red for the fire. In this calendar Pentecost is a single day — but the longest season of the year is counted from it, week by week, which tells you how far the wind carried.',
    thisWeek:
      'Pentecost is a single day, not a stretch of weeks — the fiftieth day of Easter, and the hinge into the long season that borrows its name.',
  },
  ordinary: {
    name: 'Ordinary Time',
    plainName: 'Ordinary Time — the long green season after Pentecost',
    span: 'From the day after Pentecost until Advent begins in late November — roughly half the year, all summer and autumn.',
    color:
      'Green — the color of things that grow, worn for the long season of ordinary growth.',
    colorHex: '#3a6b4a',
    essay:
      '"Ordinary" here does not mean unremarkable. It comes from the same root as "ordinal" — these are the counted weeks, numbered one after another from Pentecost all the way to Advent. It is the longest season of the church year, roughly half of it, covering the whole green stretch of summer and autumn, and it has no headline feast to organize it. That is deliberate. The festival half of the year announces what God has done — birth, death, resurrection, Spirit. Ordinary Time is where the church practises living as if all of that were true, in weeks that look exactly like the ones before them. It opens with Trinity Sunday, naming the whole mystery at once, and it ends with the last Sundays turning toward judgment and hope, just before Advent starts the year again in the dark. Most of the Christian life is lived here. The season simply admits it.',
    thisWeek:
      'The Nth week after Pentecost counts the church’s long walk of ordinary faithfulness between the Spirit’s arrival and the year’s end.',
  },
}

/* ── Named days ───────────────────────────────────────────────────────────
 * One sentence per non-numbered day label the calendar can emit — the
 * named feast days plus the season-descriptor labels. A numbered label
 * ("12th Week after Pentecost") renders through the season's thisWeek
 * pattern instead; anything else must be listed here or getSeasonEssay
 * throws, so a new day label cannot render unexplained. */

const DAY_LINES: Record<string, string> = {
  'Christmas Season':
    'These are the twelve days of Christmas — one feast held from December 25 to the eve of Epiphany, kept long on purpose.',
  'Season after Epiphany':
    'These are the weeks after Epiphany — the stretch between the magi’s star and Ash Wednesday, spent watching who this child turns out to be.',
  'Baptism of the Lord':
    'Today the church remembers Jesus stepping into the Jordan to be baptized by John — the day a voice from heaven called him the beloved Son.',
  'Ash Wednesday':
    'Today is Ash Wednesday — the first of Lent’s forty days, when the church wears ash and says out loud that we are dust.',
  'Palm Sunday':
    'Today is Palm Sunday — the start of Holy Week, when the church remembers Jesus riding into Jerusalem over a road of cloaks and branches.',
  'Holy Week':
    'This is Holy Week — the church walking the last days of Jesus one day at a time, from the palms to the tomb.',
  'Maundy Thursday':
    'Today is Maundy Thursday — the night of the last supper, when Jesus washed feet and gave the commandment the day is named for: love one another.',
  'Good Friday':
    'Today is Good Friday — the day the church keeps the crucifixion itself, the darkest and strangest thing it dares to call good.',
  'Holy Saturday':
    'Today is Holy Saturday — the silent day between cross and resurrection, when the church waits at a sealed tomb and says almost nothing.',
  'Easter Sunday':
    'Today is Easter Sunday — the feast of the resurrection, the morning the tomb was found empty and everything started over.',
  'Ascension of the Lord':
    'Today the church keeps the Ascension — the fortieth day of Easter, when the risen Jesus was taken up and his followers were told to wait for the Spirit.',
  Pentecost:
    'Today is Pentecost — the fiftieth day of Easter, when the Spirit arrived like wind and fire and the good news went multilingual.',
  'Trinity Sunday':
    'Today is Trinity Sunday — the first Sunday after Pentecost, when the church stops to name the whole mystery at once: Father, Son, and Holy Spirit.',
  'Ordinary Time':
    'This is Ordinary Time — counted time, not empty time: the long green stretch where the church practises what the feasts declared.',
}

/* ── Feasts ───────────────────────────────────────────────────────────────
 * Every feast the calendar can name: the 26 fixed feasts liturgicalDay
 * emits through its `feast` field, plus the 10 movable feast days it
 * names through `dayLabel`. Keys are the exact strings the calendar
 * emits. */

export const FEAST_ESSAYS: Record<string, FeastEssay> = {
  /* — Fixed feasts, in calendar order — */
  'Mary, Mother of God': {
    name: 'Mary, Mother of God',
    when: 'January 1 — the eighth day of Christmas',
    essay:
      'The octave day of Christmas — the eighth day of the feast — kept in honor of Mary under her oldest title. The Council of Ephesus in 431 affirmed her as Theotokos, "God-bearer": the point being made was about her son, that the child she carried was truly God. Luke’s Gospel puts the eighth day to work too — it is the day the infant was circumcised and given his name, Jesus. So the year opens with a mother, a name, and a claim the church has never softened.',
  },
  'Epiphany of the Lord': {
    name: 'Epiphany of the Lord',
    when: 'January 6 — the day after the twelve days of Christmas end',
    essay:
      'Epiphany means "showing." The feast keeps the visit of the magi in Matthew’s Gospel — foreign scholars following a star to Bethlehem, kneeling, and opening their treasure for a child who was not born to their people. It is the church’s oldest way of saying the good news was never a local story. In the Christian East the same day centers on the baptism of Jesus in the Jordan. Either way the subject is the same: God going public.',
  },
  'Conversion of Paul': {
    name: 'Conversion of Paul',
    when: 'January 25',
    essay:
      'The day the church remembers the Damascus road. Acts tells the story three times: Saul of Tarsus, traveling with warrants to arrest followers of Jesus, is knocked flat by a light and a question — "Saul, Saul, why do you persecute me?" He gets up blind, and receives his sight back from one of the very people he came to arrest. The persecutor becomes the apostle Paul, whose letters fill much of the New Testament. The feast is the calendar’s standing reminder that nobody is a lost cause.',
  },
  'Presentation of the Lord': {
    name: 'Presentation of the Lord',
    when: 'February 2 — forty days after Christmas',
    essay:
      'Forty days after Christmas, the feast keeps the scene in Luke 2: Mary and Joseph bring the infant Jesus to the temple, as the law required, and two old people are waiting. Simeon takes the child in his arms and says he can die in peace now — his eyes have seen a light for the nations. The prophet Anna starts telling everyone. From that word "light" comes the old custom of blessing candles on this day, and the feast’s folk name: Candlemas.',
  },
  'Chair of Peter': {
    name: 'Chair of Peter',
    when: 'February 22',
    essay:
      'An ancient Roman feast — not of a piece of furniture, but of what the chair stands for: the teaching office of Peter, the fisherman Jesus renamed "rock" and told to feed his sheep. A chair, in the ancient world, was where a teacher sat to teach with authority. The day gives thanks for Peter’s ministry of steadying the early church, and it is kept as a feast of unity — one flock, however scattered, gathered around one apostolic faith.',
  },
  'Joseph, Husband of Mary': {
    name: 'Joseph, Husband of Mary',
    when: 'March 19',
    essay:
      'The feast of the quiet man in the story. Matthew’s Gospel calls Joseph "a just man," and everything he does is done without a single recorded word: he takes Mary as his wife when the expected move was to leave, he gets the child out of Herod’s reach in the night, he raises a son he did not father and teaches him a trade. The church honors him as patron of workers and of fathers — proof that faithfulness rarely needs a speech.',
  },
  'Annunciation of the Lord': {
    name: 'Annunciation of the Lord',
    when: 'March 25 — nine months before Christmas',
    essay:
      'Nine months before Christmas, the feast of the announcement. Gabriel comes to a young woman in Nazareth with news that is by every measure impossible, and the request underneath it asks nothing less than her whole life. Luke records her answer: "Let it be to me according to your word." The church has always insisted the incarnation begins here — not at Bethlehem but at that yes, in an ordinary room. It is the hinge of the whole calendar, kept quietly in the middle of Lent most years.',
  },
  'Nativity of John the Baptist': {
    name: 'Nativity of John the Baptist',
    when: 'June 24 — six months before Christmas',
    essay:
      'The church keeps almost no birthdays — Jesus, Mary, and this one. Luke gives John’s birth a full chapter: the old priest Zechariah struck silent for doubting, the elderly Elizabeth pregnant at last, the neighbors astonished, and the father’s voice returning in a song of praise. John is born six months ahead of his cousin, which is exactly the job — the forerunner, the voice in the wilderness, sent ahead to get the road ready. His feast sits opposite Christmas on the calendar for the same reason.',
  },
  'Peter & Paul': {
    name: 'Peter & Paul',
    when: 'June 29',
    essay:
      'The two great apostles, kept on one day. Peter, the fisherman who denied Jesus three times and was three times told to feed his sheep; Paul, the persecutor turned missionary who carried the message across the Roman world. Early and steady tradition holds that both were martyred in Rome under Nero — Peter crucified, Paul beheaded — and the church there has honored them together since ancient times. Two very different men, one faith, one city, one feast.',
  },
  'Transfiguration of the Lord': {
    name: 'Transfiguration of the Lord',
    when: 'August 6',
    essay:
      'The feast of the mountain. Jesus takes Peter, James, and John up a high mountain and is transfigured before them — his face shining like the sun, his clothes dazzling white, Moses and Elijah talking with him, and a voice from the cloud saying: this is my beloved Son, listen to him. The Gospels place the scene just before the road turns toward Jerusalem and the cross. The disciples were given one unbearable glimpse of who they were following, and then told to walk back down.',
  },
  'Assumption of Mary': {
    name: 'Assumption of Mary',
    when: 'August 15',
    essay:
      'The oldest and greatest of Mary’s feasts. Roman Catholic teaching, defined as dogma in 1950, holds that at the end of her earthly life Mary was taken body and soul into the glory of heaven. The Christian East has kept the same date far longer as the Dormition — her "falling asleep." Different vocabularies, one conviction: the woman who bore Christ was not abandoned to the grave, and what God did for her is a preview of what resurrection means.',
  },
  'Beheading of John the Baptist': {
    name: 'Beheading of John the Baptist',
    when: 'August 29',
    essay:
      'The darker of John’s two feasts. Mark 6 tells the story without flinching: John imprisoned for telling Herod Antipas the truth about his marriage, a birthday banquet, a dance, a rash oath, and a mother’s instruction to her daughter — ask for the head of John the Baptist, on a platter. The forerunner’s death runs ahead of Jesus’s own: truth told to power, a weak ruler, an execution. The church keeps the day as a feast of costly honesty.',
  },
  'Nativity of Mary': {
    name: 'Nativity of Mary',
    when: 'September 8 — nine months after December 8',
    essay:
      'The birthday of Mary, kept nine months after the feast of her conception in December. The Gospels say nothing about her birth; the feast rests on early Christian tradition, which named her parents Joachim and Anne. What the church celebrates is not a documented scene but a plain conviction: the story of redemption has a supporting cast, and a girl born in obscurity would one day be asked to carry its center. Her birth is kept as a small dawn before sunrise.',
  },
  'Exaltation of the Holy Cross': {
    name: 'Exaltation of the Holy Cross',
    when: 'September 14',
    essay:
      'A feast born in fourth-century Jerusalem. In 335 the Church of the Holy Sepulchre was dedicated over the sites of the crucifixion and the tomb, and tradition holds that the cross itself, found by Helena, mother of the emperor Constantine, was lifted up there for the people to venerate. The day does what its name says: it holds up the most shameful instrument the Roman state owned and calls it the tree of life. The means of execution became the sign of hope.',
  },
  'Michael, Gabriel, Raphael — Archangels': {
    name: 'Michael, Gabriel, Raphael — Archangels',
    when: 'September 29 — Michaelmas',
    essay:
      'The feast of the three angels scripture names. Michael — "who is like God?" — the warrior of Daniel and Revelation who contends against the dragon; Gabriel, the messenger of Daniel and of Luke, who brings the announcements that change everything; Raphael — "God heals" — the traveling companion of the book of Tobit. The day is Michaelmas in the old English reckoning, once so fixed a landmark that it named a whole season of the year. It is a reminder that the seen world is not the whole inventory.',
  },
  'Francis of Assisi': {
    name: 'Francis of Assisi',
    when: 'October 4',
    essay:
      'Francis died at Assisi on the evening of October 3, 1226, and the church keeps his feast the next day. A wealthy cloth merchant’s son who heard "rebuild my church" and took it literally, then radically: he gave everything away, embraced lepers, and preached to anyone who would listen — birds included, the stories say — founding a movement built on owning nothing. His Canticle of the Creatures praises God through Brother Sun and Sister Moon. Eight centuries on, he remains the saint even skeptics like.',
  },
  'All Saints': {
    name: 'All Saints',
    when: 'November 1',
    essay:
      'The feast of the whole cloud of witnesses — not just the famous saints with days of their own, but every faithful life that never made the calendar. The church has kept a day for all its holy dead since ancient times, and this is it: one feast for the named and the nameless, the martyrs and the grandmothers. The claim underneath it is the communion of saints — that the church is bigger than the living, and that nobody who died in Christ has left it.',
  },
  'All Souls': {
    name: 'All Souls',
    when: 'November 2',
    essay:
      'All Saints looks up; All Souls looks around the graveyard. This is the commemoration of all the faithful departed — the day for grief, candles, and names said out loud. The observance spread through the Western church from the monastery of Cluny about a thousand years ago, and even traditions that pray for the dead differently, or not at all, keep its heart: remembrance. Death does not get to end the conversation, and the people we have buried are not lost — they are ahead.',
  },
  'Andrew the Apostle': {
    name: 'Andrew the Apostle',
    when: 'November 30',
    essay:
      'The first-called. In John’s Gospel, Andrew is a disciple of John the Baptist who hears him say "Behold, the Lamb of God," follows Jesus — and then does the thing he is remembered for: he finds his brother Simon Peter and brings him along. Later tradition holds he was martyred on an X-shaped cross, the saltire on Scotland’s flag; he is that nation’s patron. His feast also anchors the calendar itself: the church year begins on the Sunday nearest this day.',
  },
  'Nicholas of Myra': {
    name: 'Nicholas of Myra',
    when: 'December 6',
    essay:
      'A fourth-century bishop of Myra, on the coast of what is now Turkey, remembered for secret generosity — the most famous story has him throwing bags of gold through a poor man’s window at night to save three daughters from being sold. Reliable records of his life are thin; the reputation is not. Sailors, children, and the falsely accused all claimed him as patron, and his name, worn down through Dutch, became Santa Claus. The original gave anonymously, and gave first to the desperate.',
  },
  'Immaculate Conception': {
    name: 'Immaculate Conception',
    when: 'December 8 — nine months before the Nativity of Mary',
    essay:
      'Often misread as being about the conception of Jesus, this feast is about Mary — kept nine months before her September birthday. Roman Catholic teaching, defined as dogma in 1854, holds that Mary was conceived without original sin: prepared from her first instant to carry the one she would bear. Other traditions honor the day differently or not at all, but the instinct underneath it is old and widely shared — that grace was at work in this story long before Bethlehem.',
  },
  'Lucy of Syracuse': {
    name: 'Lucy of Syracuse',
    when: 'December 13',
    essay:
      'A young woman of Syracuse, in Sicily, martyred in the persecution under Diocletian at the start of the fourth century. Her name comes from lux — light — and her feast sits in the darkest stretch of the year, which is why she is kept with candles: in Scandinavia, processions still follow a girl wearing a crown of them. The details of her death grew in the telling, but the core is documented and plain: she would not renounce Christ, and it cost her life.',
  },
  'The Nativity of the Lord': {
    name: 'The Nativity of the Lord',
    when: 'December 25 — Christmas Day',
    essay:
      'Christmas Day — the feast of the birth of Jesus at Bethlehem, kept on this date in the West since at least the fourth century. Luke gives the census, the manger, and the shepherds; John states what it means: the Word became flesh and dwelt among us. It is the feast of the incarnation — God arriving not in force but as an infant, born to a poor family in an occupied province. Everything else in the calendar unfolds from this night.',
  },
  'Stephen, First Martyr': {
    name: 'Stephen, First Martyr',
    when: 'December 26 — the second day of Christmas',
    essay:
      'The day after Christmas, the church keeps its first martyr. Acts 6–7 tells it: Stephen, chosen to wait on tables, full of grace and power, argues his accusers to a standstill and is stoned for it — praying, as he dies, that the sin not be held against them. A young man named Saul watches the coats. The calendar’s placement is deliberate and unsentimental: one day into the feast of the birth, the cost of the story is already on the table.',
  },
  'John, Apostle & Evangelist': {
    name: 'John, Apostle & Evangelist',
    when: 'December 27 — the third day of Christmas',
    essay:
      'The third day of Christmas belongs to John — apostle, son of Zebedee, and by long tradition the beloved disciple of the fourth Gospel, the one who reclined next to Jesus at the last supper and stood at the cross. Tradition holds that he alone of the twelve died in old age rather than by martyrdom. His feast sits inside Christmas because his Gospel’s opening is the feast’s deepest text: in the beginning was the Word, and the Word became flesh.',
  },
  'Holy Innocents': {
    name: 'Holy Innocents',
    when: 'December 28 — the fourth day of Christmas',
    essay:
      'The bleakest feast in the calendar, kept three days after Christmas. Matthew 2 records it: Herod, outwitted by the magi and afraid of a rival king, orders the death of the boys of Bethlehem two years old and under. The church has honored those children as martyrs from early times — witnesses who died not for confessing Christ but in his place. The feast keeps the church honest about the world the child was born into, and it stands with every parent who has buried a child.',
  },

  /* — Movable feasts, named through the day label — */
  'Baptism of the Lord': {
    name: 'Baptism of the Lord',
    when: 'The Sunday after Epiphany, in January',
    essay:
      'The feast of the Jordan. Jesus comes from Nazareth to be baptized by John — who protests that it should be the other way around — and as he comes up out of the water the sky opens, the Spirit descends like a dove, and a voice says: this is my beloved Son. It is the moment the hidden years end and the public ministry begins. The church keeps it on the Sunday after Epiphany, as the second great "showing" of the season.',
  },
  'Ash Wednesday': {
    name: 'Ash Wednesday',
    when: 'Forty-six days before Easter, in February or March',
    essay:
      'The first day of Lent. The church marks foreheads with ash — traditionally burned from the previous year’s palm branches — and says the words from Genesis: remember that you are dust, and to dust you shall return. It is the one day of the year given entirely to that sentence. Nothing about it is morbid; it is orientation. The forty days toward Easter begin with an honest inventory of what we are, so that the resurrection can land on someone telling the truth.',
  },
  'Palm Sunday': {
    name: 'Palm Sunday',
    when: 'The Sunday before Easter',
    essay:
      'The gate of Holy Week. Jesus rides into Jerusalem on a donkey — a deliberate, unmistakable echo of Zechariah’s prophecy of a humble king — while crowds spread cloaks and branches on the road and shout Hosanna. All four Gospels record it, and the church has walked it in procession, palms in hand, since at least the fourth century. The day carries its own shadow: many churches read the whole passion narrative before it ends, because the crowd that shouted Hosanna is days from shouting something else.',
  },
  'Maundy Thursday': {
    name: 'Maundy Thursday',
    when: 'The Thursday before Easter',
    essay:
      'The night of the last supper. Jesus shares a final meal with his friends, takes bread and wine and gives them a meaning the church has repeated ever since — this is my body, this is my blood — and then ties a towel around his waist and washes their feet. "Maundy" is worn down from the Latin mandatum, "commandment," for what he said as he did it: a new commandment I give you, that you love one another. The night ends in a garden, with an arrest.',
  },
  'Good Friday': {
    name: 'Good Friday',
    when: 'The Friday before Easter',
    essay:
      'The day of the crucifixion — the darkest and strangest thing the church dares to call good. Jesus is tried before Pilate, flogged, and executed on a Roman cross outside Jerusalem, with the charge "King of the Jews" posted over his head. The church keeps the day stripped bare: no feast, no flowers, and in many traditions no communion — just the reading of the passion, prayer, and the cross itself. The good in the name is the claim that this death, of all deaths, was for us.',
  },
  'Holy Saturday': {
    name: 'Holy Saturday',
    when: 'The day between Good Friday and Easter',
    essay:
      'The silent day. Jesus is dead and buried; the tomb is sealed; the disciples are behind locked doors; and the church, uniquely in the whole year, celebrates nothing all day. The old creeds say he descended to the dead — even that realm gets its visit. Then, after nightfall, the silence breaks: the Easter Vigil, the church’s most ancient service, kindles new fire in the dark, tells the whole story of salvation from creation forward, and announces the resurrection before dawn.',
  },
  'Easter Sunday': {
    name: 'Easter Sunday',
    when: 'The Sunday after the first full moon of spring — late March or April',
    essay:
      'The feast of the resurrection, and the oldest feast Christians keep. Early on the first day of the week, the women who came to the tomb with spices found the stone rolled away and the body gone, and were told: he is not here, he has risen. Every Sunday of the year is a small echo of this one. Its date — the Sunday after the first full moon of spring, a reckoning settled in the fourth century — is why it moves, dragging the whole calendar with it.',
  },
  'Ascension of the Lord': {
    name: 'Ascension of the Lord',
    when: 'The fortieth day of Easter — a Thursday in May or early June',
    essay:
      'The fortieth day of Easter. Acts 1 tells it: the risen Jesus, after forty days of appearing to his followers, leads them out toward Bethany, blesses them, and is taken up out of their sight — with orders to wait in the city for the Spirit. The church has never read it as a departure story. The claim is stranger than that: the man who walked out of the tomb now reigns, and human flesh has been carried into the life of God. Then, as instructed, everyone waits.',
  },
  Pentecost: {
    name: 'Pentecost',
    when: 'The fiftieth day of Easter — a Sunday in May or June',
    essay:
      'The fiftieth day of Easter and the close of its season. Jerusalem is crowded for the Jewish harvest feast of Shavuot when, as Acts 2 tells it, a sound like rushing wind fills the house, tongues as of fire rest on each disciple, and they begin to proclaim the good news — and every pilgrim hears it in their own language. Peter stands up to explain, and about three thousand people are baptized. The church has long called this day its birthday; the vestments are red for the fire.',
  },
  'Trinity Sunday': {
    name: 'Trinity Sunday',
    when: 'The Sunday after Pentecost',
    essay:
      'The Sunday after Pentecost, and an oddity in the calendar: almost every other feast marks an event, but this one marks a doctrine. With the whole story now told — Father sending, Son risen, Spirit given — the church stops for one Sunday and names the mystery at the center of it: one God, three persons. Nobody claims to fully understand it; the feast is not an explanation but a doxology. It stands at the door of Ordinary Time, so that the long green season begins with worship.',
  },
}

/* ── Assembly ─────────────────────────────────────────────────────────── */

/** "12th Week after Pentecost" → captures "12th". */
const NUMBERED_LABEL = /^(\d+(?:st|nd|rd|th))\s/

/**
 * Assemble the render-ready explanation for a computed liturgical day.
 * The day label always arrives THROUGH an explanation: numbered weeks are
 * substituted into the season's thisWeek pattern, named days get their own
 * sentence. Throws on a season or day label this bank does not know —
 * a new label must fail loudly, never render unexplained.
 */
export function getSeasonEssay(liturgical: LiturgicalDay): SeasonEssayView {
  const entry = SEASON_ESSAYS[liturgical.season]
  if (!entry) {
    throw new Error(
      `no season essay for liturgical season "${liturgical.season}" — add it to SEASON_ESSAYS before it can render`,
    )
  }

  let weekLine: string
  const numbered = NUMBERED_LABEL.exec(liturgical.dayLabel)
  if (numbered) {
    if (!entry.thisWeek.includes('Nth')) {
      throw new Error(
        `season "${liturgical.season}" emitted numbered day label "${liturgical.dayLabel}" but its thisWeek pattern has no "Nth" token to explain it`,
      )
    }
    weekLine = entry.thisWeek.replace('Nth', numbered[1])
  } else {
    const line = DAY_LINES[liturgical.dayLabel]
    if (!line) {
      throw new Error(
        `no day line for day label "${liturgical.dayLabel}" — add it to DAY_LINES before it can render`,
      )
    }
    weekLine = line
  }

  return {
    name: entry.name,
    plainName: entry.plainName,
    span: entry.span,
    color: entry.color,
    colorHex: entry.colorHex,
    essay: entry.essay,
    weekLine,
  }
}
