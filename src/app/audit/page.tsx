'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { cardStyles, inputStyles } from '@/utils/styles';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_type: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-orange-100 text-orange-800',
  cancel: 'bg-gray-100 text-gray-800',
  confirm_pickup: 'bg-purple-100 text-purple-800',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (entityTypeFilter && entityIdFilter) {
        response = await api.audit.getByEntity(entityTypeFilter, entityIdFilter);
      } else {
        response = await api.audit.getAll();
      }
      if (response.success && response.data) {
        setEntries(response.data);
      }
    } catch (err) {
      console.error('Error loading audit log:', err);
      setError('Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadEntries();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-slate-600 mt-1 text-sm">Track all changes to items and claims</p>
        </div>

        {/* Filters */}
        <div className="px-6">
          <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className={inputStyles}
              >
                <option value="">All</option>
                <option value="item">Items</option>
                <option value="claim">Claims</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity ID</label>
              <input
                type="text"
                value={entityIdFilter}
                onChange={(e) => setEntityIdFilter(e.target.value)}
                placeholder="Filter by entity ID"
                className={inputStyles}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              Filter
            </button>
            {(entityTypeFilter || entityIdFilter) && (
              <button
                type="button"
                onClick={() => { setEntityTypeFilter(''); setEntityIdFilter(''); setTimeout(loadEntries, 0); }}
                className="text-sm text-slate-500 hover:underline"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Table */}
        <div className="px-6 pb-6">
          <div className={cardStyles}>
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
                <p className="mt-2 text-slate-500 text-sm">Loading audit log...</p>
              </div>
            )}

            {!isLoading && entries.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">
                No audit log entries found.
              </div>
            )}

            {!isLoading && entries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${ACTION_COLORS[entry.action] || 'bg-slate-100 text-slate-700'}`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          <span className="font-medium capitalize">{entry.entity_type}</span>
                          <span className="ml-1 text-slate-400 font-mono text-xs">{entry.entity_id.slice(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          <span className="font-mono text-xs">{entry.actor_id.slice(0, 8)}...</span>
                          <span className="ml-1 text-slate-400 text-xs">({entry.actor_type})</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                          {entry.changes ? JSON.stringify(entry.changes) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
