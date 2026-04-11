'use client';

import Layout from '@/components/Layout';
import { MONTH_NAMES, COLLECTED_STATUSES } from '@/constants/items';
import { DASHBOARD_FETCH_LIMIT } from '@/constants/config';
import { useAuthStore } from '@/store/auth';
import {
  ArchiveBoxIcon,
  EyeIcon,
  HandRaisedIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '@/utils/styles';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/services/api';
import { Item, Claim, User } from '@/types';

// ── Types ────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_type: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface DashboardData {
  totalItems: number;
  availableItems: number;
  claimedItems: number;
  collectedItems: number;
  expiredItems: number;
  categoryBreakdown: CategoryBreakdown[];
  avgDaysToClaim: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
function buildDashboardData(items: Item[], claims: Claim[]): DashboardData {
  const totalItems = items.length;
  let availableItems = 0, claimedItems = 0, collectedItems = 0, expiredItems = 0;
  for (const i of items) {
    if (i.status === 'available') availableItems++;
    else if (i.status === 'claimed') claimedItems++;
    else if (COLLECTED_STATUSES.has(i.status)) collectedItems++;
    else if (i.status === 'expired') expiredItems++;
  }

  // ── Category breakdown ──────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  items.forEach(i => {
    const cat = i.category || 'other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
      percentage: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
    }));

  // ── Avg days to claim ───────────────────────────────────────────────
  let avgDaysToClaim = 0;
  const claimsWithItem = claims.filter(cl => cl.item?.date_found || cl.item?.created_at);
  if (claimsWithItem.length > 0) {
    const totalDays = claimsWithItem.reduce((sum, cl) => {
      const foundDate = new Date(cl.item!.date_found || cl.item!.created_at).getTime();
      const claimDate = new Date(cl.created_at).getTime();
      return sum + Math.max(0, (claimDate - foundDate) / 86400000);
    }, 0);
    avgDaysToClaim = Math.round((totalDays / claimsWithItem.length) * 10) / 10;
  }

  return {
    totalItems,
    availableItems,
    claimedItems,
    collectedItems,
    expiredItems,
    categoryBreakdown,
    avgDaysToClaim,
  };
}

// ── Activity helpers ────────────────────────────────────────────────

// Only show venue-staff actions (not customer claim creations etc.)
const VENUE_ACTIONS = new Set([
  'create',   // item created by staff
  'update',   // item/claim updated by staff
  'approve',
  'approved',
  'reject',
  'rejected',
  'confirm_pickup',
  'collected',
  'delete',
]);

// actor_type values that represent venue staff
const STAFF_ACTOR_TYPES = new Set(['venue_staff', 'venue_admin', 'admin', 'staff']);

