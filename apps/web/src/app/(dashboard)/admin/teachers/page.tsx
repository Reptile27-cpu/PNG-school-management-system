'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Mail,
  Phone,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { getInitials, generateAvatarColor } from '@/lib/utils';

interface TeacherItem {
  id: string;
  employeeId?: string;
  specialization?: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
  };
  teacherSubjects?: Array<{
    subject: {
      name: string;
      code: string;
    };
    class: {
      name: string;
    };
  }>;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add Teacher Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    specialization: 'Mathematics',
  });

  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/teachers');
      setTeachers(res.data.data || []);
    } catch {
      setError('Unable to load teachers directory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    try {
      await api.post('/teachers', formData);
      setSuccessMessage('Teacher successfully added to faculty!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        employeeId: '',
        specialization: 'Mathematics',
      });
      await loadTeachers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setModalError(axiosErr.response?.data?.error?.message || 'Failed to add teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate teacher ${name}?`)) return;
    try {
      await api.delete(`/teachers/${id}`);
      await loadTeachers();
    } catch {
      alert('Failed to deactivate teacher.');
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${t.user.firstName} ${t.user.lastName}`.toLowerCase();
    const email = t.user.email.toLowerCase();
    const spec = (t.specialization || '').toLowerCase();
    const emp = (t.employeeId || '').toLowerCase();
    return fullName.includes(q) || email.includes(q) || spec.includes(q) || emp.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Faculty & Teachers</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage teacher profiles, subject assignments, and departmental staff.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={() => void loadTeachers()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by teacher name, email, specialization, or employee ID..."
            className="input-field pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Teachers Directory Cards */}
      {isLoading ? (
        <div className="card py-16 text-center text-[var(--text-muted)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading faculty records...
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="card py-16 text-center text-[var(--text-muted)]">
          No faculty members found. Click &quot;Add Teacher&quot; to enroll new teachers.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const name = `${teacher.user.firstName} ${teacher.user.lastName}`;
            const isActive = teacher.status === 'active' && teacher.user.status === 'active';

            return (
              <div
                key={teacher.id}
                className="card p-5 border border-border hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: generateAvatarColor(name) }}
                      >
                        {getInitials(teacher.user.firstName, teacher.user.lastName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{name}</h3>
                        <p className="text-xs text-primary font-medium mt-0.5">
                          {teacher.specialization || 'General Faculty'}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'} text-xs capitalize`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)] border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{teacher.user.email}</span>
                    </div>
                    {teacher.user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{teacher.user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Employee ID: {teacher.employeeId || 'EMP-001'}</span>
                    </div>
                  </div>

                  {/* Teaching Subjects */}
                  {teacher.teacherSubjects && teacher.teacherSubjects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1.5">
                        Assigned Classes & Subjects
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.teacherSubjects.map((ts, idx) => (
                          <span key={idx} className="badge bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px]">
                            {ts.class.name} &bull; {ts.subject.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">Port Moresby Campus</span>
                  <button
                    onClick={() => handleDelete(teacher.id, name)}
                    className="btn-ghost text-xs text-danger hover:bg-danger/10 p-1.5"
                    title="Deactivate Teacher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-lg w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold">Add New Teacher</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
              Create an official faculty profile and system login account.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field w-full text-sm"
                    placeholder="e.g. Sarah"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field w-full text-sm"
                    placeholder="e.g. Namo"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Email Address *</label>
                <input
                  type="email"
                  required
                  className="input-field w-full text-sm"
                  placeholder="teacher@school.edu.pg"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Phone Number</label>
                  <input
                    type="tel"
                    className="input-field w-full text-sm"
                    placeholder="+675 7xxx xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Employee ID</label>
                  <input
                    type="text"
                    className="input-field w-full text-sm"
                    placeholder="EMP-2026-04"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Specialization / Department</label>
                <input
                  type="text"
                  className="input-field w-full text-sm"
                  placeholder="e.g. Mathematics, Science, English"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Enroll Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
