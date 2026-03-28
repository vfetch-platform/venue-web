'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { BuildingOfficeIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { cardStyles } from '@/utils/styles';
import { api } from '@/services/api';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.venues.adminGetStats();
                if (response.success && response.data) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
    }, []);

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <p className="text-slate-600 mt-1">Platform-wide overview and management</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className={`${cardStyles} p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow`}>
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Venues</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                        <div className={`p-3 rounded-md text-blue-600 bg-blue-50`}>
                            <BuildingOfficeIcon className="h-6 w-6" />
                        </div>
                    </div>

                    <div className={`${cardStyles} p-6 flex items-center justify-between`}>
                        <div>
                            <p className="text-sm font-medium text-slate-600">Pending Approvals</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                        </div>
                        <div className={`p-3 rounded-md text-yellow-600 bg-yellow-50`}>
                            <BuildingOfficeIcon className="h-6 w-6" />
                        </div>
                    </div>

                    <div className={`${cardStyles} p-6 flex flex-col justify-center`}>
                        <Link
                            href="/admin/venues"
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-vfetch-600 hover:bg-vfetch-700"
                        >
                            <UserGroupIcon className="h-5 w-5 mr-2" />
                            Manage Venues
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
