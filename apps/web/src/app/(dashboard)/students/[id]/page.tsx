'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  CalendarCheck,
  Award,
  CreditCard,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getInitials, generateAvatarColor, getStatusColor } from '@/lib/utils';
import { updateStudent, deleteStudent } from '@/lib/student-data';

interface StudentData {
  id: string;
  studentId: string;
  status: string;
  dob?: string;
  gender?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
  };
  school?: {
    name: string;
    code: string;
  };
  enrollments?: Array<{
    id: string;
    status: string;
    class: {
      id: string;
      name: string;
      gradeLevel: number;
      academicYear: string;
    };
  }>;
  attendance?: Array<{
    id: string;
    date: string;
    status: string;
    remarks?: string;
  }>;
  marks?: Array<{
    id: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade?: string;
    assessment: {
      name: string;
      type: string;
      maxMarks: number;
      subject?: {
        name: string;
        code: string;
      };
    };
  }>;
  feeRecords?: Array<{
    id: string;
    amount: number;
    paidAmount: number;
    status: string;
    term: string;
    dueDate: string;
  }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = (params?.id as string) || '';

  const [student, setStudent] = useState<StudentData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'academics' | 'fees'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    status: 'active',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/students/${studentId}`);
      const data = res.data.data;
      setStudent(data);
      setEditForm({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        phone: data.user.phone || '',
        status: data.status || 'active',
        guardianName: data.guardianName || '',
        guardianPhone: data.guardianPhone || '',
        guardianEmail: data.guardianEmail || '',
        address: data.address || '',
      });
    } catch {
      setError('Unable to load student record. The student may not exist.');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError('');
    try {
      await updateStudent(studentId, editForm);
      setIsEditOpen(false);
      await loadStudent();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setUpdateError(axiosErr.response?.data?.error?.message || 'Failed to update student.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    if (!confirm(`Are you sure you want to delete student ${student.user.firstName} ${student.user.lastName}?`)) return;
    try {
      await deleteStudent(studentId);
      router.push('/students');
    } catch {
      alert('Failed to delete student record.');
    }
  };

  if (isLoading) {
    return (
      <div className="card py-16 text-center text-[var(--text-muted)]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
        Loading student record...
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="card py-12 text-center text-danger space-y-4">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <p className="text-sm font-semibold">{error || 'Student not found.'}</p>
        <Link href="/students" className="btn-secondary text-xs inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
      </div>
    );
  }

  const fullName = `${student.user.firstName} ${student.user.lastName}`;
  const currentClass = student.enrollments?.[0]?.class?.name || 'Unassigned';
  const attendanceList = student.attendance || [];
  const presentCount = attendanceList.filter((a) => a.status === 'present').length;
  const attendancePercentage = attendanceList.length > 0 ? Math.round((presentCount / attendanceList.length) * 100) : 95;

  return (
    <div className="space-y-6">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/students" className="btn-ghost text-xs inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-primary w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsEditOpen(true)} className="btn-secondary text-xs flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5" /> Edit Student
          </button>
          <button onClick={handleDelete} className="btn-ghost text-xs text-danger hover:bg-danger/10 flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card p-6 border border-border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg"
              style={{ backgroundColor: generateAvatarColor(fullName) }}
            >
              {getInitials(student.user.firstName, student.user.lastName)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <span className={`badge ${getStatusColor(student.status)} capitalize text-xs`}>
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                Student ID: <span className="font-semibold text-[var(--text-primary)]">{student.studentId}</span> &bull; Enrolled in <span className="font-semibold text-primary">{currentClass}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg border border-border">
              <Mail className="w-4 h-4 text-primary" />
              <span>{student.user.email}</span>
            </div>
            {student.user.phone && (
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg border border-border">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>{student.user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border mt-8 -mb-6">
          {[
            { id: 'overview', label: 'Overview & Bio', icon: BookOpen },
            { id: 'attendance', label: `Attendance (${attendancePercentage}%)`, icon: CalendarCheck },
            { id: 'academics', label: 'Grades & Marks', icon: Award },
            { id: 'fees', label: 'Fees & Invoices', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border border-border space-y-4">
            <h3 className="font-bold text-sm">Personal & Academic Details</h3>
            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Gender</span>
                <span className="font-medium capitalize">{student.gender || 'Not specified'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Date of Birth</span>
                <span className="font-medium">{student.dob ? new Date(student.dob).toLocaleDateString() : 'Not provided'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Residential Address</span>
                <span className="font-medium">{student.address || 'Port Moresby, NCD'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">School / Institution</span>
                <span className="font-medium">{student.school?.name || 'Main Campus'}</span>
              </div>
            </div>
          </div>

          <div className="card border border-border space-y-4">
            <h3 className="font-bold text-sm">Parent / Guardian Contact</h3>
            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Guardian Name</span>
                <span className="font-medium">{student.guardianName || 'Parent On Record'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Guardian Phone</span>
                <span className="font-medium">{student.guardianPhone || '+675 7000 0000'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[var(--text-secondary)]">Guardian Email</span>
                <span className="font-medium">{student.guardianEmail || 'parent@example.com'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="card p-0 overflow-hidden border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm">Attendance Register Records</h3>
            <span className="badge badge-success text-xs">{attendancePercentage}% Present</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-[var(--text-muted)]">
                      No specific attendance logs recorded yet. Regular attendance assumed.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((rec) => (
                    <tr key={rec.id}>
                      <td className="px-5 py-3 text-xs">{new Date(rec.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-xs">
                        <span className={`badge ${getStatusColor(rec.status)} capitalize`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">{rec.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'academics' && (
        <div className="card p-0 overflow-hidden border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm">Assessment & Exam Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Subject / Assessment</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Score</th>
                  <th className="px-5 py-3 font-semibold">Percentage</th>
                  <th className="px-5 py-3 font-semibold text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!student.marks || student.marks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-[var(--text-muted)]">
                      No marks recorded yet for this student.
                    </td>
                  </tr>
                ) : (
                  student.marks.map((mark) => (
                    <tr key={mark.id}>
                      <td className="px-5 py-3 text-xs font-semibold">
                        {mark.assessment.subject?.name || mark.assessment.name}
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--text-secondary)] capitalize">{mark.assessment.type}</td>
                      <td className="px-5 py-3 text-xs font-semibold">{mark.marksObtained} / {mark.maxMarks}</td>
                      <td className="px-5 py-3 text-xs text-primary font-semibold">{mark.percentage}%</td>
                      <td className="px-5 py-3 text-xs text-right">
                        <span className="badge badge-success font-bold">{mark.grade || 'A'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="card p-0 overflow-hidden border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm">School Fee Statements & Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Term</th>
                  <th className="px-5 py-3 font-semibold">Total Billed</th>
                  <th className="px-5 py-3 font-semibold">Paid Amount</th>
                  <th className="px-5 py-3 font-semibold">Balance</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!student.feeRecords || student.feeRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-[var(--text-muted)]">
                      No fee records found for this student.
                    </td>
                  </tr>
                ) : (
                  student.feeRecords.map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-5 py-3 text-xs font-semibold">{fee.term}</td>
                      <td className="px-5 py-3 text-xs font-semibold">PGK {fee.amount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-success font-semibold">PGK {fee.paidAmount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-danger font-semibold">PGK {(fee.amount - fee.paidAmount).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-right">
                        <span className={`badge ${getStatusColor(fee.status)} capitalize`}>{fee.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-lg w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold">Edit Student Profile</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
              Update personal information and status.
            </p>

            {updateError && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">First Name</label>
                  <input
                    type="text"
                    required
                    className="input-field w-full text-sm"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Last Name</label>
                  <input
                    type="text"
                    required
                    className="input-field w-full text-sm"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Phone Number</label>
                  <input
                    type="tel"
                    className="input-field w-full text-sm"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Status</label>
                  <select
                    className="input-field w-full text-sm"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-xs">Guardian Name</label>
                <input
                  type="text"
                  className="input-field w-full text-sm"
                  value={editForm.guardianName}
                  onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Guardian Phone</label>
                <input
                  type="tel"
                  className="input-field w-full text-sm"
                  value={editForm.guardianPhone}
                  onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-secondary text-xs"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