function isVenueAction(entry: AuditEntry): boolean {
  // Must be a staff action
  if (!STAFF_ACTOR_TYPES.has(entry.actor_type)) return false;
  // Must be a relevant action
  if (!VENUE_ACTIONS.has(entry.action)) return false;
  return true;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface ActivityRow {
  id: string;
  description: string;
  staffName: string;
  time: string;
  timestamp: string; // ISO for CSV
  action: string;
  entityType: string;
}

function buildActivityRows(
  entries: AuditEntry[],
  itemMap: Map<string, string>,
  staffMap: Map<string, string>,
): ActivityRow[] {
  return entries.filter(isVenueAction).map(entry => {
    const staffName = staffMap.get(entry.actor_id) || 'Staff';
    const entityName = itemMap.get(entry.entity_id) || entry.entity_type;
    const entityLabel = entry.entity_type === 'item' ? 'item' : entry.entity_type;

    let description: string;
    switch (entry.action) {
      case 'create':
        description = `Added ${entityLabel} "${entityName}"`;
        break;
      case 'update':
        description = `Updated ${entityLabel} "${entityName}"`;
        break;
      case 'approve':
      case 'approved':
        description = `Approved claim for "${entityName}"`;
        break;
      case 'reject':
      case 'rejected':
        description = `Rejected claim for "${entityName}"`;
        break;
      case 'confirm_pickup':
      case 'collected':
        description = `Marked "${entityName}" as collected`;
        break;
      case 'delete':
        description = `Removed ${entityLabel} "${entityName}"`;
        break;
      default:
        description = `${entry.action} ${entityLabel} "${entityName}"`;
    }

    return {
      id: entry.id,
      description,
      staffName,
      time: timeAgo(entry.created_at),
      timestamp: entry.created_at,
      action: entry.action,
      entityType: entry.entity_type,
    };
  });
}

function downloadActivityCSV(rows: ActivityRow[]) {
  const headers = ['Timestamp', 'Staff', 'Activity'];
  const csvRows = rows.map(r => [
    new Date(r.timestamp).toISOString(),
    `"${r.staffName}"`,
    `"${r.description.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Stat Card ────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color }: {
  title: string;
  value: number | string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    slate: 'text-slate-600 bg-slate-100',
  };

  return (
    <div className={`${cardStyles} p-4 sm:p-5`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-2.5 rounded-lg ${colorMap[color] || colorMap.slate}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="ml-3 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

// ── Status Pie Chart ─────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Available: '#22c55e',
  Claimed: '#eab308',
  Collected: '#3b82f6',
  Expired: '#ef4444',
};

const StatusPieChart = ({ items }: { items: Item[] }) => {
  // Build month options from items (last 6 months + "All Time")
  const now = new Date();
  const monthOptions: { label: string; value: string }[] = [{ label: 'All Time', value: '' }];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    monthOptions.push({ label, value: key });
  }

  const [selectedMonth, setSelectedMonth] = useState('');

  // Filter items by selected month
  const filtered = selectedMonth
    ? items.filter(item => {
        const d = new Date(item.created_at);
        return `${d.getFullYear()}-${d.getMonth()}` === selectedMonth;
      })
    : items;

  // Count statuses
  let available = 0, claimed = 0, collected = 0, expired = 0;
  for (const i of filtered) {
    if (i.status === 'available') available++;
    else if (i.status === 'claimed') claimed++;
    else if (COLLECTED_STATUSES.has(i.status)) collected++;
    else if (i.status === 'expired') expired++;
  }

  const segments = [
    { label: 'Available', value: available },
    { label: 'Claimed', value: claimed },
    { label: 'Collected', value: collected },
    { label: 'Expired', value: expired },
  ].filter(s => s.value > 0);

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  // Build conic gradient
  let cumulative = 0;
  const gradientStops = segments.map(s => {
    const start = cumulative;
    const pct = (s.value / total) * 100;
    cumulative += pct;
    const color = STATUS_COLORS[s.label] || '#94a3b8';
    return `${color} ${start}% ${cumulative}%`;
  }).join(', ');

  // Compute label positions
  cumulative = 0;
  const labels = segments.map(s => {
    const pct = (s.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    const mid = start + pct / 2;
    const angleDeg = (mid / 100) * 360;
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    const r = 0.36;
    const x = 50 + r * 50 * Math.cos(angleRad);
    const y = 50 + r * 50 * Math.sin(angleRad);
    return { ...s, x, y, pct };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Items by Status</h3>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-slate-500 focus:border-slate-500"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No items {selectedMonth ? 'for this month' : 'yet'}</p>
      ) : (
        <div className="flex flex-col items-center space-y-5">
          {/* Pie */}
          <div className="relative w-full max-w-[16rem] aspect-square mx-auto" aria-label="Status distribution pie chart">
            <div className="w-full h-full rounded-full shadow-inner" style={{ background: `conic-gradient(${gradientStops})` }} />
            {/* Center hole for donut effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[45%] h-[45%] rounded-full bg-white shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{total}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</div>
                </div>
              </div>
            </div>
            {/* Segment labels (only for segments > 8%) */}
            {labels.filter(l => l.pct > 8).map((l, i) => (
              <div
                key={i}
                className="absolute text-xs font-semibold text-white drop-shadow pointer-events-none"
                style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="leading-tight text-center">
                  <div>{l.value}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {segments.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.label] }} />
                <span className="text-slate-600">{s.label}</span>
                <span className="text-slate-400 text-xs">({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Category Breakdown ───────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1',
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff',
];

const CategoryBreakdownChart = ({ data }: { data: CategoryBreakdown[] }) => {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No items yet</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-700">{item.category}</span>
            <span className="text-sm font-medium text-slate-900">{item.count} <span className="text-slate-400 text-xs">({item.percentage}%)</span></span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${item.percentage}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Recent Activity Section ─────────────────────────────────────────
const DATE_FILTER_OPTIONS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'All time', value: '' },
];

const RecentActivitySection = ({
  entries,
  items,
  claims,
  staffMap,
  isLoading,
}: {
  entries: AuditEntry[];
  items: Item[];
  claims: Claim[];
  staffMap: Map<string, string>;
  isLoading: boolean;
}) => {
  const [dateFilter, setDateFilter] = useState('7');

  // Build entity_id → human name lookup from items + claims
  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => map.set(i.id, i.title));
    claims.forEach(cl => {
      if (cl.item?.title) {
        map.set(cl.id, cl.item.title);       // claim id → item title
        map.set(cl.item_id, cl.item.title);   // item id → item title
      }
    });
    return map;
  }, [items, claims]);

  const rows = useMemo(() => {
    let list = buildActivityRows(entries, itemMap, staffMap);
    if (dateFilter) {
      const days = parseInt(dateFilter, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(r => new Date(r.timestamp) >= cutoff);
    }
    return list;
  }, [entries, itemMap, staffMap, dateFilter]);

  return (
    <div className={`${cardStyles} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-slate-500 focus:border-slate-500"
          >
            {DATE_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => downloadActivityCSV(rows)}
            disabled={rows.length === 0}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          <span className="ml-2 text-sm text-slate-500">Loading activity...</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No activity {dateFilter ? 'in this period' : 'yet'}</p>
      ) : (
        <div className="space-y-0">
          {rows.slice(0, 20).map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm text-slate-900">
                  <span className="font-medium">{row.staffName}</span>
                  <span className="text-slate-500 ml-1">{row.description.charAt(0).toLowerCase() + row.description.slice(1)}</span>
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 pt-0.5">{row.time}</span>
            </div>
          ))}
          {rows.length > 20 && (
            <p className="text-xs text-slate-400 text-center pt-3">
              Showing 20 of {rows.length} entries. Export CSV for the full list.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { venue, user } = useAuthStore();
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'venue_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!venue?.id) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [itemsRes, claimsRes] = await Promise.all([
          api.items.getByVenue(venue!.id, { limit: DASHBOARD_FETCH_LIMIT }),
          api.claims.getByVenue(venue!.id, { limit: DASHBOARD_FETCH_LIMIT }),
        ]);

        if (cancelled) return;

        setItems(itemsRes.data?.data ?? []);
        setClaims(claimsRes.data?.data ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
        console.error('Dashboard fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id]);

  // Fetch audit entries + staff names for Recent Activity (admin only)
  useEffect(() => {
    if (!isAdmin || !venue?.id) { setAuditLoading(false); return; }

    let cancelled = false;
    async function fetchAuditAndStaff() {
      setAuditLoading(true);
      try {
        const [auditRes, staffRes] = await Promise.all([
          api.audit.getAll(200),
          api.venues.getStaff(venue!.id),
        ]);
        if (cancelled) return;

        if (auditRes.success && auditRes.data) {
          setAuditEntries(auditRes.data as unknown as AuditEntry[]);
        }
        if (staffRes.success && staffRes.data) {
          const map = new Map<string, string>();
          (staffRes.data as unknown as User[]).forEach(s => {
            const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
            map.set(s.id, name);
          });
          // Also add current user in case they're not in staff list
          if (user) {
            const myName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
            map.set(user.id, myName);
          }
          setStaffMap(map);
        }
      } catch {
        // non-critical, activity section will show empty
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    }
    fetchAuditAndStaff();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, venue?.id]);

  const dashboardData = useMemo(() => buildDashboardData(items, claims), [items, claims]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="ml-3 text-slate-600">Loading dashboard&hellip;</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 transition"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of {venue?.name || 'your venue'}&apos;s lost and found analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total Items" value={dashboardData.totalItems} icon={ArchiveBoxIcon} color="slate" />
          <StatCard title="Available" value={dashboardData.availableItems} icon={EyeIcon} color="green" />
          <StatCard title="Claimed" value={dashboardData.claimedItems} icon={HandRaisedIcon} color="yellow" />
          <StatCard title="Collected" value={dashboardData.collectedItems} icon={ArrowTrendingUpIcon} color="blue" />
          <StatCard title="Expired" value={dashboardData.expiredItems} icon={ClockIcon} color="red" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Status Pie Chart (donut) */}
          <div className={`${cardStyles} p-6`}>
            <StatusPieChart items={items} />
          </div>

          {/* Category Breakdown (bar chart) */}
          <div className={`${cardStyles} p-6`}>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Items by Category</h3>
            <CategoryBreakdownChart data={dashboardData.categoryBreakdown} />
          </div>

          {/* Key Metrics */}
          <div className="flex flex-col gap-4">
            <div className={`${cardStyles} p-6 text-center flex-1`}>
              <div className="text-3xl font-bold text-blue-600">
                {dashboardData.totalItems > 0
                  ? Math.round((dashboardData.collectedItems / dashboardData.totalItems) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600 mt-1">Collection Rate</div>
              <div className="text-xs text-slate-400 mt-1">Items successfully returned</div>
            </div>
            <div className={`${cardStyles} p-6 text-center flex-1`}>
              <div className="text-3xl font-bold text-yellow-600">
                {dashboardData.totalItems > 0
                  ? Math.round((dashboardData.claimedItems / dashboardData.totalItems) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600 mt-1">Claim Rate</div>
              <div className="text-xs text-slate-400 mt-1">Items with active claims</div>
            </div>
            <div className={`${cardStyles} p-6 text-center flex-1`}>
              <div className="text-3xl font-bold text-slate-700">{dashboardData.avgDaysToClaim || '\u2014'}</div>
              <div className="text-sm text-slate-600 mt-1">Avg. Days to Claim</div>
              <div className="text-xs text-slate-400 mt-1">Time between found and claimed</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {isAdmin && (
          <RecentActivitySection
            entries={auditEntries}
            items={items}
            claims={claims}
            staffMap={staffMap}
            isLoading={auditLoading}
          />
        )}
      </div>
    </Layout>
  );
}
