/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Library,
  School,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSchoolTheme } from '@/components/school-theme-provider';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = {
  super_admin: [
    { href: '/system-admin', label: 'System Administration', icon: LayoutDashboard },
    { href: '/system-admin/schools', label: 'Schools', icon: School },
    { href: '/system-admin/users', label: 'Users', icon: Users },
    { href: '/system-admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { href: '/system-admin/settings', label: 'Settings', icon: Settings },
  ],
  school_admin: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/students', label: 'Students', icon: Users },
    { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/academics', label: 'Academics', icon: BookOpen },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
    { href: '/admin/classes', label: 'Classes', icon: Library },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/teacher/grades', label: 'Grades', icon: BookOpen },
    { href: '/teacher/homework', label: 'Homework', icon: FileText },
    { href: '/teacher/announcements', label: 'Announcements', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  parent: [
    { href: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/parent/children', label: 'My Children', icon: Users },
    { href: '/parent/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/parent/grades', label: 'Grades', icon: BookOpen },
    { href: '/parent/leave-requests', label: 'Leave Requests', icon: FileText },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  student: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/academics', label: 'Grades', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const schoolTheme = useSchoolTheme();
  const role = user?.role || 'student';
  const items = navItems[role] || navItems.student;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[var(--bg-card)] border-r border-border transition-all duration-200 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <Link href={user?.role === 'super_admin' ? '/system-admin' : '/dashboard'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--school-primary)' }}>
              {schoolTheme.logoUrl ? <img src={schoolTheme.logoUrl} alt={`${schoolTheme.schoolName} logo`} className="w-full h-full object-contain" /> : <GraduationCap className="w-5 h-5 text-white" />}
            </div>
            <span className="font-bold text-sm truncate">{user?.role === 'super_admin' ? 'PNG-SMS' : schoolTheme.schoolName}</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-border">
        {!isCollapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-danger/10 hover:text-danger transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
