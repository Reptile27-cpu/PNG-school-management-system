'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Users,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';

interface TrendItem {
  date: string;
  total: number;
  present: number;
  rate: number;
}

interface AnalyticsData {
  counts: {
    students: number;
    teachers: number;
    classes: number;
  };
  attendance: {
    overallRate: number;
    todayRate: number;
    totalRecords: number;
  };
  fees: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    collectionRate: number;
  };
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [statsRes, trendsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/attendance-trends', { params: { days } }),
      ]);
      setStats(statsRes.data.data);
      setTrends(trendsRes.data.data || []);
    } catch {
      setError('Unable to fetch school analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">School Analytics & Trends</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Real-time performance indicators, attendance trends, and financial metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Term Attendance</span>
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-success">
            {stats?.attendance.overallRate ?? 0}%
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Today: {stats?.attendance.todayRate ?? stats?.attendance.overallRate ?? 0}%
          </p>
        </div>

        <div className="card p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Active Enrollment</span>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3">{stats?.counts.students ?? 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Across {stats?.counts.classes ?? 0} active classes
          </p>
        </div>

        <div className="card p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Fee Collection</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3">{stats?.fees.collectionRate ?? 0}%</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            PGK {Number(stats?.fees.totalPaid ?? 0).toLocaleString()} Collected
          </p>
        </div>

        <div className="card p-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Outstanding Fees</span>
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-3 text-danger">
            PGK {Number(stats?.fees.totalOutstanding ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Pending term recovery</p>
        </div>
      </div>

      {/* Attendance Trends Chart Card */}
      <div className="card p-6 border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Daily Attendance Rate ({days} Days)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Visualizing daily classroom presence rate over the chosen reporting period.
            </p>
          </div>
          <span className="text-xs font-semibold text-success bg-success/10 px-3 py-1 rounded-full">
            Target: &gt; 90%
          </span>
        </div>

        {/* Visual Bar Graph */}
        <div className="pt-4 pb-2">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            </div>
          ) : trends.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-xs">
              No historical attendance logs found for this window.
            </div>
          ) : (
            <div className="h-56 flex items-end gap-1.5 sm:gap-2 px-2 overflow-x-auto">
              {trends.map((item, idx) => {
                const heightPct = Math.max(10, Math.min(100, item.rate));
                const isHigh = item.rate >= 90;
                const isMedium = item.rate >= 75;

                return (
                  <div key={idx} className="flex-1 min-w-[18px] flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-md">
                      {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}: {item.rate}% ({item.present}/{item.total})
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all ${
                        isHigh
                          ? 'bg-success hover:bg-success/80'
                          : isMedium
                          ? 'bg-amber-500 hover:bg-amber-500/80'
                          : 'bg-danger hover:bg-danger/80'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* Date label */}
                    <span className="text-[9px] text-[var(--text-muted)] font-mono truncate w-full text-center">
                      {new Date(item.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Financial & Academic Health Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 border border-border space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" /> Fee Collection Breakdown
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-secondary)]">Collected Fees</span>
                <span className="font-semibold text-success">{stats?.fees.collectionRate ?? 0}%</span>
              </div>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-success h-3 rounded-full transition-all"
                  style={{ width: `${stats?.fees.collectionRate ?? 0}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-border text-xs pt-2">
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Invoiced Amount</span>
                <span className="font-semibold">PGK {Number(stats?.fees.totalBilled ?? 0).toLocaleString()}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Collected</span>
                <span className="font-semibold text-success">PGK {Number(stats?.fees.totalPaid ?? 0).toLocaleString()}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-secondary)]">Outstanding Balances</span>
                <span className="font-semibold text-danger">PGK {Number(stats?.fees.totalOutstanding ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 border border-border space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Institutional Capacity
          </h3>
          <div className="divide-y divide-border text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Student to Teacher Ratio</span>
              <span className="font-bold text-sm text-primary">
                {stats?.counts.teachers ? Math.round((stats.counts.students || 0) / stats.counts.teachers) : 25} : 1
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Average Students Per Class</span>
              <span className="font-bold text-sm">
                {stats?.counts.classes ? Math.round((stats.counts.students || 0) / stats.counts.classes) : 30} students
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Attendance Reliability Index</span>
              <span className="badge badge-success font-semibold">High Standing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
