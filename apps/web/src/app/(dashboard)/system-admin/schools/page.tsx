'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { api } from '@/lib/api';

type School = { id: string; name: string; code: string; province: string | null; district: string | null; isActive: boolean; _count: { users: number; students: number; teachers: number } };

export default function SystemSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/system-admin/schools').then((response) => setSchools(response.data.data)).catch(() => setError('Unable to load schools.')); }, []);
  return <div className="space-y-6"><div className="flex flex-wrap justify-between items-end gap-4"><div><p className="text-sm text-primary font-semibold uppercase tracking-[0.15em]">System administration</p><h1 className="text-3xl font-bold mt-2">Schools</h1><p className="text-[var(--text-secondary)] mt-1">Manage every school connected to PNG-SMS.</p></div><Link href="/system-admin/schools/new" className="btn-primary"><Plus className="w-4 h-4 inline mr-2" />Add school</Link></div>{error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>}<div className="grid md:grid-cols-2 gap-4">{schools.map((school) => <Link href={`/system-admin/schools/${school.id}`} key={school.id} className="card hover:shadow-lg"><div className="flex justify-between gap-3"><div className="flex gap-3"><Building2 className="w-5 h-5 text-primary mt-1" /><div><h2 className="font-semibold">{school.name}</h2><p className="text-sm text-[var(--text-secondary)]">{school.code} · {school.province || 'Province not set'}</p></div></div><span className={school.isActive ? 'badge-success' : 'badge-danger'}>{school.isActive ? 'Active' : 'Inactive'}</span></div><div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border text-sm"><span><b>{school._count.students}</b><small className="block text-[var(--text-secondary)]">Students</small></span><span><b>{school._count.teachers}</b><small className="block text-[var(--text-secondary)]">Teachers</small></span><span><b>{school._count.users}</b><small className="block text-[var(--text-secondary)]">Users</small></span></div></Link>)}</div></div>;
}
