'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { cardStyles } from '@/utils/styles';
import { Venue } from '@/types';

export default function AddVenuePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
        type: 'other',
        status: 'approved',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev: Partial<Venue>) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.venues.adminCreate(formData);
            if (res.success && res.data) {
                router.push(`/admin/venues/${res.data.id}`);
            } else {
                setError('Failed to create venue');
            }
        } catch (err) {
            const error = err as { message?: string; data?: { details?: { msg: string }[] } };
            let errorMsg = error.message || 'An error occurred';
            if (error.data && error.data.details && Array.isArray(error.data.details)) {
                errorMsg += ': ' + error.data.details.map((d) => d.msg).join(', ');
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Add New Venue</h1>
                    <p className="text-slate-600 mt-1">Create a new venue natively in the admin portal.</p>
                </div>

                <div className={`${cardStyles} p-6`}>
                    {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Venue Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                >
                                    <option value="bar">Bar</option>
                                    <option value="club">Club</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="hotel">Hotel</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                >
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Address</label>
                            <input
                                type="text"
                                name="address"
                                required
                                value={formData.address}
                                onChange={handleChange}
                                className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    required
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Postal Code</label>
                                <input
                                    type="text"
                                    name="postal_code"
                                    value={formData.postal_code || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-vfetch-600 hover:bg-vfetch-700 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Venue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
