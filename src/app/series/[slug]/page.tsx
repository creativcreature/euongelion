'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const SERIES_DATA: Record<string, {
  title: string;
  question: string;
  introduction: string;
  context: string;
  framework: string;
  days: Array<{ day: number; title: string; slug: string }>;
}> = {
  identity: {
    title: "Identity Crisis",
    question: "When everything that defined you is shaken, who are you?",
    introduction: "Your country, your job, your security—all unstable. So who are you, really? This 5-day journey explores what remains when the labels fall away.",
    context: "In 2026, political violence is at 1970s levels. Your job title doesn't guarantee security anymore. The definitions that once told you who you were are fracturing. This series asks the uncomfortable question: if you're not what you do, what you earn, or what country you belong to—then who are you?",
    framework: "Matthew 6:33 - Seek first the kingdom, and all these things will be added",
    days: [
      { day: 1, title: "When everything shakes", slug: 'identity-crisis-day-1' },
      { day: 2, title: "The narrative breaks", slug: 'identity-crisis-day-2' },
      { day: 3, title: "You are whose you are", slug: 'identity-crisis-day-3' },
      { day: 4, title: "Living from identity", slug: 'identity-crisis-day-4' },
      { day: 5, title: "What remains", slug: 'identity-crisis-day-5' },
    ],
  },
  peace: {
    title: "Peace",
    question: "What if peace isn't found by controlling your circumstances?",
    introduction: "You've tried to control everything. And you're exhausted. This 5-day journey explores a different kind of peace—one that doesn't depend on your circumstances.",
    context: "43% more anxious than last year. You refresh the news obsessively, doomscrolling to see if your world is still intact. You try to manage every variable, control every outcome. But the tighter you grip, the less peace you have.",
    framework: "John 14:27 - Peace I give you, not as the world gives",
    days: [
      { day: 1, title: "The illusion of control", slug: 'peace-day-1' },
      { day: 2, title: "The exhaustion of managing", slug: 'peace-day-2' },
      { day: 3, title: "Peace the world can't give", slug: 'peace-day-3' },
      { day: 4, title: "Practicing surrender", slug: 'peace-day-4' },
      { day: 5, title: "Peace as gift", slug: 'peace-day-5' },
    ],
  },
  community: {
    title: "Community",
    question: "Who are your people when systems fail?",
    introduction: "Institutions are failing. Networks are transactional. 29% are frequently lonely. This 5-day journey explores covenant community—the kind that remains when everything else collapses.",
    context: "71% are dissatisfied with democracy. The systems you trusted are fracturing. Your professional network disappears when you lose your job. Your contacts ghost you in crisis. In a world of transactional relationships, who actually stays?",
    framework: "Matthew 18:20 - Where two or three gather in my name",
    days: [
      { day: 1, title: "When systems fail", slug: 'community-day-1' },
      { day: 2, title: "The loneliness epidemic", slug: 'community-day-2' },
      { day: 3, title: "You're not meant to be alone", slug: 'community-day-3' },
      { day: 4, title: "Covenant in practice", slug: 'community-day-4' },
      { day: 5, title: "Who remains", slug: 'community-day-5' },
    ],
  },
  kingdom: {
    title: "Kingdom",
    question: "What if the kingdom you're looking for is already here?",
    introduction: "You've been searching for refuge in politics, economics, and curated spirituality. You're exhausted. This 5-day journey reveals the kingdom that's been here all along.",
    context: "You voted, donated, argued online. You optimized your finances, stockpiled savings. You sampled Buddhism, mindfulness, astrology. You've been looking for a kingdom that won't collapse. But you've been looking in empires.",
    framework: "Luke 17:21 + Matthew 6:33 - The kingdom is in your midst. Seek it first.",
    days: [
      { day: 1, title: "Searching in wrong places", slug: 'kingdom-day-1' },
      { day: 2, title: "The exhaustion of empires", slug: 'kingdom-day-2' },
      { day: 3, title: "The kingdom is here", slug: 'kingdom-day-3' },
      { day: 4, title: "Seeking first", slug: 'kingdom-day-4' },
      { day: 5, title: "Everything else added", slug: 'kingdom-day-5' },
    ],
  },
  provision: {
    title: "Provision",
    question: "What if provision isn't about having enough, but sharing what you have?",
    introduction: "47.9M are food insecure while others stockpile. This 5-day journey explores God's backwards economy: sharing creates abundance, hoarding creates scarcity.",
    context: "Inflation has eaten 25% of your purchasing power. You're stockpiling, building contingencies, trying to have enough. But the fear of scarcity is making you hoard. And the hoarding is making you emptier.",
    framework: "Matthew 6:33 - Seek first the kingdom, and all these things will be added",
    days: [
      { day: 1, title: "The scarcity mindset", slug: 'provision-day-1' },
      { day: 2, title: "Fear drives hoarding", slug: 'provision-day-2' },
      { day: 3, title: "God's backwards economy", slug: 'provision-day-3' },
      { day: 4, title: "Mutual aid in practice", slug: 'provision-day-4' },
      { day: 5, title: "When you share, needs are met", slug: 'provision-day-5' },
    ],
  },
  truth: {
    title: "Truth",
    question: "How do you know what's real when misinformation is everywhere?",
    introduction: "Deepfakes. AI-generated content. Partisan bubbles. You can't trust anything. This 5-day journey moves from information overload to knowing the one who is true.",
    context: "You're drowning in 500M tweets per day. Deepfakes are indistinguishable from reality. 60-73% encounter misinformation daily. You don't know what's real anymore. And the hypervigilance is exhausting you.",
    framework: "John 14:6 - I am the way, the truth, and the life",
    days: [
      { day: 1, title: "Drowning in information", slug: 'truth-day-1' },
      { day: 2, title: "Can't trust yourself", slug: 'truth-day-2' },
      { day: 3, title: "Truth is a person", slug: 'truth-day-3' },
      { day: 4, title: "From information to wisdom", slug: 'truth-day-4' },
      { day: 5, title: "Truth was searching for you", slug: 'truth-day-5' },
    ],
  },
  hope: {
    title: "Hope",
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    introduction: "57% are pessimistic about 2026. Optimism is dead. Toxic positivity fails. This 5-day journey explores resurrection hope—the kind that enters darkness instead of denying it.",
    context: "Climate crisis. Political violence. Economic collapse. Everything feels apocalyptic. Toxic positivity says \"stay positive!\" But that's not working. This series offers something different: hope that's honest about the dark.",
    framework: "Lamentations 3:22-23 - His mercies are new every morning",
    days: [
      { day: 1, title: "Optimism is dead", slug: 'hope-day-1' },
      { day: 2, title: "Grief is holy", slug: 'hope-day-2' },
      { day: 3, title: "Hope enters darkness", slug: 'hope-day-3' },
      { day: 4, title: "Practicing faithfulness", slug: 'hope-day-4' },
      { day: 5, title: "Resurrection promise", slug: 'hope-day-5' },
    ],
  },
};

