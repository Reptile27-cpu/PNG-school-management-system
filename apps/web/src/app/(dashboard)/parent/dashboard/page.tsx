'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  RefreshCw,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { fetchStudents, type Student } from '@/lib/student-data';
import { getInitials, generateAvatarColor } from '@/lib/utils';

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChildren() {
      try {
        const list = await fetchStudents();
        // In demo or production, display first 2 linked children or active students
        setChildren(list.slice(0, 2));
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    void loadChildren();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Parent Portal</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Welcome, {user?.firstName} {user?.lastName}. Monitor your children&apos;s academic progress, attendance, and school fees.
        </p>
      </div>

      {/* Children Overview Cards */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold">Your Enrolled Children</h2>

        {isLoading ? (
          <div className="card py-12 text-center text-[var(--text-muted)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading children profiles...
          </div>
        ) : children.length === 0 ? (
          <div className="card py-12 text-center text-[var(--text-muted)]">
            No enrolled students linked to this parent account.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child) => (
              <div key={child.id} className="card p-6 border border-border space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: generateAvatarColor(`${child.firstName} ${child.lastName}`) }}
                    >
                      {getInitials(child.firstName, child.lastName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{child.firstName} {child.lastName}</h3>
                      <p className="text-xs text-[var(--text-secondary)] font-mono">
                        {child.studentId} &bull; {child.class}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-success text-xs">Enrolled</span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">Attendance</p>
                    <p className="text-lg font-bold text-success mt-0.5">{child.attendance}%</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">GPA</p>
                    <p className="text-lg font-bold text-primary mt-0.5">{child.gpa || '3.50'}</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">Fee Balance</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">PGK 0</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/students/${child.id}`}
                    className="btn-primary text-xs flex-1 py-2 flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Report & Grades
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* School Announcements */}
      <div className="card p-6 border border-border space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Important School Notices
        </h3>
        <div className="divide-y divide-border text-xs space-y-3">
          <div className="pt-2">
            <p className="font-semibold text-sm">Parent-Teacher Conference (Term 1)</p>
            <p className="text-[var(--text-secondary)] mt-1">
              Meetings will be held on Friday from 1:00 PM to 4:00 PM at the main hall.
            </p>
          </div>
          <div className="pt-3">
            <p className="font-semibold text-sm">Term 2 School Fee Deadline</p>
            <p className="text-[var(--text-secondary)] mt-1">
              Please ensure all term balance payments are remitted before the commencement of the term.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
