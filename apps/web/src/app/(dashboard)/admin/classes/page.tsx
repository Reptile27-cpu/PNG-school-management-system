'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Library,
  Plus,
  Trash2,
  Users,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  _count?: {
    enrollments: number;
    subjects: number;
  };
  teacherSubjects?: Array<{
    id: string;
    teacher: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
    subject: {
      name: string;
      code: string;
    };
  }>;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  department?: string;
  gradeLevel?: number;
  credits?: number;
  isActive: boolean;
}

interface TeacherOption {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function ClassesPage() {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Create Class Modal
  const [isNewClassOpen, setIsNewClassOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    gradeLevel: 10,
    academicYear: '2026',
  });

  // Create Subject Modal
  const [isNewSubjectOpen, setIsNewSubjectOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    department: 'General',
    gradeLevel: 10,
    credits: 1,
  });

  // Assign Teacher Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    subjectId: '',
    classId: '',
    teacherId: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [classRes, subjectRes, teacherRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/teachers'),
      ]);
      setClasses(classRes.data.data || []);
      setSubjects(subjectRes.data.data || []);
      setTeachers(teacherRes.data.data || []);
    } catch {
      setError('Unable to load classes and curriculum catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/classes', {
        ...classForm,
        gradeLevel: Number(classForm.gradeLevel),
      });
      setIsNewClassOpen(false);
      setSuccessMessage('Class successfully created!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setClassForm({ name: '', gradeLevel: 10, academicYear: '2026' });
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to create class.');
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete class ${name}?`)) return;
    try {
      await api.delete(`/classes/${id}`);
      await loadData();
    } catch {
      alert('Cannot delete a class with active enrollments.');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/subjects', {
        ...subjectForm,
        gradeLevel: Number(subjectForm.gradeLevel),
        credits: Number(subjectForm.credits),
      });
      setIsNewSubjectOpen(false);
      setSuccessMessage('Subject successfully added to curriculum!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setSubjectForm({ name: '', code: '', department: 'General', gradeLevel: 10, credits: 1 });
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to create subject.');
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.subjectId || !assignForm.classId || !assignForm.teacherId) {
      alert('Please select all required fields.');
      return;
    }
    setError('');
    try {
      await api.post(`/subjects/${assignForm.subjectId}/teachers`, {
        classId: assignForm.classId,
        teacherId: assignForm.teacherId,
      });
      setIsAssignOpen(false);
      setSuccessMessage('Teacher successfully allocated to subject section!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to assign teacher.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Classes & Curriculum</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Organize student grade sections, academic years, and subject syllabus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'classes' ? (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsNewClassOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsNewSubjectOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          )}
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

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'classes'
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Library className="w-4 h-4" />
            Class Sections ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subjects'
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Curriculum Subjects ({subjects.length})
          </button>
        </div>

        <button
          onClick={() => setIsAssignOpen(true)}
          className="btn-secondary text-xs mb-2 flex items-center gap-1.5"
        >
          <GraduationCap className="w-3.5 h-3.5 text-primary" />
          Allocate Teacher
        </button>
      </div>

      {/* Tab 1: Classes Grid */}
      {activeTab === 'classes' && (
        <div>
          {isLoading ? (
            <div className="card py-16 text-center text-[var(--text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="card py-16 text-center text-[var(--text-muted)]">
              No classes configured yet. Click &quot;Add Class&quot; to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((cls) => (
                <div key={cls.id} className="card p-5 border border-border hover:border-primary/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{cls.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Grade Level {cls.gradeLevel} &bull; {cls.academicYear}
                        </p>
                      </div>
                      <span className="badge bg-primary/10 text-primary text-xs font-semibold">
                        {cls._count?.enrollments ?? 0} Students
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border space-y-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Enrolled Students
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {cls._count?.enrollments ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Subjects
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {cls._count?.subjects ?? 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)]">Active Section</span>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="btn-ghost text-xs text-danger hover:bg-danger/10 p-1.5"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Subjects Table */}
      {activeTab === 'subjects' && (
        <div className="card p-0 overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Subject Name</th>
                  <th className="px-5 py-3.5 font-semibold">Subject Code</th>
                  <th className="px-5 py-3.5 font-semibold">Department</th>
                  <th className="px-5 py-3.5 font-semibold">Target Grade</th>
                  <th className="px-5 py-3.5 font-semibold">Credits</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--text-muted)]">
                      Loading subjects...
                    </td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--text-muted)]">
                      No subjects configured.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3.5 font-semibold">{sub.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-primary font-semibold">{sub.code}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">{sub.department || 'General'}</td>
                      <td className="px-5 py-3.5 text-xs">Grade {sub.gradeLevel || 10}</td>
                      <td className="px-5 py-3.5 text-xs font-mono">{sub.credits ?? 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge badge-success text-xs">Active</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isNewClassOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-md w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsNewClassOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Create Class Section</h2>
            <form onSubmit={handleCreateClass} className="space-y-4 mt-4">
              <div>
                <label className="label text-xs">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 10B"
                  className="input-field w-full text-sm"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Grade Level</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="input-field w-full text-sm"
                    value={classForm.gradeLevel}
                    onChange={(e) => setClassForm({ ...classForm, gradeLevel: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Academic Year</label>
                  <input
                    type="text"
                    className="input-field w-full text-sm"
                    value={classForm.academicYear}
                    onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsNewClassOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isNewSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-md w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsNewSubjectOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Add Curriculum Subject</h2>
            <form onSubmit={handleCreateSubject} className="space-y-4 mt-4">
              <div>
                <label className="label text-xs">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Mathematics"
                  className="input-field w-full text-sm"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MATH-10"
                    className="input-field w-full text-sm font-mono"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Grade Level</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="input-field w-full text-sm"
                    value={subjectForm.gradeLevel}
                    onChange={(e) => setSubjectForm({ ...subjectForm, gradeLevel: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsNewSubjectOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Teacher Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-md w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsAssignOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Allocate Teacher to Section</h2>
            <form onSubmit={handleAssignTeacher} className="space-y-4 mt-4">
              <div>
                <label className="label text-xs">Teacher *</label>
                <select
                  className="input-field w-full text-sm"
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                  required
                >
                  <option value="">Select a Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.firstName} {t.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Subject *</label>
                <select
                  className="input-field w-full text-sm"
                  value={assignForm.subjectId}
                  onChange={(e) => setAssignForm({ ...assignForm, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Class / Section *</label>
                <select
                  className="input-field w-full text-sm"
                  value={assignForm.classId}
                  onChange={(e) => setAssignForm({ ...assignForm, classId: e.target.value })}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Grade {c.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsAssignOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
