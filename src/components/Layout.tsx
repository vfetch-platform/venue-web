'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { ROUTES } from '@/constants/routes';
import { useState, useEffect } from 'react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  UsersIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const baseNavigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: ChartBarIcon },
  { name: 'Items', href: ROUTES.ITEMS, icon: HomeIcon },
  { name: 'Claims', href: ROUTES.CLAIMS, icon: ClipboardDocumentListIcon },
  { name: 'Audit Log', href: ROUTES.AUDIT, icon: DocumentTextIcon },
  { name: 'Profile', href: ROUTES.PROFILE, icon: UserCircleIcon },
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

  const navigation = [...baseNavigation];
  if (user?.role === 'venue_admin') {
    // Insert Staff link before Profile
    const profileIndex = navigation.findIndex(n => n.name === 'Profile');
    if (profileIndex !== -1) {
      navigation.splice(profileIndex, 0, { name: 'Staff', href: ROUTES.STAFF, icon: UsersIcon });
    } else {
      navigation.push({ name: 'Staff', href: ROUTES.STAFF, icon: UsersIcon });
    }
  }

  // Check auth on app initialization
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login when unauthenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated && pathname !== ROUTES.LOGIN) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, isInitialized, pathname, router]);

  if (pathname === ROUTES.LOGIN) {
    return children;
  }

  // Show loading while checking authentication
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vfetch-600 mx-auto"></div>
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
    if (venue?.name) {
      return venue.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'JD';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="flex justify-between items-center h-16 px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:bg-slate-800"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-white">VFetch Venue Portal</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:block text-sm text-slate-300">
              {venue?.name}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-slate-900 text-sm font-medium">{getInitials()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

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
        className={`fixed left-0 top-16 bottom-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:flex lg:flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile only header inside drawer */}
        <div className="flex items-center justify-between lg:hidden px-4 h-16 border-b border-slate-200">
          <span className="font-semibold text-slate-900">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* New delivery button */}
        <div className="p-4">
          <Link
            href="/items/add"
            onClick={() => setMobileOpen(false)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-center py-3 px-4 rounded-md font-medium hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Item
          </Link>
        </div>

        {/* Navigation menu */}
        <div className="flex-1 overflow-y-auto px-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer links */}
        <div className="border-t border-slate-200 p-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors border border-slate-300"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main content area */}
      <div className="lg:ml-64">
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}