import Link from 'next/link';
import VFLogo from '@/components/VFLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <VFLogo size={28} />
            <span className="text-slate-900 font-semibold text-sm tracking-tight">Vfetch Venue Portal</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Venue Portal &mdash; Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none text-slate-700 text-[15px] leading-relaxed space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              VFetch Ltd (&ldquo;VFetch&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Venue Portal at venue.vfetch.co.uk (the &ldquo;Portal&rdquo;). This Privacy Policy explains how we collect, use, store, and protect information when you use the Portal as a venue staff member or administrator.
            </p>
            <p>
              By accessing or using the Portal, you agree to the practices described in this policy. If you do not agree, please do not use the Portal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2.1 Account Information</h3>
            <p>When your venue administrator creates your staff account, we collect:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Full name (first and last name)</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Role and permissions within your venue</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2.2 Lost &amp; Found Item Data</h3>
            <p>When you log lost items through the Portal, we collect:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Item descriptions, categories, and identifying details (colour, brand, model)</li>
              <li>Photographs of items uploaded by venue staff</li>
              <li>Location where the item was found within the venue</li>
              <li>Date and time of discovery</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2.3 Claim &amp; Collection Data</h3>
            <p>When customers submit claims that you process through the Portal, we store:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Claim status and history (pending, approved, rejected, collected)</li>
              <li>Approval or rejection reasons provided by staff</li>
              <li>Collection method and timestamps</li>
              <li>Pickup verification codes</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2.4 Usage &amp; Technical Data</h3>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>IP address, browser type, and device information</li>
              <li>Pages visited, actions taken, and timestamps</li>
              <li>Audit log entries (actions performed within the Portal)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Provide the Service:</strong> Enable you to log, manage, and track lost items and process customer claims.</li>
              <li><strong>Authentication &amp; Security:</strong> Verify your identity, manage sessions, and protect against unauthorised access.</li>
              <li><strong>Communication:</strong> Send password resets, claim notifications, and important service updates via email.</li>
              <li><strong>Audit &amp; Compliance:</strong> Maintain audit logs of actions for accountability and dispute resolution.</li>
              <li><strong>Service Improvement:</strong> Analyse usage patterns to improve Portal functionality and performance.</li>
              <li><strong>AI-Powered Features:</strong> Process uploaded images through AI to extract item descriptions and facilitate matching with customer queries.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Your Venue Organisation:</strong> Venue administrators can view staff accounts, activity, and audit logs within their venue.</li>
              <li><strong>Customers:</strong> Limited item information is shared with customers who submit claims (item descriptions, images, claim status). Your personal staff details are not shared with customers.</li>
              <li><strong>Service Providers:</strong> Cloud hosting (AWS), image storage, AI processing, and email delivery services that process data on our behalf under strict data processing agreements.</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Staff Accounts:</strong> Retained for as long as your account is active or as needed to provide the service. Deactivated accounts are retained for 12 months before deletion.</li>
              <li><strong>Item Data:</strong> Retained for the duration of the item lifecycle plus 6 months after collection or expiry for dispute resolution.</li>
              <li><strong>Audit Logs:</strong> Retained for 12 months.</li>
              <li><strong>Images:</strong> Retained for the item lifecycle plus 3 months, then permanently deleted from storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>HTTPS encryption for all data in transit</li>
              <li>Encrypted storage for passwords (bcrypt hashing)</li>
              <li>HTTP-only secure cookies for authentication tokens</li>
              <li>Role-based access control (staff vs. admin permissions)</li>
              <li>Regular security reviews and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
            <p>Under applicable data protection laws (including UK GDPR), you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate personal data.</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal retention obligations).</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances.</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@vfetch.co.uk" className="text-slate-900 font-medium underline underline-offset-2">privacy@vfetch.co.uk</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Cookies</h2>
            <p>
              The Portal uses essential cookies only for authentication and session management. We do not use advertising or tracking cookies. Authentication cookies are HTTP-only and secure, and expire after 30 days (or when you sign out).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify venue administrators of material changes via email. Continued use of the Portal after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
              <p className="font-medium text-slate-900">VFetch Ltd</p>
              <p>Email: <a href="mailto:privacy@vfetch.co.uk" className="text-slate-900 underline underline-offset-2">privacy@vfetch.co.uk</a></p>
              <p>General: <a href="mailto:info@vfetch.co.uk" className="text-slate-900 underline underline-offset-2">info@vfetch.co.uk</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} VFetch Ltd. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms-of-service" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
            <Link href="/login" className="hover:text-slate-600 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
