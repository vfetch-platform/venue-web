'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth';
import { User } from '@/types';
import { api } from '@/services/api';
import Link from 'next/link';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { inputStyles } from '@/utils/styles';

// ── Edit Modal ──────────────────────────────────────────────────────
interface EditStaffModalProps {
  member: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: User) => void;
  isLoading: boolean;
}

const EditStaffModal = ({ member, isOpen, onClose, onSave, isLoading }: EditStaffModalProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: 'venue_staff',
    phoneNumber: '',
    isActive: true,
  });

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.first_name,
        lastName: member.last_name,
        role: member.role || 'venue_staff',
        phoneNumber: member.phone_number || '',
        isActive: member.is_active !== false,
      });
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...member,
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: formData.role as 'venue_staff' | 'venue_admin',
      phone_number: formData.phoneNumber,
      is_active: formData.isActive,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-xl bg-white p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-slate-900 mb-4">Edit Staff Member</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  className={inputStyles}
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  className={inputStyles}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                className={inputStyles}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                className={inputStyles}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="venue_staff">Staff</option>
                <option value="venue_admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                className="h-4 w-4 text-slate-900 focus:ring-slate-500 border-slate-300 rounded"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-slate-700">
                Active Account
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

// ── Page ─────────────────────────────────────────────────────────────
export default function StaffPage() {
  const router = useRouter();
  const { user, venue, isInitialized, isAuthenticated } = useAuthStore();
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state (replaces window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated && user?.role !== 'venue_admin') {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isInitialized, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    if (user?.role !== 'venue_admin') return;

    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const venueId = venue?.id || user?.venue_id;
        if (!venueId) {
          setError('No venue associated with this account');
          return;
        }
        const response = await api.venues.getStaff(venueId);
        if (response.success && response.data) {
          setStaff(response.data);
        } else {
          setError('Failed to load staff');
        }
      } catch (err) {
        setError((err as { message?: string }).message || 'An error occurred fetching staff');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [isInitialized, isAuthenticated, user, venue]);

  const handleEdit = (member: User) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (updatedMember: User) => {
    setIsUpdating(true);
    try {
      const venueId = venue?.id || user?.venue_id;
      if (!venueId) return;

      const response = await api.venues.updateStaff(venueId, updatedMember.id, {
        first_name: updatedMember.first_name,
        last_name: updatedMember.last_name,
        phone_number: updatedMember.phone_number,
        role: updatedMember.role,
        is_active: updatedMember.is_active,
      });

      if (response.success && response.data) {
        setStaff(staff.map((s) => (s.id === updatedMember.id ? { ...s, ...response.data } : s)));
        setIsEditModalOpen(false);
        setEditingMember(null);
      }
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const venueId = venue?.id || user?.venue_id;
      if (!venueId) return;
      await api.venues.deleteStaff(venueId, deleteTarget.id);
      setStaff(staff.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to delete user');
      setDeleteTarget(null);
    }
  };

  const getInitials = (member: User) => {
    return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase() || '?';
  };

  const getRoleBadge = (role: string) => {
    if (role === 'venue_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
          <ShieldCheckIcon className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-600">
        <UserIcon className="w-3 h-3" />
        Staff
      </span>
    );
  };

  if (!isInitialized || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <span className="ml-3 text-slate-500">Loading staff...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center">
              <UserGroupIcon className="h-6 w-6 sm:h-7 sm:w-7 mr-2 text-slate-500 shrink-0" />
              Staff Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm">{staff.length} member{staff.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/staff/add"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Add Staff
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {staff.map((member) => (
              <li key={member.id} className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                  {getInitials(member)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{member.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 text-xs leading-5 font-semibold rounded-full ${member.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {member.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                    {getRoleBadge(member.role)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(member)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Edit">
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  {user?.id !== member.id && (
                    <button onClick={() => setDeleteTarget(member)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="py-6 text-center text-slate-500 text-sm">No staff members found.</li>
            )}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                          {getInitials(member)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{member.first_name} {member.last_name}</div>
                          <div className="text-sm text-slate-500">{member.phone_number || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(member)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Edit">
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        {user?.id !== member.id && (
                          <button onClick={() => setDeleteTarget(member)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No staff members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditStaffModal
        isOpen={isEditModalOpen}
        member={editingMember}
        onClose={() => { setIsEditModalOpen(false); setEditingMember(null); }}
        onSave={handleUpdate}
        isLoading={isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm w-full rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Remove Staff Member
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to remove <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Layout>
  );
}
