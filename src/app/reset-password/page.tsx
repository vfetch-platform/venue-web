'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read token/email from URL once, store in sessionStorage, then strip from URL
  // so the token doesn't appear in server logs, referrer headers, or browser history.
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  if (tokenFromUrl && emailFromUrl && typeof window !== 'undefined') {
    sessionStorage.setItem('reset_token', tokenFromUrl);
    sessionStorage.setItem('reset_email', emailFromUrl);
    // Replace URL without query params so the token isn't logged/shared
    window.history.replaceState({}, '', window.location.pathname);
  }

  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('reset_token') || tokenFromUrl)
    : tokenFromUrl;
  const email = typeof window !== 'undefined'
    ? (sessionStorage.getItem('reset_email') || emailFromUrl)
    : emailFromUrl;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setStatus('invalid');
      setErrorMessage('Missing token or email in the link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.auth.verifyResetToken(token, email);
        if (response.success && response.data?.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
          setErrorMessage(response.error || 'Invalid or expired reset token.');
        }
      } catch {
        setStatus('invalid');
        setErrorMessage('Failed to verify token. It may have expired.');
      }
    };

    verifyToken();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!token || !email) throw new Error('Missing token or email');
      
      const response = await api.auth.resetPassword(token, password, email);
      if (response.success) {
        setStatus('success');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setErrorMessage(response.error || 'Failed to reset password');
        setStatus('error'); // Back to form
      }
    } catch (err) {
      setErrorMessage((err as { message?: string }).message || 'An error occurred');
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-xl font-medium text-gray-900">Invalid or Expired Link</h2>
            <p className="mt-2 text-gray-600">{errorMessage}</p>
            <div className="mt-6">
              <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="mt-4 text-xl font-medium text-gray-900">Password Set Successfully!</h2>
            <p className="mt-2 text-gray-600">You can now enable your account and login.</p>
            <p className="mt-4 text-sm text-gray-500">Redirecting to login page...</p>
            <div className="mt-6">
              <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please create a secure password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errorMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Setting Password...' : 'Set Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
