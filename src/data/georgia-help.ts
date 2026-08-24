/**
 * Georgia help directory — the resource corpus behind /seeking-help-georgia.
 *
 * ONE source of truth. The web page and the printable PDF both render from
 * this file, so the sheet someone is holding in a parking lot can never drift
 * from the page they were sent to.
 *
 * Editorial rules for this file (please keep them):
 *
 * 1. NOTHING GOES IN UNVERIFIED. Every phone number and URL here was checked
 *    against the provider's own site or the responsible state agency. If it
 *    could not be confirmed, it is not in this file. A wrong number on a page
 *    like this is worse than no page.
 *
 * 2. PLAIN LANGUAGE. `what` is one sentence, no jargon, no agency-speak. The
 *    reader is stressed and possibly reading on a cracked phone screen.
 *
 * 3. TWO KINDS OF HONESTY. `barrier` is neutral friction (waitlists, hours,
 *    paperwork, geography). `caution` is something a person should know before
 *    they walk in the door — mandatory religious participation, exclusionary
 *    policy, a facility that is not what it appears to be. Both are stated
 *    factually. Neither editorializes.
 *
 * 4. FAITH IS A LABEL, NOT A LADDER. Faith-based providers sit inside the
 *    practical categories alongside everyone else and carry a `Faith-based`
 *    badge. They are never presented as the preferred door, and where help is
 *    conditioned on religious participation that is a `caution`, because for
 *    the person reading it is a real barrier.
 *
 * Re-verify before each release. Bump LAST_VERIFIED when you do.
 */

export const LAST_VERIFIED = 'August 24, 2026'

export type Badge =
  | 'Free'
  | '24/7'
  | 'Faith-based'
  | 'Español'
  | 'Text available'
  | 'Statewide'
  | 'Metro Atlanta'
  | 'Youth'
  | 'Sliding scale'
  | 'Walk-in'
  | 'Government'

export type Resource = {
  name: string
  /** One plain sentence: what this actually does for the reader. */
  what: string
  /** Display form, e.g. "1-800-715-4225". */
  phone?: string
  /** Digits only for the tel: href, e.g. "18007154225". */
  phoneDigits?: string
  /** A second number worth showing (Spanish line, youth line, etc.). */
  altPhone?: { label: string; phone: string; phoneDigits: string }
  /** Texting instructions, e.g. "Text HOME to 741741". */
  text?: string
  url?: string
  /** Human-readable host for the printed sheet, e.g. "gcadv.org". */
  urlLabel?: string
  hours?: string
  coverage?: string
  badges: Badge[]
  /** Neutral access friction — waitlists, paperwork, hours, geography. */
  barrier?: string
  /** Know-before-you-go: policy, licensure, or documented concerns. */
  caution?: string
}

export type HelpCategory = {
  /** Anchor id — also the href target from the triage grid. */
  id: string
  /** First-person label for the triage tile. How a person actually thinks. */
  tileLabel: string
  /** Section heading. */
  title: string
  /** One line under the heading, setting expectations honestly. */
  intro: string
  resources: Resource[]
}

/**
 * The three that go above everything else. No scrolling, no reading, no
 * decision tree — a person in acute crisis should be one tap from a human.
 */
export const EMERGENCY: Resource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    what: 'Free, confidential, any hour. In Georgia your call is answered by trained Georgia counselors.',
    phone: '988',
    phoneDigits: '988',
    text: 'Call or text 988',
    url: 'https://988ga.org/',
    urlLabel: '988ga.org',
    hours: 'Every hour of every day',
    coverage: 'Nationwide',
    badges: ['Free', '24/7', 'Text available', 'Español'],
  },
  {
    name: 'Crisis Text Line',
    what: 'If you would rather type than talk. A trained crisis counselor texts back.',
    text: 'Text HOME to 741741',
    url: 'https://www.crisistextline.org/',
    urlLabel: 'crisistextline.org',
    hours: 'Every hour of every day',
    coverage: 'Nationwide',
    badges: ['Free', '24/7', 'Text available'],
  },
  {
    name: '911',
    what: 'If someone is badly hurt, in immediate danger, or needs an ambulance right now.',
    phone: '911',
    phoneDigits: '911',
    hours: 'Every hour of every day',
    coverage: 'Nationwide',
    badges: ['24/7', 'Government'],
    caution:
      'A 911 call to a mental-health emergency may bring police. If the situation is a mental-health crisis and no one is in physical danger, 988 or GCAL will send behavioral-health responders instead.',
  },
]

