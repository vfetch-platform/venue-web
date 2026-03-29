'use client';

import Link from 'next/link';
import VFLogo from '@/components/VFLogo';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { ROUTES } from '@/constants/routes';
import { useState, useEffect, useRef } from 'react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  UsersIcon,
  PlusIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowLeftStartOnRectangleIcon,
  BellIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

const baseNavigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD as string, icon: ChartBarIcon },
  { name: 'Items', href: ROUTES.ITEMS as string, icon: HomeIcon },
  { name: 'Claims', href: ROUTES.CLAIMS as string, icon: ClipboardDocumentListIcon },
  { name: 'Audit Log', href: ROUTES.AUDIT as string, icon: DocumentTextIcon },
];

const adminNavigation = [
  ...baseNavigation,
  { name: 'Admin', href: ROUTES.ADMIN, icon: CogIcon },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { venue, logout, isAuthenticated, isInitialized, checkAuth, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [venueMenuOpen, setVenueMenuOpen] = useState(false);
  const venueMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (venueMenuRef.current && !venueMenuRef.current.contains(e.target as Node)) {
        setVenueMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) setMobileOpen(false);
      if (venueMenuOpen) setVenueMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, venueMenuOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    if (mq.matches) setMobileOpen(false);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const navigation = [...baseNavigation];
  if (user?.role === 'venue_admin') {
    navigation.push({ name: 'Staff', href: ROUTES.STAFF, icon: UsersIcon });
  }

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialized && !isAuthenticated && pathname !== ROUTES.LOGIN) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, isInitialized, pathname, router]);

  if (pathname === ROUTES.LOGIN) {
    return children;
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = user?.role === 'admin' ? adminNavigation : navigation;

  const handleSignOut = () => {
    logout();
    router.replace(ROUTES.LOGIN);
  };

  const getInitials = () => {
    if (user?.first_name || user?.last_name) {
      return [user.first_name, user.last_name]
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() ?? '?';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 bottom-0 z-50 w-56 bg-slate-900 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar navigation"
      >
        {/* Logo / Brand */}
        <div className="flex items-center space-x-2.5 px-4 h-16 border-b border-slate-700 shrink-0">
          <VFLogo size={32} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight">VFetch</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-tight">Venue Portal</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto lg:hidden p-1 rounded text-slate-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation menu */}
        <div className="px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom section */}
        <div className="shrink-0 px-3 pb-4 space-y-0.5 border-t border-slate-700 pt-3">
          {/* Report New Item CTA */}
          <Link
            href="/items/add"
            onClick={() => setMobileOpen(false)}
            className="w-full bg-white text-slate-900 text-center py-2.5 px-4 rounded-md text-sm font-medium hover:bg-slate-100 transition-colors flex items-center justify-center mb-3"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Report New Item
          </Link>
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
          >
            <CogIcon className="mr-3 h-4 w-4" />
            Settings
          </button>
          <Link
            href={ROUTES.SUPPORT}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === ROUTES.SUPPORT
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <QuestionMarkCircleIcon className="mr-3 h-4 w-4" />
            Support
          </Link>
        </div>
      </nav>

      {/* Right side: header + content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shrink-0">
          <div className="flex items-center h-16 px-4 lg:px-6 gap-4">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:bg-gray-100"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            {/* Page title */}
            <div className="flex-1 min-w-0">
              <span className="text-base font-semibold text-gray-900 hidden sm:block whitespace-nowrap">{venue?.name}</span>
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-2 shrink-0">
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Notifications">
                <BellIcon className="h-5 w-5" />
              </button>

              {/* User avatar / menu */}
              <div className="relative" ref={venueMenuRef}>
                <button
                  type="button"
                  onClick={() => setVenueMenuOpen(o => !o)}
                  className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                  aria-label="User menu"
                  aria-expanded={venueMenuOpen}
                  aria-haspopup="menu"
                >
                  {getInitials()}
                </button>
                {venueMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {user && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        {(user.first_name || user.last_name) && (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        {venue?.name && <p className="text-xs text-slate-900 truncate mt-0.5">{venue.name}</p>}
                      </div>
                    )}
                    <Link
                      href={ROUTES.PROFILE}
                      onClick={() => setVenueMenuOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserCircleIcon className="h-4 w-4 mr-2 text-gray-400" />
                      Profile
                    </Link>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { setVenueMenuOpen(false); handleSignOut(); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <ArrowLeftStartOnRectangleIcon className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}