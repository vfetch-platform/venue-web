'use client';

import Layout from '@/components/Layout';
import { MONTH_NAMES, COLLECTED_STATUSES } from '@/constants/items';
import { DASHBOARD_FETCH_LIMIT } from '@/constants/config';
import { useAuthStore } from '@/store/auth';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  UserGroupIcon,
  EyeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '@/utils/styles';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/services/api';
import { Item, Claim } from '@/types';

// ── Types ────────────────────────────────────────────────────────────
interface MonthlyTrend {
  month: string;
  found: number;
  claimed: number;
  collected: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface RecentActivity {
  action: string;
  item: string;
  time: string;
}

interface DashboardData {
  totalItems: number;
  availableItems: number;
  claimedItems: number;
  collectedItems: number;
  expiredItems: number;
  monthlyTrends: MonthlyTrend[];
  categoryBreakdown: CategoryBreakdown[];
  recentActivity: RecentActivity[];
  avgDaysToClaim: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}


function buildDashboardData(items: Item[], claims: Claim[]): DashboardData {
  // ── Stat counts (single pass) ────────────────────────────────────────
  const totalItems = items.length;
  let availableItems = 0, claimedItems = 0, collectedItems = 0, expiredItems = 0;
  for (const i of items) {
    if (i.status === 'available') availableItems++;
    else if (i.status === 'claimed') claimedItems++;
    else if (COLLECTED_STATUSES.has(i.status)) collectedItems++;
    else if (i.status === 'expired') expiredItems++;
  }

  // ── Monthly trends (last 6 months) ─────────────────────────────────
  const now = new Date();
  const monthlyTrends: MonthlyTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = MONTH_NAMES[month];

    const found = items.filter(it => {
      const dt = new Date(it.created_at);
      return dt.getFullYear() === year && dt.getMonth() === month;
    }).length;

    const claimed = claims.filter(cl => {
      const dt = new Date(cl.created_at);
      return dt.getFullYear() === year && dt.getMonth() === month;
    }).length;

    const collected = claims.filter(cl => {
      if (cl.status !== 'collected' || !cl.collected_at) return false;
      const dt = new Date(cl.collected_at);
      return dt.getFullYear() === year && dt.getMonth() === month;
    }).length;

    monthlyTrends.push({ month: label, found, claimed, collected });
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

  // ── Recent activity (last 10 events) ────────────────────────────────
  type Activity = { action: string; item: string; time: string; sortDate: number };
  const activities: Activity[] = [];

  items.forEach(it => {
    activities.push({
      action: 'Item Added',
      item: it.title,
      time: it.created_at,
      sortDate: new Date(it.created_at).getTime(),
    });
  });

  claims.forEach(cl => {
    const itemName = cl.item?.title || 'Unknown Item';
    if (cl.status === 'collected' && cl.collected_at) {
      activities.push({
        action: 'Item Collected',
        item: itemName,
        time: cl.collected_at,
        sortDate: new Date(cl.collected_at).getTime(),
      });
    }
    activities.push({
      action: cl.status === 'approved' ? 'Claim Approved'
        : cl.status === 'rejected' ? 'Claim Rejected'
        : 'Item Claimed',
      item: itemName,
      time: cl.updated_at || cl.created_at,
      sortDate: new Date(cl.updated_at || cl.created_at).getTime(),
    });
  });

  activities.sort((a, b) => b.sortDate - a.sortDate);
  const recentActivity: RecentActivity[] = activities.slice(0, 10).map(a => ({
    action: a.action,
    item: a.item,
    time: timeAgo(a.time),
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
    monthlyTrends,
    categoryBreakdown,
    recentActivity,
    avgDaysToClaim,
  };
}

const StatCard = ({ title, value, icon: Icon, color = "blue" }: {
  title: string;
  value: number | string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    gray: 'text-slate-600 bg-slate-50',
  };

  return (
    <div className={`${cardStyles} p-6`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
};


const PieChart = ({ data }: { data: CategoryBreakdown[] }) => {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No items yet</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className={`w-4 h-4 rounded-full mr-3`}
              style={{ backgroundColor: `hsl(${index * 72}, 70%, 50%)` }}
            ></div>
            <span className="text-sm text-slate-700">{item.category}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">{item.count}</div>
            <div className="text-xs text-slate-500">{item.percentage}%</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MonthlyPieChart = ({ data }: { data: MonthlyTrend[] }) => {
  const [selectedMonth, setSelectedMonth] = useState(data[data.length - 1]?.month ?? '');
  const current = data.find(d => d.month === selectedMonth) || data[0];

  if (!current) {
    return <p className="text-sm text-slate-500 text-center py-8">No data available</p>;
  }

  const total = current.found + current.claimed + current.collected || 1;
  const segments = [
    { label: 'Found', value: current.found, color: '#3B82F6' },
    { label: 'Claimed', value: current.claimed, color: '#F59E0B' },
    { label: 'Collected', value: current.collected, color: '#10B981' },
  ];
  // Build gradient stops
  let cumulative = 0;
  const gradientStops = segments.map(s => {
    const start = cumulative;
    const pct = (s.value / total) * 100;
    cumulative += pct;
    return `${s.color} ${start}% ${cumulative}%`;
  }).join(', ');
  // Compute label positions
  cumulative = 0;
  const labels = segments.map(s => {
    const pct = (s.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    const mid = start + pct / 2; // degrees in 0-100 scale mapped to 360deg
    const angleDeg = (mid / 100) * 360; // CSS 0deg at top
    const angleRad = (angleDeg - 90) * (Math.PI / 180); // convert to standard
    const r = 0.38; // radial factor
    const x = 50 + r * 50 * Math.cos(angleRad);
    const y = 50 + r * 50 * Math.sin(angleRad);
    return { ...s, x, y };
  });
  const gradient = `conic-gradient(${gradientStops})`;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Monthly Breakdown</h3>
        <select
          className="text-sm md:text-base border-slate-300 rounded-md px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {data.map(d => <option key={d.month} value={d.month}>{d.month}</option>)}
        </select>
      </div>
      <div className="flex flex-col items-center space-y-6">
        <div className="relative w-72 h-72" aria-label="Monthly distribution pie chart">
          <div className="w-full h-full rounded-full shadow-inner" style={{ background: gradient }}></div>
          {/* Numeric segment labels */}
          {labels.map((l, i) => (
            <div
              key={i}
              className="absolute text-xs font-semibold text-white drop-shadow pointer-events-none"
              style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="leading-tight text-center">
                <div>{l.value}</div>
                <div className="opacity-80">{Math.round((l.value / total) * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          {segments.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-slate-700">{s.label}</span>
            </div>
          ))}
          <div className="text-xs text-slate-500 self-center">Total {total}</div>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { venue } = useAuthStore();
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const dashboardData = useMemo(() => buildDashboardData(items, claims), [items, claims]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
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
          <p className="text-slate-600 mt-1">
            Overview of {venue?.name || 'your venue'}&apos;s lost and found analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Items"
            value={dashboardData.totalItems}
            icon={ChartBarIcon}
            color="blue"
          />
          <StatCard
            title="Available"
            value={dashboardData.availableItems}
            icon={EyeIcon}
            color="green"
          />
          <StatCard
            title="Claimed"
            value={dashboardData.claimedItems}
            icon={UserGroupIcon}
            color="yellow"
          />
          <StatCard
            title="Collected"
            value={dashboardData.collectedItems}
            icon={ArrowTrendingUpIcon}
            color="blue"
          />
          <StatCard
            title="Expired"
            value={dashboardData.expiredItems}
            icon={ClockIcon}
            color="red"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Monthly Pie Chart */}
          <div className={`${cardStyles} p-6`}>
            <MonthlyPieChart data={dashboardData.monthlyTrends} />
          </div>

            {/* Category Breakdown (narrow) */}
          <div className={`${cardStyles} p-6`}> 
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900">Items by Category</h3>
              <ChartBarIcon className="h-5 w-5 text-slate-400" />
            </div>
            <PieChart data={dashboardData.categoryBreakdown} />
          </div>

          {/* Metrics stacked vertically */}
          <div className="flex flex-col gap-4">
            <div className={`${cardStyles} p-6 text-center flex-1`}> 
              <div className="text-3xl font-bold text-blue-600">
                {dashboardData.totalItems > 0
                  ? Math.round((dashboardData.collectedItems / dashboardData.totalItems) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600 mt-1">Collection Rate</div>
              <div className="text-xs text-slate-500 mt-1">Items successfully returned to owners</div>
            </div>
            <div className={`${cardStyles} p-6 text-center flex-1`}> 
              <div className="text-3xl font-bold text-green-600">
                {dashboardData.totalItems > 0
                  ? Math.round((dashboardData.claimedItems / dashboardData.totalItems) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600 mt-1">Claim Rate</div>
              <div className="text-xs text-slate-500 mt-1">Items with active claims</div>
            </div>
            <div className={`${cardStyles} p-6 text-center flex-1`}> 
              <div className="text-3xl font-bold text-yellow-600">{dashboardData.avgDaysToClaim || '\u2014'}</div>
              <div className="text-sm text-slate-600 mt-1">Avg. Days to Claim</div>
              <div className="text-xs text-slate-500 mt-1">Time between found and claimed</div>
            </div>
          </div>
        </div>

        {/* Recent Activity (now below metrics) */}
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
            <CalendarIcon className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {dashboardData.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
            ) : (
              dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{activity.action}</span>
                    <span className="text-sm text-slate-600 ml-2">- {activity.item}</span>
                  </div>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}