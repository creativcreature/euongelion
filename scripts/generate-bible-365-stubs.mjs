#!/usr/bin/env node
/**
 * generate-bible-365-stubs.mjs
 *
 * Stage 2a of the Bible-365 implementation. Reads the canonical-
 * chronological calendar (embedded below) and emits:
 *
 *   1. 365 placeholder devotional JSONs at
 *      public/devotionals/bible-365-day-{1..365}.json
 *   2. The SeriesInfo entry at src/data/bible-365.ts (re-exported into
 *      src/data/series.ts via spread merge — see series.ts for the
 *      one-line addition)
 *
 * Days 1-7 will be hand-drafted via the devotional-writer agent in
 * Stage 2b. The script generates ALL 365 stubs (including 1-7) so
 * the routes return 200 from the moment Stage 4 lands the series page.
 * Stage 2b will overwrite bible-365-day-{1..7}.json with full content.
 *
 * Idempotent — safe to re-run; rebuilds all 365 stubs.
 *
 * Run: node scripts/generate-bible-365-stubs.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DEVOTIONAL_DIR = path.join(ROOT, 'public/devotionals')
const SERIES_DATA_FILE = path.join(ROOT, 'src/data/bible-365.ts')

// ─── CALENDAR DATA ─────────────────────────────────────────────────
//
// Each day = { day, title, scripture, pivot, christLink, week }
// Q1 (weeks 1-13) hand-curated; Q2-Q4 use per-week book themes that
// the script extrapolates to 7 days per week with day-position chiastic
// labels (1=hook, 2=building, 3=pivot, 4=application, 5=resolution,
// 6=deeper, 7=sabbath).

const Q1_DETAILED = [
  // Week 1 — Creation Begins
  { day: 1,  title: 'In the beginning, God', scripture: 'Genesis 1:1-5', pivot: 'God speaks, order emerges', christLink: 'The Word who was with God (John 1:1)' },
  { day: 2,  title: 'Made in His image', scripture: 'Genesis 1:26-31', pivot: 'Human dignity grounded in God', christLink: 'Christ as the image of God (Col 1:15)' },
  { day: 3,  title: 'The first sabbath', scripture: 'Genesis 2:1-3', pivot: 'Rest precedes work', christLink: 'The greater Sabbath rest (Heb 4)' },
  { day: 4,  title: 'Not good to be alone', scripture: 'Genesis 2:18-25', pivot: 'Communion as design', christLink: 'The Bride of Christ (Eph 5:32)' },
  { day: 5,  title: 'The serpent’s question', scripture: 'Genesis 3:1-7', pivot: 'Deception by distortion', christLink: 'Christ silences the deceiver (Matt 4)' },
  { day: 6,  title: 'He will crush your head', scripture: 'Genesis 3:15', pivot: 'The first promise of redemption', christLink: 'The seed who would come (Gal 4:4)' },
  { day: 7,  title: 'Cast out, but covered', scripture: 'Genesis 3 (recap)', pivot: 'God still clothes us', christLink: 'Robe of righteousness (Isa 61)' },
  // Week 2 — Cain, Noah, Babel
  { day: 8,  title: 'Sin crouches at the door', scripture: 'Genesis 4:1-16', pivot: 'Mastering vs. yielding', christLink: 'The blood that speaks better (Heb 12:24)' },
  { day: 9,  title: 'Noah found favor', scripture: 'Genesis 6:5-8', pivot: 'Grace in a corrupt age', christLink: 'The greater rescue (1 Pet 3:20-21)' },
  { day: 10, title: 'The covenant rainbow', scripture: 'Genesis 8:20-9:17', pivot: 'God binds Himself by promise', christLink: 'The new covenant in His blood (Luke 22)' },
  { day: 11, title: 'Babel’s reach', scripture: 'Genesis 11:1-9', pivot: 'Pride scattered', christLink: 'Pentecost gathers the scattered (Acts 2)' },
  { day: 12, title: 'When language breaks', scripture: 'Genesis 11 (recap)', pivot: 'Communion fractured', christLink: 'Christ the new humanity (Eph 2:14)' },
  { day: 13, title: 'Go from your country', scripture: 'Genesis 12:1-3', pivot: 'Faith answers a call', christLink: 'All nations blessed in Him (Gal 3:8)' },
  { day: 14, title: 'What you leave to follow', scripture: 'Genesis 12 (sabbath)', pivot: 'Sabbath: rest in unseen promise', christLink: 'Christ’s invitation (Matt 4:19)' },
  // Week 3 — Abraham + Isaac
  { day: 15, title: 'He believed the Lord', scripture: 'Genesis 15:1-6', pivot: 'Righteousness reckoned by faith', christLink: 'Christ our righteousness (Rom 4:23-25)' },
  { day: 16, title: 'El Shaddai', scripture: 'Genesis 17:1-8', pivot: 'God Almighty, the covenant-binder', christLink: 'The covenant ratified at the cross (Heb 8)' },
  { day: 17, title: 'Three visitors at Mamre', scripture: 'Genesis 18:1-15', pivot: 'God appears at our table', christLink: 'The greater Visitor (John 1:14)' },
  { day: 18, title: 'Will not the Judge do right?', scripture: 'Genesis 18:16-33', pivot: 'Bold intercession', christLink: 'Christ our intercessor (Heb 7:25)' },
  { day: 19, title: 'On the mountain it will be provided', scripture: 'Genesis 22:1-14', pivot: 'Substitutionary lamb', christLink: 'The Lamb provided (John 1:29)' },
  { day: 20, title: 'What faith costs', scripture: 'Genesis 22 (deeper)', pivot: 'Surrender as worship', christLink: 'Christ’s Gethsemane "yes" (Luke 22:42)' },
  { day: 21, title: 'Trust beyond comprehension', scripture: 'Genesis 22 (sabbath)', pivot: 'Sabbath: rest in the Provider', christLink: 'Christ as our provision (Phil 4:19)' },
  // Week 4 — Jacob
  { day: 22, title: 'Despising the birthright', scripture: 'Genesis 25:19-34', pivot: 'Cheap satisfaction over inheritance', christLink: 'Esteeming Christ above all (Phil 3:7-8)' },
  { day: 23, title: 'Jacob’s ladder', scripture: 'Genesis 28:10-22', pivot: 'Heaven touches earth in mercy', christLink: 'Christ the true ladder (John 1:51)' },
  { day: 24, title: 'Wrestling till dawn', scripture: 'Genesis 32:22-32', pivot: 'God blesses the persistent', christLink: 'Christ our wrestling Advocate (Rom 8:34)' },
  { day: 25, title: 'I have seen God’s face', scripture: 'Genesis 33:1-11', pivot: 'Reconciliation as encounter', christLink: 'Christ reconciles enemies (2 Cor 5:18)' },
  { day: 26, title: 'Bury your idols', scripture: 'Genesis 35:1-15', pivot: 'New name, new altar', christLink: 'Christ gives a new name (Rev 2:17)' },
  { day: 27, title: 'Limp through life', scripture: 'Genesis (deeper)', pivot: 'Brokenness as the gift', christLink: 'Christ’s weakness our strength (2 Cor 12:9-10)' },
  { day: 28, title: 'What you wrestle for', scripture: 'Sabbath', pivot: 'Sabbath: rest after struggle', christLink: 'Christ’s finished wrestling (John 19:30)' },
  // Week 5 — Joseph
  { day: 29, title: 'Sold by your brothers', scripture: 'Genesis 37', pivot: 'Betrayal that God will use', christLink: 'Christ betrayed by His own (John 1:11)' },
  { day: 30, title: 'The Lord was with him', scripture: 'Genesis 39', pivot: 'God present in the prison', christLink: 'Christ in our suffering (Heb 4:15)' },
  { day: 31, title: 'Pharaoh’s dream', scripture: 'Genesis 41', pivot: 'God lifts the lowly', christLink: 'Christ exalted from death (Phil 2:8-9)' },
  { day: 32, title: 'I am Joseph your brother', scripture: 'Genesis 45:1-15', pivot: 'Forgiveness from the throne', christLink: 'Christ our forgiving Brother (Heb 2:11)' },
  { day: 33, title: 'You meant evil; God meant good', scripture: 'Genesis 50:15-21', pivot: 'Providence in pain', christLink: 'The cross intended for evil, accomplished good (Acts 2:23)' },
  { day: 34, title: 'When trauma becomes testimony', scripture: 'Genesis (deeper)', pivot: 'Healing by retelling', christLink: 'Christ retells our story (Luke 24:27)' },
  { day: 35, title: 'Rest in providence', scripture: 'Sabbath', pivot: 'Sabbath: trust the long arc', christLink: 'Christ holds all things (Col 1:17)' },
  // Week 6 — Exodus
  { day: 36, title: 'A slave’s cry', scripture: 'Exodus 1-2', pivot: 'God hears the oppressed', christLink: 'Christ identifies with the oppressed (Luke 4:18)' },
  { day: 37, title: 'I AM that I AM', scripture: 'Exodus 3:1-15', pivot: 'The name beyond names', christLink: 'Christ: "Before Abraham was, I AM" (John 8:58)' },
  { day: 38, title: 'Who am I?', scripture: 'Exodus 4:10-17', pivot: 'God uses the unqualified', christLink: 'Christ comes humble (Phil 2:7)' },
  { day: 39, title: 'Let my people go', scripture: 'Exodus 7-11', pivot: 'Plagues judge false gods', christLink: 'Christ’s victory over powers (Col 2:15)' },
  { day: 40, title: 'The Passover lamb', scripture: 'Exodus 12:1-13', pivot: 'Substitution by blood', christLink: 'Christ our Passover (1 Cor 5:7)' },
  { day: 41, title: 'When God hardens hearts', scripture: 'Exodus (deeper)', pivot: 'The mystery of judgment', christLink: 'Christ’s mercy held back (2 Pet 3:9)' },
  { day: 42, title: 'Rest in the rescue', scripture: 'Sabbath', pivot: 'Sabbath: God still delivers', christLink: 'Christ our greater Exodus (Luke 9:31)' },
  // Week 7 — Wilderness Begins
  { day: 43, title: 'The sea opens', scripture: 'Exodus 14', pivot: 'Salvation by faith, not work', christLink: 'Baptism into Christ (1 Cor 10:1-2)' },
  { day: 44, title: 'The song of the redeemed', scripture: 'Exodus 15', pivot: 'Worship after deliverance', christLink: 'The new song (Rev 5:9)' },
  { day: 45, title: 'Manna in the morning', scripture: 'Exodus 16', pivot: 'Daily dependence', christLink: 'Christ the bread of life (John 6:51)' },
  { day: 46, title: 'Water from the rock', scripture: 'Exodus 17:1-7', pivot: 'God strikes the source', christLink: 'Christ the smitten Rock (1 Cor 10:4)' },
  { day: 47, title: 'Sinai trembles', scripture: 'Exodus 19', pivot: 'Holy God meets His people', christLink: 'Mount Zion not Sinai (Heb 12:18-24)' },
  { day: 48, title: 'Ten Words', scripture: 'Exodus 20', pivot: 'Law as gracious boundary', christLink: 'Christ fulfills the law (Matt 5:17)' },
  { day: 49, title: 'What the law cannot do', scripture: 'Sabbath', pivot: 'Sabbath: grace over performance', christLink: 'Christ does what the law cannot (Rom 8:3)' },
  // Week 8 — Tabernacle + Holiness
  { day: 50, title: 'A sanctuary for me', scripture: 'Exodus 25:1-9', pivot: 'God dwells with His people', christLink: 'The Word tabernacled among us (John 1:14)' },
  { day: 51, title: 'The golden calf', scripture: 'Exodus 32', pivot: 'Idolatry as impatience', christLink: 'Christ our patient Mediator (1 Tim 2:5)' },
  { day: 52, title: 'Show me your glory', scripture: 'Exodus 33:12-23', pivot: 'The hunger to see God', christLink: 'Christ the radiance of God’s glory (Heb 1:3)' },
  { day: 53, title: 'Day of Atonement', scripture: 'Leviticus 16', pivot: 'Blood for the holy place', christLink: 'Christ entered once for all (Heb 9:11-12)' },
  { day: 54, title: 'Be holy as I am holy', scripture: 'Leviticus 19:1-18', pivot: 'Holiness toward neighbor', christLink: 'Christ the holy and good neighbor (Luke 10:33)' },
  { day: 55, title: 'The Lord bless you', scripture: 'Numbers 6:22-27', pivot: 'Aaronic blessing', christLink: 'Christ the everlasting blessing (Eph 1:3)' },
  { day: 56, title: 'When God’s face shines', scripture: 'Sabbath', pivot: 'Sabbath: rest under blessing', christLink: 'Christ the face of God (2 Cor 4:6)' },
  // Week 9 — Wilderness: Failure + Mercy
  { day: 57, title: 'Twelve scouts, two believers', scripture: 'Numbers 13-14', pivot: 'Faith vs. fear', christLink: 'Christ enters the rest we forfeited (Heb 4:8-11)' },
  { day: 58, title: 'Korah’s rebellion', scripture: 'Numbers 16', pivot: 'Disputing God’s appointment', christLink: 'Christ our true high priest (Heb 5)' },
  { day: 59, title: 'Bronze serpent lifted up', scripture: 'Numbers 21:4-9', pivot: 'Look and live', christLink: 'Christ lifted up that we might live (John 3:14-15)' },
  { day: 60, title: 'Balaam’s blessing', scripture: 'Numbers 22-24', pivot: 'God redirects curses', christLink: 'Christ became a curse for us (Gal 3:13)' },
  { day: 61, title: 'Hear, O Israel', scripture: 'Deuteronomy 6:4-9', pivot: 'Love the Lord your God', christLink: 'Christ summarizes the Shema (Mark 12:29-30)' },
  { day: 62, title: 'Choose life', scripture: 'Deuteronomy 30:11-20', pivot: 'Covenant decision', christLink: 'Christ is life itself (John 14:6)' },
  { day: 63, title: 'What we forget on the way', scripture: 'Sabbath', pivot: 'Sabbath: remember', christLink: 'Christ the rememberer of mercy (Luke 1:54)' },
  // Week 10 — Joshua + Conquest
  { day: 64, title: 'Be strong and courageous', scripture: 'Joshua 1:1-9', pivot: 'God’s presence is the strength', christLink: 'Christ with us always (Matt 28:20)' },
  { day: 65, title: 'Rahab’s red cord', scripture: 'Joshua 2', pivot: 'Mercy through unlikely faith', christLink: 'Christ in the lineage of the unlikely (Matt 1:5)' },
  { day: 66, title: 'Crossing into promise', scripture: 'Joshua 3-4', pivot: 'Stones of remembrance', christLink: 'Christ the living stone (1 Pet 2:4-6)' },
  { day: 67, title: 'Walls of Jericho', scripture: 'Joshua 6', pivot: 'Obedience precedes breakthrough', christLink: 'Christ tears down dividing walls (Eph 2:14)' },
  { day: 68, title: 'Achan’s hidden sin', scripture: 'Joshua 7', pivot: 'Hidden things bring exposed grief', christLink: 'Christ exposes to heal (1 Cor 4:5)' },
  { day: 69, title: 'Choose this day', scripture: 'Joshua 24', pivot: 'Decisive allegiance', christLink: 'Christ asks for all (Luke 14:33)' },
  { day: 70, title: 'Rest in the inheritance', scripture: 'Sabbath', pivot: 'Sabbath: enter the promise', christLink: 'Christ our inheritance (Eph 1:11)' },
  // Week 11 — Judges (Cycles)
  { day: 71, title: 'After that generation', scripture: 'Judges 2:6-23', pivot: 'The cycle of forgetting', christLink: 'Christ the eternal remembrance (1 Cor 11:25)' },
  { day: 72, title: 'Gideon’s fleece', scripture: 'Judges 6', pivot: 'God uses the fearful', christLink: 'Christ strengthens the timid (2 Tim 1:7)' },
  { day: 73, title: 'Three hundred', scripture: 'Judges 7', pivot: 'God wins by reduction', christLink: 'Christ glorified through weakness (2 Cor 12:9)' },
  { day: 74, title: 'Samson’s strength + folly', scripture: 'Judges 13-16', pivot: 'Gift abused', christLink: 'Christ the obedient Son (Heb 5:8)' },
  { day: 75, title: 'Where you go, I will go', scripture: 'Ruth 1', pivot: 'Loyal love in loss', christLink: 'Christ’s covenant love (Heb 13:5)' },
  { day: 76, title: 'Boaz the redeemer', scripture: 'Ruth 4', pivot: 'The kinsman who restores', christLink: 'Christ our Kinsman-Redeemer (Heb 2:14-15)' },
  { day: 77, title: 'When God writes you in', scripture: 'Sabbath', pivot: 'Sabbath: rest in inclusion', christLink: 'Christ writes our names (Rev 21:27)' },
  // Week 12 — Samuel + Saul
  { day: 78, title: 'Hannah’s tears', scripture: '1 Samuel 1', pivot: 'Prayer that produces a prophet', christLink: 'Christ the answered prayer (Heb 5:7)' },
  { day: 79, title: 'Speak, your servant hears', scripture: '1 Samuel 3', pivot: 'Listening before serving', christLink: 'Christ the listening Son (John 5:19)' },
  { day: 80, title: 'We want a king', scripture: '1 Samuel 8', pivot: 'Desiring what wounds us', christLink: 'Christ the king we needed (Luke 1:32-33)' },
  { day: 81, title: 'To obey is better than sacrifice', scripture: '1 Samuel 15', pivot: 'Religion without surrender', christLink: 'Christ the obedient unto death (Phil 2:8)' },
  { day: 82, title: 'Man looks at appearance', scripture: '1 Samuel 16', pivot: 'God sees the heart', christLink: 'Christ knows what is in man (John 2:25)' },
  { day: 83, title: 'David vs Goliath', scripture: '1 Samuel 17', pivot: 'Trust over armor', christLink: 'Christ our greater David (Rev 19:11-16)' },
  { day: 84, title: 'When God chooses the overlooked', scripture: 'Sabbath', pivot: 'Sabbath: rest in being seen', christLink: 'Christ the chosen Cornerstone (1 Pet 2:6)' },
  // Week 13 — David's Heart
  { day: 85, title: 'I will not lift my hand', scripture: '1 Samuel 24', pivot: 'Restraint as worship', christLink: 'Christ refused to call legions (Matt 26:53)' },
  { day: 86, title: 'I will establish a throne forever', scripture: '2 Samuel 7', pivot: 'Davidic covenant', christLink: 'Christ the eternal throne (Luke 1:32-33)' },
  { day: 87, title: 'You are the man', scripture: '2 Samuel 11-12', pivot: 'Sin exposed by parable', christLink: 'Christ the great revealer (Heb 4:13)' },
  { day: 88, title: 'Create in me a clean heart', scripture: 'Psalm 51', pivot: 'Repentance as new creation', christLink: 'Christ the cleanser (Eph 5:26)' },
  { day: 89, title: 'The Lord is my shepherd', scripture: 'Psalm 23', pivot: 'Rest in being shepherded', christLink: 'Christ the Good Shepherd (John 10:11)' },
  { day: 90, title: 'My God, why?', scripture: 'Psalm 22', pivot: 'Lament heard from the cross', christLink: 'Christ quoted this from the cross (Mark 15:34)' },
  { day: 91, title: 'After the worst, still loved', scripture: 'Sabbath', pivot: 'Sabbath: rest in mercy', christLink: 'Christ accepts you (Rom 5:8)' },
]

// Q2-Q4: per-week book themes. Script extends to 7 days/week with
// chiastic-position labels. Founder/writer fills detail per day later.
const Q2_Q4_WEEKS = [
  // Q2 — Kingdom (weeks 14-26)
  { week: 14, focus: "Solomon's Wisdom + Temple", book: '1 Kings 3-8', christLink: 'Christ the wisdom of God (1 Cor 1:24)' },
  { week: 15, focus: "Solomon's Drift", book: '1 Kings 11', christLink: 'Christ the faithful King forever (Heb 1:8)' },
  { week: 16, focus: 'Divided Kingdom', book: '1 Kings 12-16', christLink: 'Christ heals the divided heart (Eph 2:14)' },
  { week: 17, focus: 'Elijah Cycles', book: '1 Kings 17-19, 2 Kings 2', christLink: 'Christ greater than Elijah (Matt 17:1-8)' },
  { week: 18, focus: 'Elisha Ministry', book: '2 Kings 4-13', christLink: 'Christ heals the leper (Mark 1:40-45)' },
  { week: 19, focus: 'Northern Prophets', book: 'Amos, Hosea, Micah', christLink: 'Christ our Justice + Mercy (Mic 6:8)' },
  { week: 20, focus: "Hezekiah's Reform", book: '2 Kings 18-20', christLink: 'Christ the King who weeps for his city (Luke 19:41)' },
  { week: 21, focus: 'Josiah Finds the Book', book: '2 Kings 22-23', christLink: 'Christ the Word (John 1:1)' },
  { week: 22, focus: 'Jeremiah Weeping Prophet', book: 'Jeremiah 1-29', christLink: 'Christ the Man of Sorrows (Isa 53:3)' },
  { week: 23, focus: 'Fall of Jerusalem + Lamentations', book: 'Lamentations', christLink: 'Christ wept over Jerusalem (Luke 19:41)' },
  { week: 24, focus: 'Ezekiel Visions', book: 'Ezekiel 36-37', christLink: 'Christ gives a heart of flesh (Eph 1:18-19)' },
  { week: 25, focus: 'Daniel’s Faithfulness', book: 'Daniel 3, 6, 9', christLink: 'Christ the One like a Son of Man (Mark 14:62)' },
  { week: 26, focus: 'Esther: For Such a Time', book: 'Esther 4-7', christLink: 'Christ’s timing perfect (Gal 4:4)' },
  // Q3 — Promise (weeks 27-39)
  { week: 27, focus: 'Job: Suffering + Mystery', book: 'Job 1-2, 38-42', christLink: 'Christ the answer to "Why?" (John 11:35)' },
  { week: 28, focus: 'Psalms of Trust', book: 'Psalm 1, 8, 19, 27, 90, 121, 130, 139', christLink: 'Christ the song of the redeemed (Rev 5:9)' },
  { week: 29, focus: 'Proverbs: Daily Wisdom', book: 'Proverbs 3, 8, 16, 22, 31', christLink: 'Christ wisdom personified (1 Cor 1:30)' },
  { week: 30, focus: 'Ecclesiastes: Vanity + God', book: 'Ecclesiastes 1, 3, 12', christLink: 'Christ the meaning beneath vanity (Col 1:17)' },
  { week: 31, focus: 'Song of Songs: Covenant Love', book: 'Song 2, 6, 8', christLink: 'Christ the Bridegroom (Eph 5:25-32)' },
  { week: 32, focus: 'Isaiah: Holy One of Israel', book: 'Isaiah 6, 9, 11, 25', christLink: 'Christ the Holy One (Mark 1:24)' },
  { week: 33, focus: 'Isaiah: Suffering Servant', book: 'Isaiah 40-55', christLink: 'Christ pierced for our transgressions (Isa 53:5)' },
  { week: 34, focus: 'Jeremiah: New Covenant', book: 'Jeremiah 31', christLink: 'Christ ratifies the new covenant (Luke 22:20)' },
  { week: 35, focus: 'Ezekiel: Dry Bones Live', book: 'Ezekiel 36-37', christLink: 'Christ resurrects the dead (John 11:25)' },
  { week: 36, focus: 'Daniel: Messiah Cut Off', book: 'Daniel 7, 9', christLink: 'Christ the cut-off Anointed (Dan 9:26)' },
  { week: 37, focus: 'Hosea, Joel, Amos', book: 'Selected', christLink: 'Christ pours out the Spirit (Acts 2:17)' },
  { week: 38, focus: 'Jonah: Mercy on Enemies', book: 'Jonah 1-4', christLink: 'Christ greater than Jonah (Matt 12:41)' },
  { week: 39, focus: 'Minor Prophets: Wait + Hope', book: 'Hab, Zeph, Hag, Zech, Mal', christLink: 'Christ the long-promised dawn (Mal 4:2)' },
  // Q4 — Fulfillment (weeks 40-52)
  { week: 40, focus: 'Matthew: Kingdom Begins', book: 'Matthew 1-7', christLink: 'Christ the King who fulfills' },
  { week: 41, focus: 'Matthew: Parables + Miracles', book: 'Matthew 8-13', christLink: 'Christ the kingdom-bringer' },
  { week: 42, focus: 'Mark: The Suffering Servant', book: 'Mark 1-16', christLink: 'Christ as ransom (Mark 10:45)' },
  { week: 43, focus: 'Luke: The Inclusive Christ', book: 'Luke 1-12', christLink: 'Christ for the lowly (Luke 1:52)' },
  { week: 44, focus: 'Luke: Lost-and-Found + Emmaus', book: 'Luke 15, 24', christLink: 'Christ the One who finds us' },
  { week: 45, focus: 'John: The Word + I Ams', book: 'John 1-7', christLink: 'Christ the I AM' },
  { week: 46, focus: 'John: True Vine + Way + Truth', book: 'John 8-14', christLink: 'Christ our way to the Father (John 14:6)' },
  { week: 47, focus: 'John: Garden, Cross, Resurrection', book: 'John 15-21', christLink: 'Christ risen indeed (1 Cor 15:20)' },
  { week: 48, focus: 'Acts: Pentecost + Spread', book: 'Acts 1-10', christLink: 'Christ pours out the Spirit' },
  { week: 49, focus: 'Romans: Justified by Faith', book: 'Romans 1-8', christLink: 'Christ our righteousness (Rom 5:1)' },
  { week: 50, focus: '1 Corinthians: Love + Resurrection', book: '1 Cor 13, 15', christLink: 'Christ the firstfruits' },
  { week: 51, focus: 'Hebrews: Faith Hall + Endurance', book: 'Hebrews 11-12', christLink: 'Christ the founder + perfecter (Heb 12:2)' },
  { week: 52, focus: 'Revelation: New Heaven + New Earth', book: 'Revelation 21-22', christLink: 'Christ returns; come, Lord Jesus (Rev 22:20)' },
]

const CHIASTIC_POSITIONS = ['hook', 'building', 'pivot', 'application', 'resolution', 'deeper', 'sabbath']
const POSITION_TITLES = {
  hook: 'Day 1 — Hook',
  building: 'Day 2 — Building',
  pivot: 'Day 3 — Pivot',
  application: 'Day 4 — Application',
  resolution: 'Day 5 — Resolution',
  deeper: 'Day 6 — Deeper Dive',
  sabbath: 'Day 7 — Sabbath',
}

function buildDayMetadata() {
  const all = [...Q1_DETAILED]
  // Fill Q2-Q4 from per-week book themes
  for (const wk of Q2_Q4_WEEKS) {
    for (let pos = 0; pos < 7; pos++) {
      const dayNum = (wk.week - 1) * 7 + pos + 1
      if (dayNum > 365) break
      all.push({
        day: dayNum,
        title: `${wk.focus} — ${POSITION_TITLES[CHIASTIC_POSITIONS[pos]]}`,
        scripture: wk.book,
        pivot: wk.focus,
        christLink: wk.christLink,
      })
    }
  }
  // 52 weeks × 7 days = 364. A calendar year has 365 days. Day 365 closes
  // the year as a final benediction on the new heavens & new earth.
  if (all.length < 365) {
    all.push({
      day: 365,
      title: 'Come, Lord Jesus',
      scripture: 'Revelation 22:20-21',
      pivot: 'Final benediction — the year ends pointing forward',
      christLink: 'Christ returns; the whole Bible points here (Rev 22:20)',
    })
  }
  return all.slice(0, 365)
}

function chiasticPositionForDay(day) {
  // 1=hook, 2=building, 3=pivot, 4=application, 5=resolution, 6=deeper, 7=sabbath
  return CHIASTIC_POSITIONS[(day - 1) % 7]
}

function formatDate(day) {
  const start = new Date(Date.UTC(2026, 0, 1))
  const target = new Date(start.getTime() + (day - 1) * 86_400_000)
  return target.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
}

function buildPlaceholderJson(meta) {
  const slug = `bible-365-day-${meta.day}`
  return {
    day: meta.day,
    title: meta.title,
    teaser: `Day ${meta.day} of Bible 365 — ${meta.scripture}`,
    framework: `${meta.scripture} — ${meta.pivot}`,
    scriptureReference: meta.scripture,
    chiastic_position: chiasticPositionForDay(meta.day),
    pardesLevel: 'peshat',
    panels: [
      {
        number: 1,
        type: 'cover',
        content: `BIBLE 365 · DAY ${meta.day}`,
      },
      {
        number: 2,
        heading: 'TODAY’S PASSAGE',
        type: 'text',
        content: `**${meta.scripture}**\n\nThis devotional is being drafted. The full reading + reflection ships in a future writing pass.\n\nIn the meantime, open your Bible to ${meta.scripture} and read it slowly. Sit with one phrase that catches you. Bring it back to mind tomorrow.`,
        wordCount: 50,
      },
      {
        number: 3,
        heading: 'WHY THIS PASSAGE',
        type: 'text',
        content: `Today’s pivot: ${meta.pivot}. The whole canon points forward — and this reading carries its own thread of that long pointing.\n\nChrist-link: ${meta.christLink}.`,
        wordCount: 45,
      },
      {
        number: 4,
        heading: 'A PRAYER',
        type: 'text',
        content: `Father, when I read this passage, let me see You truly. Slow my hurry. Soften my certainty. Show me what I have missed. Through Christ, who is the substance of every shadow. Amen.`,
        wordCount: 40,
      },
    ],
    isPlaceholder: true, // flag for the rendering layer to show "draft in progress"
  }
}

function buildSeriesInfoTs(allDays) {
  const dayEntries = allDays.map((m) => `    { day: ${m.day}, title: ${JSON.stringify(m.title)}, slug: 'bible-365-day-${m.day}' },`).join('\n')
  return `// Auto-generated by scripts/generate-bible-365-stubs.mjs
// 365-day canonical-chronological reading plan, hop-in-anywhere.
// Do not edit manually — re-run the script after editing the calendar.

import type { SeriesInfo } from './series'

export const BIBLE_365_SERIES: SeriesInfo = {
  title: 'Bible in a Year',
  question: 'How can the whole Bible meet me where I am, today?',
  introduction:
    'A 365-day canonical-chronological reading plan you can join any day. Each day stands alone — read whatever you open the page to and you\\'ll find the throughline of Scripture pointing toward Christ.',
  context:
    'No prior reading required. Each entry is self-contained. Hop in today, hop in mid-year, miss days and come back. The thread holds.',
  framework: '52 weeks · canonical sweep · chiastic week-rhythm (hook → pivot → application → sabbath)',
  pathway: 'Awake',
  keywords: [
    'bible in a year', 'bible-in-a-year', 'daily', 'devotional', 'scripture',
    'reading plan', 'old testament', 'new testament', 'whole bible', '365',
  ],
  heroImage: '/images/site/series/bible-365.webp',
  days: [
${dayEntries}
  ],
}
`
}

console.log('━━━ Stage 2a: bible-365 stubs generation ━━━')
console.log()

const allDays = buildDayMetadata()
console.log(`Generated ${allDays.length} day metadata entries`)
console.log(`  Q1 (detailed):  91 days`)
console.log(`  Q2-Q4 (per-week themes extended): ${allDays.length - 91} days`)
console.log()

// Write 365 placeholder JSONs
let written = 0
for (const meta of allDays) {
  const json = buildPlaceholderJson(meta)
  const out = path.join(DEVOTIONAL_DIR, `bible-365-day-${meta.day}.json`)
  fs.writeFileSync(out, JSON.stringify(json, null, 2))
  written++
}
console.log(`✓ wrote ${written} placeholder JSONs to public/devotionals/`)

// Write SeriesInfo TS
fs.writeFileSync(SERIES_DATA_FILE, buildSeriesInfoTs(allDays))
console.log(`✓ wrote SeriesInfo to ${path.relative(ROOT, SERIES_DATA_FILE)}`)
console.log()
console.log('Next: hand-draft Days 1-7 via the devotional-writer agent (Stage 2b).')
