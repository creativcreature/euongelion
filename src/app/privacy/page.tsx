import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | EUONGELION',
  description: 'How EUONGELION collects, uses, and protects your personal information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="max-w-3xl mx-auto py-12">
        <Link href="/" className="text-[#c19a6b] hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-[#f7f3ed] mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 19, 2026</p>

        <div className="prose prose-invert prose-gold max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">1. Introduction</h2>
            <p className="text-gray-300 mb-4">
              EUONGELION ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our devotional application and website.
            </p>
            <p className="text-gray-300">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-[#c19a6b] mb-3">Personal Information</h3>
            <p className="text-gray-300 mb-4">
              We may collect personal information that you voluntarily provide when you:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Create an account (email address, password)</li>
              <li>Complete the Soul Audit assessment</li>
              <li>Update your profile information</li>
              <li>Contact us with questions or feedback</li>
            </ul>

            <h3 className="text-xl font-medium text-[#c19a6b] mb-3">Usage Information</h3>
            <p className="text-gray-300 mb-4">
              We automatically collect certain information when you use the app:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Reading progress and completed devotionals</li>
              <li>Bookmarked content</li>
              <li>Device information (browser type, operating system)</li>
              <li>Log data (access times, pages viewed)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Provide and maintain our service</li>
              <li>Personalize your devotional experience based on your spiritual pathway</li>
              <li>Track your reading progress across devices</li>
              <li>Send you relevant notifications (with your permission)</li>
              <li>Improve our content and features</li>
              <li>Respond to your inquiries and support requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-300 mb-4">
              Your data is stored securely using Supabase, which provides enterprise-grade security including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Encryption at rest and in transit</li>
              <li>Row-level security policies</li>
              <li>Regular security audits</li>
              <li>SOC 2 Type II compliance</li>
            </ul>
            <p className="text-gray-300 mt-4">
              While we implement safeguards to protect your information, no electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">5. Information Sharing</h2>
            <p className="text-gray-300 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share information only in these circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>With service providers who assist in operating our application (e.g., hosting, analytics)</li>
              <li>If required by law or to protect our rights</li>
              <li>In connection with a merger or acquisition (you would be notified)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
              <li>Disable push notifications</li>
              <li>Export your data</li>
            </ul>
            <p className="text-gray-300 mt-4">
              To exercise these rights, please contact us at privacy@euongelion.app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">7. Children's Privacy</h2>
            <p className="text-gray-300">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">8. Cookies and Local Storage</h2>
            <p className="text-gray-300 mb-4">
              We use local storage to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Remember your theme preference (light/dark mode)</li>
              <li>Cache content for offline access</li>
              <li>Maintain your session</li>
            </ul>
            <p className="text-gray-300 mt-4">
              You can clear this data through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-300">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-4">10. Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-[#c19a6b] mt-2">privacy@euongelion.app</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/terms" className="text-[#c19a6b] hover:underline">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  )
}
