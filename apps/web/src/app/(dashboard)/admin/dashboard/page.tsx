'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Shield, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';

type ManagedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
};

const roleLabels: Record<string, string> = {
  super_admin: 'System administrator',
  school_admin: 'School administrator',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch {
      setError('Unable to load users. You may need system administrator access.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleActive = async (user: ManagedUser) => {
    try {
      const response = await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      setUsers((current) => current.map((item) => item.id === user.id ? response.data.data : item));
    } catch {
      setError('Unable to update this user.');
    }
  };

  const activeCount = users.filter((user) => user.isActive).length;
  const verifiedCount = users.filter((user) => user.emailVerified).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-primary font-semibold uppercase tracking-[0.15em]">System administration</p><h1 className="text-3xl font-bold mt-2">People and access</h1><p className="text-[var(--text-secondary)] mt-1">Monitor account activity and control access across PNG-SMS.</p></div>
        <button type="button" onClick={loadUsers} className="btn-secondary" disabled={isLoading}><Loader2 className={`w-4 h-4 mr-2 inline ${isLoading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card"><p className="text-sm text-[var(--text-secondary)]">Total users</p><p className="text-3xl font-bold mt-2">{users.length}</p></div>
        <div className="card"><p className="text-sm text-[var(--text-secondary)]">Active accounts</p><p className="text-3xl font-bold mt-2 text-success">{activeCount}</p></div>
        <div className="card"><p className="text-sm text-[var(--text-secondary)]">Verified email</p><p className="text-3xl font-bold mt-2 text-primary">{verifiedCount}</p></div>
      </div>

      {error && <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>}

      <section className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3"><Shield className="w-5 h-5 text-primary" /><div><h2 className="font-semibold">User directory</h2><p className="text-sm text-[var(--text-secondary)]">Access status updates take effect immediately.</p></div></div>
        {isLoading ? <div className="p-10 text-center text-[var(--text-secondary)]"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading users...</div> : users.length === 0 ? <div className="p-10 text-center text-[var(--text-secondary)]">No users found.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)]"><tr><th className="px-5 py-3 font-medium">User</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Verification</th><th className="px-5 py-3 font-medium">Last login</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-medium">{user.firstName} {user.lastName}</p><p className="text-[var(--text-secondary)]">{user.email}</p></td><td className="px-5 py-4">{roleLabels[user.role] || user.role}</td><td className="px-5 py-4">{user.emailVerified ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-4 h-4" />Verified</span> : <span className="text-warning">Pending</span>}</td><td className="px-5 py-4 text-[var(--text-secondary)]">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td><td className="px-5 py-4"><span className={user.isActive ? 'badge-success' : 'badge-danger'}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => toggleActive(user)} className={user.isActive ? 'btn-ghost text-danger' : 'btn-ghost text-success'} title={user.isActive ? 'Deactivate user' : 'Activate user'}>{user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}