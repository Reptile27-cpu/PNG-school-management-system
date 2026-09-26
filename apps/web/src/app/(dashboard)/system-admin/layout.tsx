'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  useEffect(() => {
    if (!isLoading && user?.role !== 'super_admin') router.replace('/dashboard');
  }, [isLoading, router, user]);
  if (isLoading || user?.role !== 'super_admin') return <div className="p-8 text-[var(--text-secondary)]">Checking access...</div>;
  return children;
}
