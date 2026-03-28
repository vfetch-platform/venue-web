'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { Venue } from '@/types';
import Link from 'next/link';
import { cardStyles } from '@/utils/styles';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function AdminVenuesPage() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchVenues();
    }, []);

    const fetchVenues = async () => {
        try {
            const res = await api.venues.adminGetAll({ limit: 50 });
            if (res.success && res.data) {
                setVenues(res.data.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch venues');
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        suspended: 'bg-gray-100 text-gray-800',
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Manage Venues</h1>
                        <p className="text-slate-600 mt-1">View and manage all platform venues</p>
                    </div>
                    <Link
                        href="/admin/venues/new"
                        className="flex items-center px-4 py-2 bg-vfetch-600 text-white rounded-md hover:bg-vfetch-700"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Venue
                    </Link>
                </div>

                <div className={`${cardStyles} overflow-hidden`}>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading venues...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500">{error}</div>
                    ) : venues.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No venues found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {venues.map((venue) => (
                                        <tr key={venue.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {venue.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {venue.city}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                                                {venue.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[venue.status] || 'bg-gray-100 text-gray-800'} capitalize`}>
                                                    {venue.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link href={`/admin/venues/${venue.id}`} className="text-vfetch-600 hover:text-vfetch-900">
                                                    Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
