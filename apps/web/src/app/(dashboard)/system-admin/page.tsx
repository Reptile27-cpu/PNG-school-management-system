'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle2, GraduationCap, Shield, Users } from 'lucide-react';
import { api } from '@/lib/api';

type DashboardData = { totalSchools: number; activeSchools: number; totalStudents: number; totalTeachers: number; totalSchoolAdmins: number; recentSchools: { id: string; name: string; code: string; isActive: boolean }[]; recentActivity: { id: string; action: string; entityType: string | null; createdAt: string; user?: { email: string } | null }[] };

export default function SystemAdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/system-admin/dashboard').then((response) => setData(response.data.data)).catch(() => setError('System administrator access is required.')); }, []);
  const stats = data ? [['Total schools', data.totalSchools, Building2], ['Active schools', data.activeSchools, CheckCircle2], ['Students', data.totalStudents, GraduationCap], ['Teachers', data.totalTeachers, Users], ['School admins', data.totalSchoolAdmins, Shield]] as const : [];
  return <div className="space-y-6"><div><p className="text-sm text-primary font-semibold uppercase tracking-[0.15em]">System administration</p><h1 className="text-3xl font-bold mt-2">Platform overview</h1><p className="text-[var(--text-secondary)] mt-1">One view of schools, people, and recent platform activity.</p></div>{error && <div className="p-4 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>}<div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">{stats.map(([label, value, Icon]) => <div className="card" key={label}><Icon className="w-5 h-5 text-primary mb-4" /><p className="text-sm text-[var(--text-secondary)]">{label}</p><p className="text-3xl font-bold mt-1">{value}</p></div>)}</div><div className="grid xl:grid-cols-2 gap-6"><section className="card"><div className="flex justify-between items-center mb-4"><h2 className="font-semibold">Recent schools</h2><Link href="/system-admin/schools" className="text-sm text-primary font-semibold">View all</Link></div>{data?.recentSchools?.map((school) => <div key={school.id} className="flex justify-between py-3 border-b border-border last:border-0"><span><span className="font-medium">{school.name}</span><span className="block text-xs text-[var(--text-secondary)]">{school.code}</span></span><span className={school.isActive ? 'badge-success' : 'badge-danger'}>{school.isActive ? 'Active' : 'Inactive'}</span></div>)}</section><section className="card"><div className="flex justify-between items-center mb-4"><h2 className="font-semibold">Recent system activity</h2><Link href="/system-admin/audit-logs" className="text-sm text-primary font-semibold">Audit log</Link></div>{data?.recentActivity?.map((item) => <div key={item.id} className="py-3 border-b border-border last:border-0"><p className="font-medium text-sm">{item.action.replaceAll('_', ' ')}</p><p className="text-xs text-[var(--text-secondary)]">{item.user?.email || 'System'} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</section></div></div>;
}