export default function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);
  const series = SERIES_DATA[slug];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.observe-fade');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Series Not Found</h1>
          <Link
            href="/"
            className="bg-black px-10 py-5 text-label vw-small hover:bg-gray-800 transition-all duration-300 inline-block"
            style={{ color: '#FAF9F6' }}
          >
            ← Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      {/* Top Bar */}
      <nav className="flex items-center justify-center px-6 md:px-12 lg:px-20 py-8 relative">
        <Link href="/">
          <div className="relative w-40 h-10 cursor-pointer">
            <Image
              src="/logos/Logo-19.png"
              alt="wokeGod"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <Link
          href="/admin/unlock"
          className="absolute right-6 md:right-12 lg:right-20 text-gray-400 hover:text-black transition-colors duration-300 vw-small"
        >
          Sign In
        </Link>
      </nav>

      {/* Series Introduction */}
      <header className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-20 md:pb-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            {/* Back Link */}
            <Link
              href="/"
              className="text-gray-400 hover:text-black transition-colors duration-300 vw-small mb-12 inline-block observe-fade"
            >
              ← All Questions
            </Link>

            {/* Series Title */}
            <div className="mb-16 md:mb-24 observe-fade fade-in-delay-1">
              <h1 className="text-display vw-heading-xl mb-8">
                {series.question}
              </h1>
              <p className="text-label vw-small" style={{ color: '#B8860B' }}>
                {series.framework}
              </p>
            </div>

            {/* Introduction Grid */}
            <div className="grid md:grid-cols-12 gap-8 md:gap-12 mb-20 md:mb-32">
              <div className="md:col-span-7">
                <p className="text-serif-italic vw-body-lg mb-8 observe-fade fade-in-delay-2">
                  {series.introduction}
                </p>
                <p className="vw-body text-gray-700 observe-fade fade-in-delay-3">
                  {series.context}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="bg-gray-50 p-8 md:p-10 observe-fade fade-in-delay-4">
                  <p className="text-label vw-small mb-4" style={{ color: '#B8860B' }}>
                    5-DAY JOURNEY
                  </p>
                  <p className="vw-body text-gray-700 leading-relaxed">
                    This series follows a chiastic structure (A-B-C-B'-A'). Days 1 and 5 mirror each other. Days 2 and 4 mirror each other. Day 3 is the pivot—the core revelation everything builds toward.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 5 Days */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pb-32 md:pb-48">
        <div className="grid md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <div className="space-y-1 md:space-y-2">
              {series.days.map((day, index) => (
                <Link
                  key={day.slug}
                  href={`/devotional/${day.slug}`}
                  className={`block group observe-fade ${index > 0 ? `fade-in-delay-${Math.min(index, 4)}` : ''}`}
                >
                  <div className={`grid md:grid-cols-12 gap-6 md:gap-12 py-8 md:py-10 border-b border-gray-200 hover:border-gray-400 transition-all duration-300 ${day.day === 3 ? 'md:bg-gray-50 md:-mx-8 md:px-8' : ''}`}>
                    <div className="md:col-span-1">
                      <span className="text-label vw-small" style={{ color: day.day === 3 ? '#B8860B' : '#999' }}>
                        DAY {day.day}
                      </span>
                    </div>

                    <div className="md:col-span-9">
                      <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                        <span className="group-hover:text-[#B8860B] transition-colors duration-300">
                          {day.title}
                        </span>
                      </p>
                    </div>

                    <div className="md:col-span-2 flex items-center justify-end">
                      <span className="text-label vw-small text-gray-400 group-hover:text-black transition-colors duration-300">
                        READ →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-6 md:col-start-4">
              <p className="text-label text-gray-400 vw-small leading-relaxed">
                VENERATE THE MIRACLE.<br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small text-gray-400 mt-8">
                © 2026 EUONGELION · A wokeGod project
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
