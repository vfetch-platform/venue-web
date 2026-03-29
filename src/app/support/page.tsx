'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import {
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { buttonStyles, cardStyles, inputStyles } from '@/utils/styles';

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending — replace with real API call when ready
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-600 mt-1">
            Need help? Reach out to the VFetch team and we&apos;ll get back to you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact cards */}
          <div className="space-y-4">
            <div className={`${cardStyles} p-4 flex items-start gap-3`}>
              <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                <EnvelopeIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Email us</p>
                <a
                  href="mailto:info@vfetch.co.uk"
                  className="text-sm text-slate-500 hover:text-slate-800 transition-colors break-all"
                >
                  info@vfetch.co.uk
                </a>
              </div>
            </div>

            <div className={`${cardStyles} p-4 flex items-start gap-3`}>
              <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                <QuestionMarkCircleIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Response time</p>
                <p className="text-sm text-slate-500">We typically reply within 1–2 business days.</p>
              </div>
            </div>

            <div className={`${cardStyles} p-4 flex items-start gap-3`}>
              <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">About VFetch</p>
                <p className="text-sm text-slate-500">
                  Built by a small team passionate about helping venues manage lost & found efficiently.
                </p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className={`${cardStyles} p-6`}>
              {submitted ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold text-slate-900">Message sent!</h3>
                  <p className="text-sm text-slate-500">
                    Thanks for reaching out. We&apos;ll get back to you soon.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className={`${buttonStyles.secondary} mt-2`}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900">Send us a message</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={inputStyles}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className={inputStyles}
                    >
                      <option value="" disabled>Select a topic</option>
                      <option value="general">General question</option>
                      <option value="bug">Report a bug</option>
                      <option value="billing">Billing</option>
                      <option value="feature">Feature request</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe your issue or question..."
                      className={`${inputStyles} resize-none`}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={loading} className={buttonStyles.primary}>
                      {loading ? 'Sending...' : 'Send message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
          © {new Date().getFullYear()} VFetch. All rights reserved.
        </div>
      </div>
    </Layout>
  );
}
