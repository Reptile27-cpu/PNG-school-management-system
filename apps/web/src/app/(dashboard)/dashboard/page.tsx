'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarCheck,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// Metric card component
function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <button className="p-1 rounded-lg hover:bg-[var(--bg-secondary)]">
          <MoreHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold">{value}</p>
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
          {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span>{change}</span>
          <span className="text-[var(--text-muted)]">{changeLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Activity item component
function ActivityItem({ time, title, description, type }: {
  time: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'danger';
}) {
  const colors = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${colors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <span className="text-xs text-[var(--text-muted)] shrink-0">{time}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-[var(--text-secondary)]">Here&apos;s what&apos;s happening today</p>
        </div>
        <div className="flex items-center gap-2">
          {['today', 'week', 'month'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Students"
          value="1,234"
          change="+12%"
          changeLabel="vs last term"
          icon={Users}
          color="bg-primary"
          trend="up"
        />
        <MetricCard
          title="Today's Attendance"
          value="94.2%"
          change="+2.1%"
          changeLabel="vs yesterday"
          icon={CalendarCheck}
          color="bg-success"
          trend="up"
        />
        <MetricCard
          title="Average GPA"
          value="3.42"
          change="-0.8%"
          changeLabel="vs last term"
          icon={BookOpen}
          color="bg-warning"
          trend="down"
        />
        <MetricCard
          title="At-Risk Students"
          value="23"
          change="+3"
          changeLabel="this week"
          icon={AlertTriangle}
          color="bg-danger"
          trend="up"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Attendance Trend</h3>
              <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-[var(--bg-primary)]">
                <option>This Term</option>
                <option>Last Term</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center bg-[var(--bg-secondary)] rounded-lg">
              <p className="text-[var(--text-muted)]">Chart will render here</p>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Grade Distribution</h3>
              <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-[var(--bg-primary)]">
                <option>Grade 10</option>
                <option>Grade 9</option>
                <option>All Grades</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center bg-[var(--bg-secondary)] rounded-lg">
              <p className="text-[var(--text-muted)]">Chart will render here</p>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="card">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="divide-y divide-border">
              <ActivityItem
                time="2 min ago"
                title="Attendance marked"
                description="Grade 10A - 38/40 present"
                type="success"
              />
              <ActivityItem
                time="15 min ago"
                title="New student registered"
                description="Alice Kumar - Grade 9A"
                type="info"
              />
              <ActivityItem
                time="1 hour ago"
                title="Low attendance alert"
                description="Charlie Namo - 73% attendance"
                type="warning"
              />
              <ActivityItem
                time="2 hours ago"
                title="Fee overdue"
                description="5 students have pending fees"
                type="danger"
              />
              <ActivityItem
                time="3 hours ago"
                title="Report card generated"
                description="Term 1 report cards for Grade 10"
                type="info"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Mark Attendance', icon: CalendarCheck },
                { label: 'Add Student', icon: Users },
                { label: 'Enter Grades', icon: BookOpen },
                { label: 'Generate Report', icon: TrendingUp },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-sm font-medium"
                >
                  <action.icon className="w-4 h-4 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
