'use client';

import { Bell, Search, Moon, Sun, Menu } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getInitials, generateAvatarColor } from '@/lib/utils';

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { isDark, toggle } = useThemeStore();
  const { user } = useAuthStore();

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const avatarColor = user ? generateAvatarColor(`${user.firstName} ${user.lastName}`) : '#3B82F6';

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)] border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              className="input-field pl-10 py-2 w-64 lg:w-80"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
            ) : (
              <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
            )}
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors relative">
            <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

          {/* User Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer"
            style={{ backgroundColor: avatarColor }}
            title={user ? `${user.firstName} ${user.lastName}` : 'User'}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
