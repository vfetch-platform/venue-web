'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Venue, User } from '@/types';
import { cardStyles } from '@/utils/styles';
import { use } from 'react';

export default function ManageVenuePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [venue, setVenue] = useState<Venue | null>(null);
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit venue state
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Venue>>({});

    // Add Staff state
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'venue_staff',
    });

    const fetchVenueData = useCallback(async () => {
        setLoading(true);
        try {
            const [venueRes, staffRes] = await Promise.all([
                api.venues.adminGetById(id),
                api.venues.getStaff(id),
            ]);

            if (venueRes.success && venueRes.data) {
                setVenue(venueRes.data);
                setFormData(venueRes.data);
            }
            if (staffRes.success && staffRes.data) {
                setStaff(staffRes.data as unknown as User[]);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch venue details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchVenueData();
    }, [fetchVenueData]);

    const handleVenueUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.venues.update(id, formData as Partial<Venue>);
            if (res.success && res.data) {
                setVenue(res.data);
                setEditMode(false);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update venue');
        }
    };

    const handleStatusChange = async (status: string) => {
        try {
            const res = await api.venues.adminUpdateStatus(id, status);
            if (res.success && res.data) {
                setVenue(res.data);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleDeleteVenue = async () => {
        if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) return;
        try {
            await api.venues.adminDelete(id);
            router.push('/admin/venues');
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete venue. (Cannot delete if there are items or staff)');
        }
    };

    // Staff Management
    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...staffForm, venue_id: id };
            const res = await api.venues.createStaff(id, payload);
            if (res.success) {
                setStaffForm({ firstName: '', lastName: '', email: '', password: '', role: 'venue_staff' });
                setShowAddStaff(false);
                fetchVenueData(); // Refresh staff
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to add staff');
        }
    };

    const handleDeleteStaff = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this staff app user?')) return;
        try {
            await api.auth.adminDeleteUser(userId);
            setStaff(staff.filter(s => s.id !== userId));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to remove staff');
        }
    };

    if (loading) {
        return <Layout><div className="p-8 text-center text-slate-500">Loading venue details...</div></Layout>;
    }

    if (error || !venue) {
        return <Layout><div className="p-8 text-center text-red-500">{error || 'Venue not found'}</div></Layout>;
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Options */}
                <div className="flex justify-between items-start bg-white p-6 rounded-lg shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{venue.name}</h1>
                        <p className="text-slate-600 mt-1">{venue.city} &middot; {venue.type}</p>
                        <div className="mt-2 flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-500">Current Status:</span>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 uppercase">{venue.status}</span>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <select
                            value={venue.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="text-center border-slate-300 rounded-md text-sm cursor-pointer hover:border-slate-400"
                        >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="suspended">Suspended</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-medium"
                        >
                            {editMode ? 'Cancel Edit' : 'Edit Info'}
                        </button>
                        <button
                            onClick={handleDeleteVenue}
                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Info Card */}
                    <div className={`${cardStyles} p-6`}>
                        <h2 className="text-lg font-medium text-slate-900 mb-4">Venue Details</h2>
                        {editMode ? (
                            <form onSubmit={handleVenueUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Name</label>
                                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Address</label>
                                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">City</label>
                                        <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Postal Code</label>
                                        <input type="text" value={formData.postal_code || ''} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                                    <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email</label>
                                    <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 sm:text-sm" />
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full bg-vfetch-600 text-white py-2 rounded-md hover:bg-vfetch-700">Save Changes</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-3 text-sm">
                                <p><span className="font-medium text-slate-500">Address:</span> {venue.address}</p>
                                <p><span className="font-medium text-slate-500">City:</span> {venue.city} {venue.postal_code}</p>
                                <p><span className="font-medium text-slate-500">Phone:</span> {venue.phone}</p>
                                <p><span className="font-medium text-slate-500">Email:</span> {venue.email}</p>
                                <p><span className="font-medium text-slate-500">Created At:</span> {new Date(venue.created_at).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>

                    {/* Staff Card */}
                    <div className={`${cardStyles} p-6 flex flex-col`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-slate-900">Venue Users</h2>
                            <button
                                onClick={() => setShowAddStaff(!showAddStaff)}
                                className="text-sm text-vfetch-600 hover:text-vfetch-800 font-medium"
                            >
                                {showAddStaff ? 'Cancel' : '+ Add User'}
                            </button>
                        </div>

                        {showAddStaff && (
                            <form onSubmit={handleAddStaff} className="mb-6 p-4 bg-slate-50 rounded-md space-y-3 border border-slate-200">
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="First Name" required value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })} className="block w-full rounded-md border-slate-300 text-sm" />
                                    <input type="text" placeholder="Last Name" required value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })} className="block w-full rounded-md border-slate-300 text-sm" />
                                </div>
                                <input type="email" placeholder="Email" required value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="block w-full rounded-md border-slate-300 text-sm" />
                                <input type="password" placeholder="Password (min 8 chars)" required minLength={8} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className="block w-full rounded-md border-slate-300 text-sm" />
                                <select
                                    value={staffForm.role}
                                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                                    className="block w-full rounded-md border-slate-300 text-sm"
                                >
                                    <option value="venue_staff">Venue Staff</option>
                                    <option value="venue_admin">Venue Admin</option>
                                </select>
                                <button type="submit" className="w-full bg-vfetch-600 text-white py-2 rounded-md hover:bg-vfetch-700 text-sm">Create Venue User</button>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            {staff.length === 0 ? (
                                <p className="text-sm text-slate-500">No staff members assigned to this venue yet.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {staff.map(user => (
                                        <li key={user.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{user.first_name} {user.last_name}</p>
                                                <div className="flex items-center space-x-2 mt-0.5">
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium uppercase tracking-wider">
                                                        {user.role === 'venue_admin' ? 'Admin' : 'Staff'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteStaff(user.id)}
                                                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
}
