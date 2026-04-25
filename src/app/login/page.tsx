'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';
import { ROUTES } from '@/constants/routes';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import VFLogo from '@/components/VFLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push(ROUTES.CLAIMS);
    } catch {
      // Error is handled in the store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background image */}
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-slate-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <VFLogo size={36} />
            <span className="text-white font-semibold text-lg tracking-tight">Vfetch Venue Portal</span>
          </div>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Empowering venues with effortless recovery.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Join hundreds of premium venues managing lost items through our intelligent digital concierge system.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <div className="flex items-center gap-2.5">
            <VFLogo size={36} />
            <span className="text-slate-900 font-semibold text-lg tracking-tight">Vfetch Venue Portal</span>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to manage your venue&apos;s lost and found items</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  placeholder="name@venue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link href={ROUTES.RESET_PASSWORD} className="text-sm font-medium text-slate-900 hover:text-slate-700 transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer">
                Stay signed in for 30 days
              </label>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href={ROUTES.PRIVACY_POLICY} className="hover:text-slate-600 transition">Privacy Policy</Link>
            <span>·</span>
            <Link href={ROUTES.TERMS_OF_SERVICE} className="hover:text-slate-600 transition">Terms of Service</Link>
            <span>·</span>
            <a href="mailto:info@vfetch.co.uk" className="hover:text-slate-600 transition">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
