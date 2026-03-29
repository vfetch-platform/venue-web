'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth';
import { User } from '@/types';
import { api } from '@/services/api';
import Link from 'next/link';
import { PlusIcon, ShieldCheckIcon, UserGroupIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

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
    isActive: true, // Default to true or active
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Staff Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active Account
            </label>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function StaffPage() {
  const router = useRouter();
  const { user, venue, isInitialized, isAuthenticated } = useAuthStore();
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      const venueId = venue?.id || user?.venue_id;
      if (!venueId) return;

      await api.venues.deleteStaff(venueId, userId);
      setStaff(staff.filter((s) => s.id !== userId));
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to delete user');
    }
  };

  if (!isInitialized || isLoading) {
      return (
          <Layout>
              <div className="flex items-center justify-center p-12">
                  <div className="text-gray-500">Loading staff...</div>
              </div>
          </Layout>
      );
  }

  return (
    <Layout>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserGroupIcon className="h-8 w-8 mr-3 text-gray-500" />
            Staff Management
          </h1>
          <Link
            href="/staff/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Staff Member
          </Link>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.phone_number || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                        {member.role === 'venue_admin' && <ShieldCheckIcon className="w-4 h-4 mr-1 text-indigo-500"/>}
                        <span className="capitalize">{member.role.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {user?.id !== member.id && (
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && !isLoading && (
                  <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No staff members found.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isEditModalOpen && (
        <EditStaffModal
          isOpen={isEditModalOpen}
          member={editingMember}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdate}
          isLoading={isUpdating}
        />
      )}
    </Layout>
  );
}
