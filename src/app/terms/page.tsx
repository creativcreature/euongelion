import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | EUONGELION',
  description: 'Terms and conditions for using the EUONGELION devotional application.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="max-w-3xl mx-auto py-12">
        <Link href="/" className="text-[#c19a6b] hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-[#f7f3ed] mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 19, 2026</p>

        <div className="prose prose-invert prose-gold max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 mb-4">
              By accessing or using EUONGELION ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
            </p>
            <p className="text-gray-300">
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">2. Description of Service</h2>
            <p className="text-gray-300 mb-4">
              EUONGELION is a Christian devotional application that provides:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Daily devotional content organized into series</li>
              <li>Soul Audit assessment for personalized spiritual pathway recommendations</li>
              <li>Progress tracking across devotional series</li>
              <li>Bookmarking and note-taking features</li>
              <li>Offline access to downloaded content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">3. User Accounts</h2>
            <p className="text-gray-300 mb-4">
              When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.
            </p>
            <p className="text-gray-300 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Safeguarding the password you use to access the Service</li>
              <li>Any activities or actions under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">4. Acceptable Use</h2>
            <p className="text-gray-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reproduce, distribute, or create derivative works from our content without permission</li>
              <li>Use automated systems to access the Service</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm others through the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">5. Intellectual Property</h2>
            <p className="text-gray-300 mb-4">
              The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of EUONGELION and its licensors.
            </p>
            <p className="text-gray-300 mb-4">
              Our content is protected by copyright, trademark, and other laws. You may not:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Copy, modify, or distribute our devotional content for commercial purposes</li>
              <li>Use our trademarks without prior written consent</li>
              <li>Remove any copyright or proprietary notices</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Scripture quotations are used under license from their respective publishers and are subject to their terms of use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">6. User Content</h2>
            <p className="text-gray-300 mb-4">
              You retain ownership of any content you create within the Service (such as notes and highlights). By creating content, you grant us a non-exclusive license to store and display that content as part of providing the Service.
            </p>
            <p className="text-gray-300">
              You are solely responsible for the content you create and must ensure it does not violate any laws or third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">7. Disclaimer</h2>
            <p className="text-gray-300 mb-4">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Implied warranties of merchantability or fitness for a particular purpose</li>
              <li>Warranties that the Service will be uninterrupted or error-free</li>
              <li>Warranties regarding the accuracy or reliability of content</li>
            </ul>
            <p className="text-gray-300 mt-4">
              <strong className="text-[#c19a6b]">Spiritual Content Disclaimer:</strong> The devotional content is intended for spiritual encouragement and education. It is not a substitute for professional counseling, medical advice, or pastoral care. If you are experiencing a crisis, please seek appropriate professional help.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-300">
              In no event shall EUONGELION, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">9. Termination</h2>
            <p className="text-gray-300 mb-4">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p className="text-gray-300">
              Upon termination, your right to use the Service will cease immediately. You may also delete your account at any time through the app settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">10. Changes to Terms</h2>
            <p className="text-gray-300">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">11. Governing Law</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">12. Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-[#c19a6b] mt-2">legal@euongelion.app</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/privacy" className="text-[#c19a6b] hover:underline">
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  )
}
