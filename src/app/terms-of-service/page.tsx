import Link from 'next/link';
import VFLogo from '@/components/VFLogo';

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Venue Portal &mdash; Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none text-slate-700 text-[15px] leading-relaxed space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the VFetch Venue Portal at venue.vfetch.co.uk (the &ldquo;Portal&rdquo;), operated by VFetch Ltd (&ldquo;VFetch&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
            <p>
              By accessing or using the Portal, you agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Portal. These Terms apply specifically to venue staff members and administrators who use the Portal to manage lost and found items.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Eligibility &amp; Account Access</h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access to the Portal is provided to authorised venue staff and administrators only. Accounts are created by a venue administrator or VFetch on behalf of your venue.</li>
              <li>You must be at least 18 years of age to use the Portal.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials. Do not share your account with others.</li>
              <li>You must notify your venue administrator and VFetch immediately if you suspect any unauthorised use of your account.</li>
              <li>VFetch reserves the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Permitted Use</h2>
            <p>The Portal is provided solely for the purpose of managing your venue&rsquo;s lost and found operations. You may use the Portal to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Log and catalogue lost items found at your venue</li>
              <li>Upload photographs and descriptions of lost items</li>
              <li>Review, approve, or reject customer claims</li>
              <li>Manage item collection and handover processes</li>
              <li>View dashboard analytics and audit logs for your venue</li>
              <li>Manage staff accounts (administrators only)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Portal for any purpose other than managing your venue&rsquo;s lost and found operations</li>
              <li>Upload false, misleading, or fraudulent item information</li>
              <li>Access or attempt to access data from other venues</li>
              <li>Share customer personal information obtained through the Portal outside of the claim resolution process</li>
              <li>Attempt to reverse-engineer, decompile, or extract the source code of the Portal</li>
              <li>Use automated scripts, bots, or scrapers to access the Portal</li>
              <li>Introduce malware, viruses, or other harmful code</li>
              <li>Circumvent or disable any security features of the Portal</li>
              <li>Use the Portal in any way that violates applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Item Management Responsibilities</h2>
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">5.1 Logging Items</h3>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>You must provide accurate and complete descriptions when logging found items.</li>
              <li>Photographs should clearly represent the item in its found condition.</li>
              <li>Items should be logged promptly after discovery.</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">5.2 Processing Claims</h3>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Claims must be reviewed in good faith and in a timely manner.</li>
              <li>Approval or rejection decisions should be based on the evidence provided by the claimant and the item details on record.</li>
              <li>A reason must be provided when rejecting a claim.</li>
              <li>You must verify the claimant&rsquo;s identity before releasing an item for collection.</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">5.3 Item Custody</h3>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your venue is responsible for the physical safekeeping of all logged items until they are collected or disposed of.</li>
              <li>VFetch provides the digital management platform only and does not take physical custody of any items.</li>
              <li>Item retention and disposal must comply with your venue&rsquo;s policies and applicable local regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data &amp; Privacy</h2>
            <p>
              Your use of the Portal is also governed by our{' '}
              <Link href="/privacy-policy" className="text-slate-900 font-medium underline underline-offset-2">Privacy Policy</Link>,
              which describes how we collect, use, and protect your data.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>You must handle all customer personal data accessed through the Portal in accordance with applicable data protection laws (including UK GDPR).</li>
              <li>Customer information obtained through the claims process must only be used for the purpose of resolving the specific claim.</li>
              <li>You must not export, copy, or store customer personal data outside of the Portal unless required for legitimate claim resolution and in compliance with your venue&rsquo;s data protection policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Intellectual Property</h2>
            <p>
              The Portal, including its design, code, features, and branding, is the property of VFetch Ltd and is protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the Portal for its intended purpose.
            </p>
            <p className="mt-2">
              Content you upload (item photographs, descriptions) remains your venue&rsquo;s property. By uploading content, you grant VFetch a licence to store, process, and display that content as necessary to provide the service, including AI-powered image analysis and item matching.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Service Availability</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>We aim to keep the Portal available 24/7 but do not guarantee uninterrupted access.</li>
              <li>We may perform maintenance, updates, or modifications that temporarily affect availability.</li>
              <li>We will make reasonable efforts to notify venue administrators of planned downtime in advance.</li>
              <li>We are not liable for any losses resulting from service unavailability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>The Portal is provided &ldquo;as is&rdquo; without warranties of any kind, whether express or implied.</li>
              <li>VFetch is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Portal.</li>
              <li>VFetch is not responsible for the physical handling, safekeeping, or condition of lost items logged through the Portal.</li>
              <li>VFetch is not liable for disputes between your venue and customers regarding item claims.</li>
              <li>Our total liability for any claim arising from the use of the Portal shall not exceed the fees paid by your venue in the 12 months preceding the claim.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold VFetch harmless from any claims, damages, losses, or expenses (including legal fees) arising from your violation of these Terms, misuse of the Portal, or your venue&rsquo;s handling of lost items and customer claims.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Termination</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your venue administrator may deactivate your account at any time.</li>
              <li>VFetch may suspend or terminate access to the Portal if you breach these Terms.</li>
              <li>Upon termination, your access to the Portal will cease immediately. Your venue&rsquo;s data will be handled in accordance with our data retention policies and any applicable service agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated to venue administrators via email. Continued use of the Portal after changes take effect constitutes acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Portal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms or your use of the Portal shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at:
            </p>
            <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
              <p className="font-medium text-slate-900">VFetch Ltd</p>
              <p>Email: <a href="mailto:info@vfetch.co.uk" className="text-slate-900 underline underline-offset-2">info@vfetch.co.uk</a></p>
              <p>Legal: <a href="mailto:legal@vfetch.co.uk" className="text-slate-900 underline underline-offset-2">legal@vfetch.co.uk</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} VFetch Ltd. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link href="/login" className="hover:text-slate-600 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