export const CATEGORIES: HelpCategory[] = [
  // ── Someone to talk to ────────────────────────────────────────────
  {
    id: 'talk',
    tileLabel: 'I need to talk to someone',
    title: 'Someone to talk to, right now',
    intro:
      'All of these are free. None of them will judge you. You do not have to be suicidal to call — "I am not okay" is reason enough.',
    resources: [
      {
        name: 'Georgia Crisis & Access Line (GCAL)',
        what: "Georgia's own 24-hour line for mental health, substance use, and developmental disability crises. They can send a mobile crisis team to you.",
        phone: '1-800-715-4225',
        phoneDigits: '18007154225',
        url: 'https://dbhdd.georgia.gov/bhdd-crisis-line',
        urlLabel: 'dbhdd.georgia.gov',
        hours: 'Every hour of every day, all year',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide', 'Government'],
      },
      {
        name: 'Veterans Crisis Line',
        what: 'Staffed by people who understand military service. You do not need to be enrolled in VA care.',
        phone: '988, then press 1',
        phoneDigits: '988',
        text: 'Or text 838255',
        url: 'https://www.veteranscrisisline.net/',
        urlLabel: 'veteranscrisisline.net',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Text available'],
      },
      {
        name: 'The Trevor Project',
        what: 'Crisis support for LGBTQ+ young people under 25, by phone, text, or chat.',
        phone: '1-866-488-7386',
        phoneDigits: '18664887386',
        text: 'Or text START to 678-678',
        url: 'https://www.thetrevorproject.org/get-help/',
        urlLabel: 'thetrevorproject.org',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Text available', 'Youth'],
      },
      {
        name: 'Trans Lifeline',
        what: 'A peer support line run by and for trans people. They do not call police or emergency services without your consent.',
        phone: '1-877-565-8860',
        phoneDigits: '18775658860',
        url: 'https://translifeline.org/',
        urlLabel: 'translifeline.org',
        hours: 'Hours vary — check the site for current staffing',
        coverage: 'Nationwide',
        badges: ['Free'],
        barrier:
          'Volunteer-staffed, so hours are not around the clock and there can be a wait. If you need someone immediately, 988 always answers.',
      },
      {
        name: 'SAMHSA National Helpline',
        what: 'A national line for mental health and substance use. They will refer you to treatment and support near you.',
        phone: '1-800-662-4357',
        phoneDigits: '18006624357',
        url: 'https://www.samhsa.gov/find-help/helplines/national-helpline',
        urlLabel: 'samhsa.gov',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Español', 'Government'],
      },
      {
        name: 'NAMI Georgia Helpline',
        what: 'Information, support groups, and help navigating the mental health system from people who have been through it.',
        phone: '770-408-0625',
        phoneDigits: '7704080625',
        url: 'https://namiga.org/resources/nami-georgia-helpline/',
        urlLabel: 'namiga.org',
        hours: 'Monday–Friday, 9am–5pm',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
        barrier:
          'This is not a crisis line and is not staffed for emergencies or counseling. Weekdays and business hours only. For a crisis, call 988 or GCAL.',
      },
      {
        name: 'National Human Trafficking Hotline',
        what: 'If someone is forcing you to work, to have sex, or is holding your documents or your pay.',
        phone: '1-888-373-7888',
        phoneDigits: '18883737888',
        text: 'Or text 233733',
        url: 'https://humantraffickinghotline.org/',
        urlLabel: 'humantraffickinghotline.org',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Text available', 'Español'],
      },
    ],
  },

  // ── Shelter ───────────────────────────────────────────────────────
  {
    id: 'sleep',
    tileLabel: 'I need somewhere to sleep tonight',
    title: 'Somewhere to sleep tonight',
    intro:
      'Start with 211 — they know which beds are actually open tonight, which a website cannot tell you. Call early in the day if you can; most shelters fill by evening.',
    resources: [
      {
        name: '211 (United Way of Georgia)',
        what: 'Dial 2-1-1 and a real person will look up shelter beds, food, and rent help near you.',
        phone: '211',
        phoneDigits: '211',
        url: 'https://unitedwayga.org/ga211/',
        urlLabel: 'unitedwayga.org/ga211',
        hours: 'Hours vary by region — many locations answer around the clock',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Español'],
        barrier:
          'Run regionally, so hours and how much they know about your county vary. If 2-1-1 does not connect from your phone, use the site to find your regional number.',
      },
      {
        name: '211 — Augusta and the CSRA',
        what: 'The regional 211 line for Augusta and the Central Savannah River Area, if the statewide number does not connect you locally.',
        phone: '706-826-1495',
        phoneDigits: '7068261495',
        url: 'https://www.uwcsra.org/211',
        urlLabel: 'uwcsra.org/211',
        hours: 'Monday–Friday, 8:30am–5:00pm',
        coverage: 'Augusta and the CSRA',
        badges: ['Free'],
      },
      {
        name: 'Gateway Center',
        what: 'The main front door to shelter and housing services in downtown Atlanta.',
        phone: '404-215-6600',
        phoneDigits: '4042156600',
        url: 'https://www.gatewayctr.org/programs-and-services-2/',
        urlLabel: 'gatewayctr.org',
        hours:
          'Sign-up for daily assessment starts at 7:00am; check back at 1:00pm for afternoon openings',
        coverage: '275 Pryor St SW, Atlanta',
        badges: ['Free', 'Metro Atlanta'],
        barrier:
          'Assessment slots are limited and are taken on a first-come basis starting at 7:00am. Arriving later in the day often means no slot until tomorrow.',
      },
      {
        name: 'Covenant House Georgia',
        what: 'Crisis shelter, food, showers, laundry, and case management for young people 16–24. Everything is free.',
        phone: '404-589-0163',
        phoneDigits: '4045890163',
        altPhone: {
          label: 'Youth line',
          phone: '404-713-0954',
          phoneDigits: '4047130954',
        },
        url: 'https://covenanthousega.org/',
        urlLabel: 'covenanthousega.org',
        hours: 'Open 24/7; intake assessments Monday–Friday, 9:00am–4:00pm',
        coverage: '1559 Johnson Rd NW, Atlanta',
        badges: ['Free', '24/7', 'Youth', 'Faith-based', 'Metro Atlanta'],
        barrier:
          'Crisis shelter beds are for ages 18–24 and stays run up to 90 days. Ages 16–24 can use the drop-in center for meals, showers, and laundry without staying.',
      },
      {
        name: 'Lost-n-Found Youth',
        what: 'Housing, food, clothing, and help replacing a lost ID or birth certificate for LGBTQ+ young people.',
        phone: '678-856-7825',
        phoneDigits: '6788567825',
        text: 'You can call or text this number',
        url: 'https://www.lnfy.org/find-help',
        urlLabel: 'lnfy.org',
        hours: 'Hotline answers 24/7',
        coverage: 'Atlanta',
        badges: ['Free', '24/7', 'Youth', 'Text available', 'Metro Atlanta'],
        barrier:
          'Housing is a small program — a 6-bed facility plus host homes — so there is often a wait for a bed even when the hotline answers immediately.',
      },
      {
        name: 'HOPE Atlanta',
        what: 'One of the oldest housing agencies in the state. They do not run a shelter themselves, but they know which ones have beds and can refer you.',
        phone: '404-817-7070',
        phoneDigits: '4048177070',
        url: 'https://hopeatlanta.org/get-help/',
        urlLabel: 'hopeatlanta.org',
        coverage: 'Greater Atlanta',
        badges: ['Free', 'Metro Atlanta'],
      },
      {
        name: 'Atlanta Mission',
        what: 'Meals, shelter, counseling, job training, and recovery programs across four Atlanta locations.',
        phone: '404-588-4000',
        phoneDigits: '4045884000',
        url: 'https://atlantamission.org/get-help/',
        urlLabel: 'atlantamission.org',
        coverage: 'Four locations in metro Atlanta',
        badges: ['Free', 'Faith-based', 'Metro Atlanta'],
        caution:
          'Emergency shelter and meals are given without conditions. The longer-term recovery and residential programs are explicitly Christian in structure. Ask which track you are being placed in and what it requires of you.',
      },
      {
        name: 'Help Inn Folk',
        what: 'Shared co-living houses — a private bedroom with shared kitchen and living space — for seniors, veterans, people leaving incarceration, students, and low-income adults. They also help set up Social Security, SSDI, and Medicaid.',
        phone: '888-424-4123',
        phoneDigits: '8884244123',
        url: 'https://www.helpinnfolk.com/services',
        urlLabel: 'helpinnfolk.com',
        coverage: 'Fulton and DeKalb counties',
        badges: ['Metro Atlanta'],
        barrier:
          'This is rented housing, not free emergency shelter — there is rent to pay, and it will not solve tonight. It is a route OUT of a shelter or an unstable place, and worth calling early rather than at the last minute.',
      },
      {
        name: 'Chatham Savannah Authority for the Homeless',
        what: 'The coordinating agency for shelter and housing in Savannah and Chatham County.',
        phone: '912-790-3400',
        phoneDigits: '9127903400',
        altPhone: {
          label: 'Main office',
          phone: '912-977-4864',
          phoneDigits: '9129774864',
        },
        url: 'https://www.homelessauthority.org/need-help/',
        urlLabel: 'homelessauthority.org',
        coverage: 'Savannah and Chatham County',
        badges: ['Free'],
        barrier:
          'The intake line often takes a message rather than answering live. Leave your callback number and keep the phone with you.',
      },
      {
        name: 'National Call Center for Homeless Veterans',
        what: 'If you served and you have nowhere to go, this line connects you straight to your nearest VA.',
        phone: '1-877-424-3838',
        phoneDigits: '18774243838',
        url: 'https://www.va.gov/homeless/nationalcallcenter.asp',
        urlLabel: 'va.gov/homeless',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Government'],
      },
      {
        name: 'Georgia Domestic Violence Hotline',
        what: 'If it is not safe to go home, this line routes you to the nearest domestic violence shelter.',
        phone: '1-800-334-2836',
        phoneDigits: '18003342836',
        url: 'https://gcadv.org/projects-and-initiatives/statewide-domestic-violence-hotline/',
        urlLabel: 'gcadv.org',
        hours: 'Every hour of every day',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide', 'Español'],
      },
    ],
  },

  // ── Food ──────────────────────────────────────────────────────────
  {
    id: 'food',
    tileLabel: 'I need food',
    title: 'Food this week',
    intro:
      'Food pantries do not means-test the way benefits offices do. In most cases you can walk in, say you need food, and get food.',
    resources: [
      {
        name: 'Atlanta Community Food Bank — food map',
        what: 'Enter your address and it lists pantries near you with the days and hours they hand out food.',
        text: 'Or text FINDFOOD to 888-976-2232 (Spanish: text COMIDA)',
        url: 'https://www.acfb.org/get-help/food-map/',
        urlLabel: 'acfb.org/get-help/food-map',
        coverage: 'Metro Atlanta and north Georgia — 700+ partner pantries',
        badges: ['Free', 'Metro Atlanta', 'Español', 'Text available'],
        barrier:
          "The Food Bank's own Community Food Centers require an appointment. The partner pantries on the map generally do not — check each listing.",
      },
      {
        name: 'Feeding Georgia',
        what: 'The statewide network. Find which of the eight regional food banks covers your county, then their pantry list.',
        url: 'https://feedinggeorgia.org/our-food-banks/',
        urlLabel: 'feedinggeorgia.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'SNAP (food stamps) — Georgia Gateway',
        what: 'Monthly money for groceries on a card. Applying is free and takes about 30–60 minutes online.',
        phone: '1-877-423-4746',
        phoneDigits: '18774234746',
        url: 'https://gateway.ga.gov/',
        urlLabel: 'gateway.ga.gov',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government', 'Español'],
        barrier:
          'The state has up to 30 days to decide, so this does not solve tonight. Every DFCS office has public computers in the lobby if you do not have internet.',
      },
      {
        name: 'WIC and family food help — PowerLine',
        what: 'A bilingual line that connects pregnant women and families with young children to WIC and other food programs.',
        phone: '1-800-300-9003',
        phoneDigits: '18003009003',
        url: 'https://www.hmhbga.org/call-center',
        urlLabel: 'hmhbga.org',
        coverage: 'All 159 Georgia counties',
        badges: ['Free', 'Statewide', 'Español'],
      },
      {
        name: 'Meals for older adults — Georgia ADRC',
        what: 'Home-delivered and congregate meals for people 60+, arranged through your Area Agency on Aging.',
        phone: '1-866-552-4464',
        phoneDigits: '18665524464',
        url: 'https://aging.georgia.gov/programs-and-services/adrc',
        urlLabel: 'aging.georgia.gov',
        hours: 'Monday–Friday, 8am–5pm',
        coverage: 'All 159 Georgia counties',
        badges: ['Statewide', 'Government'],
        barrier:
          'Home-delivered meal programs frequently have waiting lists that run months in some counties.',
      },
    ],
  },

  // ── Bills ─────────────────────────────────────────────────────────
  {
    id: 'bills',
    tileLabel: "I can't pay rent or my power bill",
    title: 'Rent, power, and water',
    intro:
      'Ask before the shutoff or the filing if you possibly can — almost every program has more room to help when the account is behind than after service is cut or an eviction is filed.',
    resources: [
      {
        name: 'LIHEAP — energy bill assistance',
        what: 'A payment made straight to your power or gas company to keep the heat or air on.',
        url: 'https://dfcs.georgia.gov/services/low-income-home-energy-assistance-program-liheap',
        urlLabel: 'dfcs.georgia.gov',
        coverage: 'All of Georgia, through your local Community Action Agency',
        badges: ['Statewide', 'Government'],
        barrier:
          'First-come, first-served until the money runs out, and it runs out. Household income must be at or under 60% of the state median — about $34,549 for one person and $77,071 for a household of five. Heating applications open in early January and cooling in spring, with people 65+ and the medically homebound able to apply a month earlier. Call your local Community Action Agency for your area’s exact opening date.',
      },
      {
        name: '211 (United Way of Georgia)',
        what: 'The fastest way to find out which local church, agency, or fund still has rent or utility money this month.',
        phone: '211',
        phoneDigits: '211',
        url: 'https://unitedwayga.org/ga211/',
        urlLabel: 'unitedwayga.org/ga211',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Español'],
      },
      {
        name: 'The Salvation Army',
        what: 'Emergency help with rent, utilities, food, and clothing through local corps offices across Georgia.',
        url: 'https://www.salvationarmyusa.org/usn/find-a-location/',
        urlLabel: 'salvationarmyusa.org',
        coverage: 'Locations across Georgia',
        badges: ['Faith-based'],
        barrier:
          'Each local office sets its own funds, hours, intake days, and paperwork. Call your specific location first — do not assume the one nearest you offers the same help.',
      },
      {
        name: 'St. Vincent de Paul Georgia',
        what: 'Help with rent, utilities, food, and prescriptions through parish-based conferences.',
        phone: '770-458-9607',
        phoneDigits: '7704589607',
        url: 'https://svdpgeorgia.org/',
        urlLabel: 'svdpgeorgia.org',
        coverage: 'Across Georgia',
        badges: ['Faith-based'],
        barrier:
          'Help is organized by parish territory, so what is available depends on which conference covers your address and what funds it has that month.',
      },
      {
        name: 'Project SHARE',
        what: 'Emergency help with a power bill, rent, or a medical need, funded by utility customers and run by The Salvation Army. Statewide since 1985.',
        phone: '1-800-257-4273',
        phoneDigits: '18002574273',
        url: 'https://www.georgiapower.com/our-impact/community/giving-back/project-share.html',
        urlLabel: 'georgiapower.com',
        coverage: 'All of Georgia',
        badges: ['Statewide', 'Faith-based'],
        barrier:
          'Funds are limited and distributed through local Salvation Army offices, so what is available depends on your county and the time of year.',
      },
      {
        name: 'Georgia Power Income-Qualified Discount',
        what: 'A standing monthly discount of up to $33.50 off your power bill — not a one-time grant, an ongoing reduction.',
        url: 'https://www.georgiapower.com/residential/billing-and-rates/income-qualified-discount.html',
        urlLabel: 'georgiapower.com',
        coverage: 'Georgia Power customers',
        badges: ['Statewide'],
        barrier:
          'Household income must be at or under 200% of the federal poverty guidelines. You have to apply — it is not applied automatically, and many eligible households never claim it.',
      },
      {
        name: 'Georgia Legal Services / Atlanta Legal Aid',
        what: 'If you have been served with an eviction, a lawyer may be able to slow it down or stop it. Call the day you are served.',
        phone: '1-833-457-7529',
        phoneDigits: '18334577529',
        altPhone: {
          label: 'Metro Atlanta',
          phone: '404-524-5811',
          phoneDigits: '4045245811',
        },
        url: 'https://www.georgialegalaid.org/apply',
        urlLabel: 'georgialegalaid.org',
        coverage: 'Statewide (metro Atlanta uses the second number)',
        badges: ['Free', 'Statewide'],
        barrier:
          'Both programs are income-qualified and turn away far more people than they can take. Georgia eviction answers are due fast, so call the same day you are served.',
      },
    ],
  },

  // ── Not safe ──────────────────────────────────────────────────────
  {
    id: 'unsafe',
    tileLabel: "I'm not safe where I live",
    title: 'When home is not safe',
    intro:
      'You do not have to be sure. You do not have to have proof. You do not have to leave in order to call — these lines will talk through options with you either way. If you think your phone or computer is being monitored, call from somewhere else.',
    resources: [
      {
        name: 'Georgia Domestic Violence Hotline',
        what: 'Connects you to the nearest certified shelter, plus safety planning, counseling, and help in court.',
        phone: '1-800-334-2836',
        phoneDigits: '18003342836',
        altPhone: {
          label: 'En español',
          phone: '770-479-1703',
          phoneDigits: '7704791703',
        },
        url: 'https://gcadv.org/projects-and-initiatives/statewide-domestic-violence-hotline/',
        urlLabel: 'gcadv.org',
        hours: 'Every hour of every day',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide', 'Español'],
      },
      {
        name: 'National Domestic Violence Hotline',
        what: 'Call, text, or chat with an advocate any hour, from anywhere.',
        phone: '1-800-799-7233',
        phoneDigits: '18007997233',
        text: 'Or text START to 88788',
        url: 'https://www.thehotline.org/',
        urlLabel: 'thehotline.org',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Text available', 'Español'],
      },
      {
        name: 'RAINN National Sexual Assault Hotline',
        what: 'Confidential support after sexual assault, whether it happened last night or years ago.',
        phone: '1-800-656-4673',
        phoneDigits: '18006564673',
        url: 'https://www.rainn.org/',
        urlLabel: 'rainn.org',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Español'],
      },
      {
        name: 'Georgia Network to End Sexual Assault (GNESA)',
        what: 'Find your local rape crisis center — 24-hour hotline, someone to go with you to the hospital, counseling, and legal advocacy.',
        url: 'http://www.gnesa.org/page/rape-crisis-centers-georgia',
        urlLabel: 'gnesa.org',
        coverage: 'Centers across Georgia',
        badges: ['Free', 'Statewide'],
        barrier:
          'Coverage is uneven — some rural counties are served by a center an hour or more away.',
      },
      {
        name: 'Adult Protective Services',
        what: 'If an older adult or an adult with a disability is being hurt, neglected, or financially exploited.',
        phone: '1-866-552-4464',
        phoneDigits: '18665524464',
        url: 'https://georgia.gov/report-elder-abuse',
        urlLabel: 'georgia.gov/report-elder-abuse',
        hours: 'Phone Monday–Friday, 8am–5pm; online reporting any time',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government'],
        barrier:
          'The phone line is business hours only. Select your language, then option 3. Nights and weekends, use the online form.',
      },
    ],
  },

  // ── Health care ───────────────────────────────────────────────────
  {
    id: 'health',
    tileLabel: 'I need a doctor or my medicine',
    title: 'Doctors, dentists, and prescriptions',
    intro:
      'Being uninsured does not mean going without care. Georgia has more than 100 free and charitable clinics, plus health centers that charge on a sliding scale based on what you make.',
    resources: [
      {
        name: 'Georgia Charitable Care Network',
        what: 'A directory of free and low-cost clinics — medical, dental, mental health, and medication help.',
        url: 'https://gacharitycare.org/',
        urlLabel: 'gacharitycare.org',
        coverage: '100+ clinics across Georgia',
        badges: ['Free', 'Statewide', 'Sliding scale'],
        barrier:
          'Each clinic sets its own eligibility, service area, and hours. Some are volunteer-staffed and open only a few days a week, and many have waiting lists.',
      },
      {
        name: 'Find a Health Center (FQHC finder)',
        what: 'Community health centers that see you regardless of insurance and charge on a sliding scale.',
        url: 'https://findahealthcenter.hrsa.gov/',
        urlLabel: 'findahealthcenter.hrsa.gov',
        coverage: 'Nationwide, including all of Georgia',
        badges: ['Sliding scale', 'Government', 'Español'],
        barrier:
          'Sliding scale means reduced, not always free — bring proof of income if you have it to get the lowest rate.',
      },
      {
        name: 'PowerLine (Healthy Mothers, Healthy Babies)',
        what: 'A bilingual line that finds you a doctor who takes Medicaid, a dentist, low-cost care, HIV testing, or WIC.',
        phone: '1-800-300-9003',
        phoneDigits: '18003009003',
        url: 'https://www.hmhbga.org/call-center',
        urlLabel: 'hmhbga.org',
        coverage: 'All 159 Georgia counties',
        badges: ['Free', 'Statewide', 'Español'],
      },
      {
        name: 'Medicaid and PeachCare — Georgia Gateway',
        what: 'Health coverage for children, pregnant women, and some adults. Applying is free.',
        phone: '1-877-423-4746',
        phoneDigits: '18774234746',
        url: 'https://gateway.ga.gov/',
        urlLabel: 'gateway.ga.gov',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government'],
        barrier:
          'The state has up to 45 days to decide a Medicaid application.',
        caution:
          'Georgia did not expand Medicaid. Most adults without children, without a disability, and without a qualifying pregnancy do not qualify no matter how low their income. Georgia Pathways is the state’s narrow alternative, and it requires documented work or activity hours — see below.',
      },
      {
        name: 'Georgia Pathways to Coverage',
        what: "Georgia's limited Medicaid pathway for low-income adults who can document 80 hours a month of work, school, or service.",
        url: 'https://medicaid.georgia.gov/programs/all-programs/georgia-pathways-coverage',
        urlLabel: 'medicaid.georgia.gov',
        coverage: 'All of Georgia',
        badges: ['Statewide', 'Government'],
        caution:
          'Worth applying for, but go in with your eyes open. Enrollment has stayed near 8,000–11,000 people against a potentially eligible population of roughly 240,000, and applicants have run into portal failures, understaffed help lines, and repeated paperwork to prove the 80 hours. A federal GAO review found the program spent more on administration than on care. If you are denied, ask a legal aid office about appealing.',
      },
      {
        name: 'Good Samaritan Health Center',
        what: 'Medical, dental, vision, and behavioral health for uninsured and low-income people, on a sliding scale.',
        phone: '404-523-6571',
        phoneDigits: '4045236571',
        url: 'https://goodsamatlanta.org/',
        urlLabel: 'goodsamatlanta.org',
        hours: 'Monday–Thursday, 7:45am–4:00pm; phone lines open at 8am',
        coverage: '1015 Donald Lee Hollowell Pkwy NW, Atlanta',
        badges: ['Sliding scale', 'Faith-based', 'Metro Atlanta', 'Español'],
        barrier:
          'Closed Fridays. Phone lines open at 8am and appointments go quickly — call right at opening.',
      },
      {
        name: 'Mercy Care',
        what: 'A community health center built around people who are homeless or uninsured — primary care, dental, behavioral health, and street medicine.',
        url: 'https://mercyatlanta.org/',
        urlLabel: 'mercyatlanta.org',
        coverage: 'Locations across metro Atlanta',
        badges: ['Sliding scale', 'Faith-based', 'Metro Atlanta'],
      },
      {
        name: 'NeedyMeds',
        what: 'Finds programs that cut the cost of a specific prescription, plus a free drug discount card.',
        phone: '1-800-503-6897',
        phoneDigits: '18005036897',
        url: 'https://www.needymeds.org/',
        urlLabel: 'needymeds.org',
        coverage: 'Nationwide',
        badges: ['Free'],
      },
    ],
  },

  // ── Ongoing mental health ─────────────────────────────────────────
  {
    id: 'mental-health',
    tileLabel: 'I need ongoing mental health care',
    title: 'Counseling and ongoing care',
    intro:
      'Crisis lines are for the worst hour. This is for the months after — an actual counselor, an actual prescriber, an actual plan.',
    resources: [
      {
        name: 'Georgia Crisis & Access Line (GCAL)',
        what: 'Beyond crisis calls, GCAL is the front door to publicly funded mental health and addiction services in Georgia.',
        phone: '1-800-715-4225',
        phoneDigits: '18007154225',
        url: 'https://dbhdd.georgia.gov/access-services-0',
        urlLabel: 'dbhdd.georgia.gov',
        hours: 'Every hour of every day',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide', 'Government'],
      },
      {
        name: 'Community Service Boards (CSBs)',
        what: 'Georgia’s public mental health and addiction clinics. They serve people with Medicaid and people with no insurance at all.',
        phone: '1-800-715-4225',
        phoneDigits: '18007154225',
        url: 'https://dbhdd.georgia.gov/locations',
        urlLabel: 'dbhdd.georgia.gov/locations',
        coverage: 'All six DBHDD regions',
        badges: ['Sliding scale', 'Statewide', 'Government'],
        barrier:
          'Waits for a first therapy or psychiatry appointment can run weeks to months depending on the county. Ask to be put on a cancellation list.',
      },
      {
        name: 'Mental Health America of Georgia',
        what: 'Help figuring out what kind of care you need and who near you provides it.',
        url: 'https://www.mhageorgia.org/get-help/find-help/',
        urlLabel: 'mhageorgia.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'Open Path Collective',
        what: 'Therapy at a reduced rate per session with private-practice therapists who set aside sliding-scale slots.',
        url: 'https://openpathcollective.org/',
        urlLabel: 'openpathcollective.org',
        coverage: 'Nationwide, in person and online',
        badges: ['Sliding scale'],
        barrier:
          'There is a one-time membership fee, and you still pay per session. Cheaper than full rate, but not free.',
      },
      {
        name: 'NAMI Georgia',
        what: 'Free support groups and education classes for people living with mental illness and for their families.',
        phone: '770-408-0625',
        phoneDigits: '7704080625',
        url: 'https://namiga.org/',
        urlLabel: 'namiga.org',
        hours: 'Monday–Friday, 9am–5pm',
        coverage: 'Chapters across Georgia',
        badges: ['Free', 'Statewide'],
      },
    ],
  },

  // ── Recovery ──────────────────────────────────────────────────────
  {
    id: 'recovery',
    tileLabel: 'I need help with drinking or drugs',
    title: 'Drinking, drugs, and recovery',
    intro:
      'You do not have to be ready to quit to call any of these. Staying alive comes first — everything else can follow.',
    resources: [
      {
        name: 'SAMHSA National Helpline',
        what: 'Free, confidential referral to treatment, any hour. They will find options that match what you can pay.',
        phone: '1-800-662-4357',
        phoneDigits: '18006624357',
        url: 'https://www.samhsa.gov/find-help/helplines/national-helpline',
        urlLabel: 'samhsa.gov',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Español', 'Government'],
      },
      {
        name: 'FindTreatment.gov',
        what: 'Search treatment programs by your zip code and filter by what kind of care and what payment they take.',
        url: 'https://findtreatment.gov/',
        urlLabel: 'findtreatment.gov',
        coverage: 'Nationwide',
        badges: ['Free', 'Government'],
        caution:
          'Listing does not mean vetting. Before committing, ask directly: is this licensed, is it staffed by medical professionals, is unpaid labor part of the program, and can I leave when I want. Some faith-based residential programs are structured as work programs rather than licensed treatment.',
      },
      {
        name: 'Georgia Council for Recovery',
        what: 'Peer support from people in recovery themselves, plus recovery community organizations across the state.',
        url: 'https://gc4recovery.org/resources/',
        urlLabel: 'gc4recovery.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'Georgia Overdose Prevention — free naloxone',
        what: 'Free naloxone (Narcan) mailed to you, usually within about 48 hours. It reverses an opioid overdose.',
        url: 'https://georgiaoverdoseprevention.org/request-naloxone-kit/',
        urlLabel: 'georgiaoverdoseprevention.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
        barrier: 'Mailed while supplies last, so it is not same-day.',
      },
      {
        name: 'Alcoholics Anonymous / Narcotics Anonymous',
        what: 'Free peer meetings almost everywhere in Georgia, most days, including online.',
        url: 'https://www.aa.org/find-aa',
        urlLabel: 'aa.org/find-aa',
        coverage: 'Across Georgia',
        badges: ['Free', 'Statewide'],
        barrier:
          'AA and NA use the language of a higher power. Many people who are not religious use them without difficulty, and secular meetings exist in most metro areas if that framing is a barrier for you.',
      },
      {
        name: 'Celebrate Recovery',
        what: 'A Christ-centered recovery program hosted by churches across Georgia.',
        url: 'https://locator.crgroups.info/',
        urlLabel: 'locator.crgroups.info',
        coverage: 'Churches across Georgia',
        badges: ['Free', 'Faith-based'],
        caution:
          'Explicitly Christian by design — Scripture and prayer are central to the program, not optional. A good fit if you want that. If you do not, AA, NA, SMART Recovery, or a licensed program will serve you better.',
      },
    ],
  },

  // ── Pregnancy and kids ────────────────────────────────────────────
  {
    id: 'pregnancy',
    tileLabel: 'I’m pregnant or have small kids',
    title: 'Pregnancy, babies, and young children',
    intro:
      'Prenatal care, formula, diapers, car seats, and coverage for your child are all things Georgia has programs for. Start with PowerLine — it is one call for most of it.',
    resources: [
      {
        name: 'PowerLine (Healthy Mothers, Healthy Babies)',
        what: 'One bilingual call that connects you to prenatal care, WIC, a Medicaid doctor, dental care, and more.',
        phone: '1-800-300-9003',
        phoneDigits: '18003009003',
        url: 'https://www.hmhbga.org/call-center',
        urlLabel: 'hmhbga.org',
        coverage: 'All 159 Georgia counties',
        badges: ['Free', 'Statewide', 'Español'],
      },
      {
        name: 'Help Me Grow Georgia',
        what: 'Free help finding developmental screening, early intervention, and family support for children.',
        url: 'https://www.hmhbga.org/',
        urlLabel: 'hmhbga.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'Medicaid and PeachCare for Kids',
        what: 'Health coverage for children and for pregnancy. Children qualify at incomes well above the adult limits.',
        phone: '1-877-423-4746',
        phoneDigits: '18774234746',
        url: 'https://gateway.ga.gov/',
        urlLabel: 'gateway.ga.gov',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government'],
      },
      {
        name: 'Planning for Healthy Babies (P4HB)',
        what: 'Georgia Medicaid program covering family planning and, for some women, care between pregnancies.',
        url: 'https://medicaid.georgia.gov/all-programs/planning-healthy-babies/planning-healthy-babies-program-overview',
        urlLabel: 'medicaid.georgia.gov',
        coverage: 'All of Georgia',
        badges: ['Statewide', 'Government'],
      },
      {
        name: 'A note on "pregnancy resource centers"',
        what: 'Georgia has many centers advertising free ultrasounds and pregnancy help. Some are genuinely helpful for diapers, clothing, and parenting classes.',
        badges: [],
        caution:
          'Many are not licensed medical facilities and are not required to meet medical standards or give complete, accurate information about your options. Studies of these centers have found a majority of sites carrying misleading medical claims. Before you go, ask plainly whether licensed medical staff are on site and what the center will and will not discuss. For unbiased medical care, use a licensed clinic, an FQHC, or PowerLine above.',
      },
    ],
  },

  // ── Veterans ──────────────────────────────────────────────────────
  {
    id: 'veterans',
    tileLabel: 'I’m a veteran',
    title: 'If you served',
    intro:
      'A bad discharge does not automatically disqualify you, and neither does never having enrolled in VA care. It is worth calling to find out.',
    resources: [
      {
        name: 'Veterans Crisis Line',
        what: 'Confidential support any hour, staffed largely by veterans and their families.',
        phone: '988, then press 1',
        phoneDigits: '988',
        text: 'Or text 838255',
        url: 'https://www.veteranscrisisline.net/',
        urlLabel: 'veteranscrisisline.net',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Text available'],
      },
      {
        name: 'National Call Center for Homeless Veterans',
        what: 'Free and confidential, any hour, connecting you to housing help at your nearest VA.',
        phone: '1-877-424-3838',
        phoneDigits: '18774243838',
        url: 'https://www.va.gov/homeless/nationalcallcenter.asp',
        urlLabel: 'va.gov/homeless',
        hours: 'Every hour of every day',
        coverage: 'Nationwide',
        badges: ['Free', '24/7', 'Government'],
      },
      {
        name: 'Georgia Department of Veterans Service',
        what: 'Free state help filing for the benefits you earned — disability, pension, education, survivor benefits.',
        url: 'https://veterans.georgia.gov/',
        urlLabel: 'veterans.georgia.gov',
        coverage: 'Field offices across Georgia',
        badges: ['Free', 'Statewide', 'Government'],
      },
      {
        name: 'Supportive Services for Veteran Families (SSVF)',
        what: 'Rapid rehousing and eviction prevention for veteran families, delivered by local partners.',
        url: 'https://department.va.gov/homeless/supportive-services-for-veteran-families/',
        urlLabel: 'va.gov',
        coverage: 'Providers across Georgia',
        badges: ['Government'],
        barrier:
          'Income-qualified, and delivered by whichever local agency holds the grant in your area.',
      },
      {
        name: 'Georgia DOL Veterans Resource Directory',
        what: 'Employment help, priority job placement, and training for veterans.',
        url: 'https://dol.georgia.gov/veterans-resource-directory',
        urlLabel: 'dol.georgia.gov',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government'],
      },
    ],
  },

  // ── Legal ─────────────────────────────────────────────────────────
  {
    id: 'legal',
    tileLabel: 'I need a lawyer',
    title: 'Legal help you do not pay for',
    intro:
      'These handle civil matters — eviction, benefits denials, custody, debt, domestic violence protective orders. For criminal charges, ask the court for a public defender.',
    resources: [
      {
        name: 'Georgia Legal Services Program',
        what: 'Free civil legal help in the 154 counties outside metro Atlanta.',
        phone: '1-833-457-7529',
        phoneDigits: '18334577529',
        url: 'https://www.georgialegalaid.org/apply',
        urlLabel: 'georgialegalaid.org/apply',
        coverage: 'Georgia outside the five metro Atlanta counties',
        badges: ['Free', 'Statewide'],
        barrier:
          'Income-qualified, and demand far exceeds capacity. Apply anyway — they can often give advice even when they cannot take the case.',
      },
      {
        name: 'Atlanta Legal Aid Society',
        what: 'Free civil legal help in Fulton, DeKalb, Clayton, Cobb, and Gwinnett.',
        phone: '404-524-5811',
        phoneDigits: '4045245811',
        url: 'https://atlantalegalaid.org/',
        urlLabel: 'atlantalegalaid.org',
        coverage: 'Fulton · DeKalb · Clayton · Cobb · Gwinnett',
        badges: ['Free', 'Metro Atlanta'],
        barrier:
          'Income-qualified. County lines are separate: Clayton and south Fulton 404-669-0233, Cobb 770-528-2565, DeKalb 404-377-0701, Gwinnett 678-376-4545.',
      },
      {
        name: 'Georgia Senior Legal Aid',
        what: 'Free legal help for Georgians 60 and older.',
        phone: '404-389-9992',
        phoneDigits: '4043899992',
        url: 'https://www.georgialegalaid.org/',
        urlLabel: 'georgialegalaid.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'GeorgiaLegalAid.org',
        what: 'Plain-language explanations of your rights, plus court forms you can fill out yourself.',
        url: 'https://www.georgialegalaid.org/',
        urlLabel: 'georgialegalaid.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
    ],
  },

  // ── Reentry ───────────────────────────────────────────────────────
  {
    id: 'reentry',
    tileLabel: 'I just got out',
    title: 'Coming home from incarceration',
    intro:
      'The first weeks are the hardest: an ID, an address, a job, and a record that follows you into all three. These are the places that work on exactly that.',
    resources: [
      {
        name: 'Georgia Justice Project',
        what: 'Free legal help clearing or restricting a record, plus pardons and the practical barriers that come with a record.',
        url: 'https://www.gjp.org/',
        urlLabel: 'gjp.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
        barrier:
          'Not every charge can be restricted under Georgia law, and eligibility rules are detailed. Georgia broadened First Offender relief for sentences imposed on or after July 1, 2026 — worth asking about even if you were told no before.',
      },
      {
        name: 'Reentry Partnership Housing',
        what: 'Housing for people leaving prison under parole or probation supervision who have nowhere to go.',
        url: 'https://dcs.georgia.gov/',
        urlLabel: 'dcs.georgia.gov',
        coverage: 'All of Georgia',
        badges: ['Government', 'Statewide'],
        barrier:
          'You must be under Department of Community Supervision supervision and have no valid residence plan. Ask your officer to refer you.',
      },
      {
        name: 'Georgia Department of Labor',
        what: 'Job placement and training. Some employers hiring through DOL work specifically with people who have records.',
        url: 'https://dol.georgia.gov/',
        urlLabel: 'dol.georgia.gov',
        coverage: 'Career centers across Georgia',
        badges: ['Free', 'Statewide', 'Government'],
      },
      {
        name: '211 (United Way of Georgia)',
        what: 'For the immediate things — clothes for an interview, a bus pass, food, a place to sleep.',
        phone: '211',
        phoneDigits: '211',
        url: 'https://unitedwayga.org/ga211/',
        urlLabel: 'unitedwayga.org/ga211',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
    ],
  },

  // ── Immigrants and refugees ───────────────────────────────────────
  {
    id: 'immigrants',
    tileLabel: 'I’m an immigrant or refugee',
    title: 'Immigrants, refugees, and asylum seekers',
    intro:
      'Emergency rooms, food pantries, domestic violence shelters, and crisis lines do not ask about immigration status. Some benefit programs do.',
    resources: [
      {
        name: 'New American Pathways',
        what: 'Resettlement support and low-cost immigration legal help for refugees, asylees, and low-income immigrants.',
        url: 'https://newamericanpathways.org/',
        urlLabel: 'newamericanpathways.org',
        coverage: 'Metro Atlanta',
        badges: ['Metro Atlanta', 'Sliding scale'],
      },
      {
        name: 'Catholic Charities Atlanta — Immigration Legal Services',
        what: 'Immigration legal help for people who cannot afford a private attorney. You do not need to be Catholic.',
        url: 'https://catholiccharitiesatlanta.org/services/immigration-legal-services/',
        urlLabel: 'catholiccharitiesatlanta.org',
        coverage: 'Metro Atlanta',
        badges: ['Faith-based', 'Metro Atlanta', 'Sliding scale'],
      },
      {
        name: 'National Immigration Legal Services Directory',
        what: 'Find nonprofit immigration legal providers near you, filtered by what they handle.',
        url: 'https://www.immigrationadvocates.org/legaldirectory/',
        urlLabel: 'immigrationadvocates.org',
        coverage: 'Nationwide',
        badges: ['Free'],
        caution:
          'Only a licensed attorney or a DOJ-accredited representative can legally give immigration advice. A "notario" or immigration consultant cannot, and bad filings can cost you your case. Verify accreditation before you pay anyone.',
      },
      {
        name: 'Georgia Domestic Violence Hotline',
        what: 'Domestic violence services in Georgia do not require immigration status, and survivors may have their own immigration options.',
        phone: '1-800-334-2836',
        phoneDigits: '18003342836',
        altPhone: {
          label: 'En español',
          phone: '770-479-1703',
          phoneDigits: '7704791703',
        },
        url: 'https://gcadv.org/',
        urlLabel: 'gcadv.org',
        hours: 'Every hour of every day',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide', 'Español'],
      },
    ],
  },

  // ── Aging and disability ──────────────────────────────────────────
  {
    id: 'aging',
    tileLabel: 'I’m older, or I have a disability',
    title: 'Older adults and people with disabilities',
    intro:
      'One number covers most of this. Georgia’s ADRC serves all 159 counties and can start almost any of these conversations.',
    resources: [
      {
        name: 'Aging and Disability Resource Connection (ADRC)',
        what: 'One call for in-home care, meals, transportation, caregiver support, and benefits counseling.',
        phone: '1-866-552-4464',
        phoneDigits: '18665524464',
        url: 'https://aging.georgia.gov/programs-and-services/adrc',
        urlLabel: 'aging.georgia.gov',
        hours: 'Monday–Friday, 8am–5pm',
        coverage: 'All 159 Georgia counties',
        badges: ['Free', 'Statewide', 'Government'],
        barrier:
          'Many of the services it connects you to — home-delivered meals, in-home care — carry their own waiting lists.',
      },
      {
        name: 'Adult Protective Services',
        what: 'Report abuse, neglect, or financial exploitation of an older adult or an adult with a disability.',
        phone: '1-866-552-4464',
        phoneDigits: '18665524464',
        url: 'https://georgia.gov/report-elder-abuse',
        urlLabel: 'georgia.gov/report-elder-abuse',
        hours: 'Phone Monday–Friday, 8am–5pm; online any time',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government'],
        barrier:
          'Select your language, then option 3. Outside business hours, use the online form.',
      },
      {
        name: 'Georgia Senior Legal Aid',
        what: 'Free civil legal help for Georgians 60 and older.',
        phone: '404-389-9992',
        phoneDigits: '4043899992',
        url: 'https://www.georgialegalaid.org/',
        urlLabel: 'georgialegalaid.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'Georgia Advocacy Office',
        what: "Georgia's official protection and advocacy agency for people with disabilities — free help defending your rights.",
        phone: '1-800-537-2329',
        phoneDigits: '18005372329',
        altPhone: {
          label: 'Local / TDD',
          phone: '404-885-1234',
          phoneDigits: '4048851234',
        },
        url: 'https://thegao.org/',
        urlLabel: 'thegao.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
      {
        name: 'Center for the Visually Impaired',
        what: 'Rehabilitation, training, and daily-living support for people losing or without sight.',
        phone: '404-875-9011',
        phoneDigits: '4048759011',
        url: 'https://cviga.org/',
        urlLabel: 'cviga.org',
        coverage: '739 West Peachtree St NW, Atlanta',
        badges: ['Metro Atlanta'],
      },
      {
        name: 'Georgia Relay',
        what: 'Free statewide phone relay for people who are deaf, hard of hearing, deafblind, or have a speech disability. Dial 711.',
        phone: '711',
        phoneDigits: '711',
        url: 'https://georgiarelay.org/',
        urlLabel: 'georgiarelay.org',
        hours: 'Every hour of every day, all year',
        coverage: 'All of Georgia',
        badges: ['Free', '24/7', 'Statewide'],
      },
      {
        name: 'Georgia Council on Developmental Disabilities',
        what: 'Advocacy, information, and help navigating disability services in Georgia.',
        url: 'https://gcdd.org/',
        urlLabel: 'gcdd.org',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
    ],
  },

  // ── Work, ID, benefits ────────────────────────────────────────────
  {
    id: 'work',
    tileLabel: 'I need work, an ID, or benefits',
    title: 'Work, ID, and benefits',
    intro:
      'An ID unlocks almost everything else — a job, a lease, a bank account, a benefits application. If you are missing one, start there.',
    resources: [
      {
        name: 'Georgia Department of Labor',
        what: 'Career centers across the state for job placement, training, and unemployment claims.',
        url: 'https://dol.georgia.gov/',
        urlLabel: 'dol.georgia.gov',
        coverage: 'Career centers across Georgia',
        badges: ['Free', 'Statewide', 'Government'],
      },
      {
        name: 'Georgia Gateway',
        what: 'One application for SNAP, Medicaid, PeachCare, TANF, and childcare help.',
        phone: '1-877-423-4746',
        phoneDigits: '18774234746',
        url: 'https://gateway.ga.gov/',
        urlLabel: 'gateway.ga.gov',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide', 'Government', 'Español'],
        barrier:
          'Takes 30–60 minutes online. If you have no internet, every DFCS office has public computers in the lobby.',
      },
      {
        name: 'Goodwill of North Georgia',
        what: 'Free career centers — résumé help, computer access, interview clothes, and job training in trades like welding and healthcare.',
        url: 'https://goodwillng.org/putting-people-to-work/',
        urlLabel: 'goodwillng.org',
        coverage: 'Career centers across north Georgia',
        badges: ['Free', 'Metro Atlanta'],
      },
      {
        name: 'Georgia Vocational Rehabilitation Agency (GVRA)',
        what: 'Pays for training, equipment, and job placement for people whose disability is a barrier to working.',
        url: 'https://gvs.georgia.gov/',
        urlLabel: 'gvs.georgia.gov',
        coverage: 'Offices across Georgia',
        badges: ['Free', 'Statewide', 'Government'],
        barrier:
          'Requires a referral and an eligibility determination through your local GVRA office, funding is limited, and training seats fill quickly. Start the referral before you need the seat.',
      },
      {
        name: 'Georgia birth certificate (Vital Records)',
        what: 'Order a certified copy of a Georgia birth certificate — usually the first document you need to get an ID.',
        url: 'https://dph.georgia.gov/vitalrecords',
        urlLabel: 'dph.georgia.gov/vitalrecords',
        coverage: 'All of Georgia',
        badges: ['Statewide', 'Government'],
        barrier:
          'There is a fee, and you generally need photo ID to get the document that helps you get photo ID. A legal aid office or a homeless services agency can often help you break that loop.',
      },
      {
        name: '211 (United Way of Georgia)',
        what: 'Ask specifically for help with ID replacement, bus passes, work clothes, or tools — local funds exist for all of it.',
        phone: '211',
        phoneDigits: '211',
        url: 'https://unitedwayga.org/ga211/',
        urlLabel: 'unitedwayga.org/ga211',
        coverage: 'All of Georgia',
        badges: ['Free', 'Statewide'],
      },
    ],
  },

  // ── Faith communities ─────────────────────────────────────────────
  {
    id: 'faith',
    tileLabel: 'I want to talk to a church',
    title: 'If you want to talk to a church',
    intro:
      'Only if you want to. Everything above works whether or not you ever set foot in a church, and nothing on this page is conditioned on believing anything.',
    resources: [
      {
        name: 'The Salvation Army',
        what: 'Practical help — rent, utilities, food, clothing, disaster relief — through local corps across Georgia.',
        url: 'https://www.salvationarmyusa.org/usn/find-a-location/',
        urlLabel: 'salvationarmyusa.org',
        coverage: 'Locations across Georgia',
        badges: ['Faith-based'],
        barrier:
          'Funds, hours, and intake days are set locally. Call your specific location first.',
      },
      {
        name: 'Catholic Charities Atlanta',
        what: 'Counseling, immigration legal services, refugee resettlement, and family support. You do not need to be Catholic.',
        url: 'https://catholiccharitiesatlanta.org/',
        urlLabel: 'catholiccharitiesatlanta.org',
        coverage: 'Metro Atlanta',
        badges: ['Faith-based', 'Metro Atlanta', 'Sliding scale'],
      },
      {
        name: 'St. Vincent de Paul Georgia',
        what: 'Parish-based help with rent, utilities, food, prescriptions, and furniture.',
        phone: '770-458-9607',
        phoneDigits: '7704589607',
        url: 'https://svdpgeorgia.org/',
        urlLabel: 'svdpgeorgia.org',
        coverage: 'Across Georgia',
        badges: ['Faith-based'],
        barrier:
          'Organized by parish territory — what is available depends on which conference covers your address.',
      },
      {
        name: 'A word about faith-based help generally',
        what: 'Churches and faith-based agencies do an enormous share of the direct help in Georgia, and most give it freely with no strings.',
        badges: [],
        caution:
          'A few condition help on attending a service, a class, or a program. That is worth knowing before you go, not after. It is always fair to ask on the phone: "Do I have to attend anything to receive help?" A good answer is a straight one.',
      },
    ],
  },
]

/** Every category id, for anchor validation and the triage grid. */
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
