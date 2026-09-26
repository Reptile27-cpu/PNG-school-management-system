'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { getInitials, generateAvatarColor, getStatusColor } from '@/lib/utils';
import { createGoogleSheetStudent, fetchStudents, studentDataSource, type Student } from '@/lib/student-data';

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; password: string } | null>(null);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', phone: '', program: '', year: '', className: '' });

  const loadStudents = async () => {
    setIsLoading(true);
    setError('');

    try {
      setStudents(await fetchStudents());
    } catch {
      setStudents([]);
      setError(
        studentDataSource === 'google_sheets'
          ? 'Unable to load student data from Google Sheets. Please check the Google Sheets connection.'
          : 'Unable to load student data from the database. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError('');
    setCreatedCredentials(null);

    try {
      const created = await createGoogleSheetStudent(newStudent);
      setCreatedCredentials({ id: created.id, password: created.temporaryPassword });
      setNewStudent({ name: '', email: '', phone: '', program: '', year: '', className: '' });
      await loadStudents();
    } catch {
      setCreateError('Unable to create the student in Google Sheets. Check the required fields and connection.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.class === selectedClass;
    const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-[var(--text-secondary)]">Manage all registered students</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => void loadStudents()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {studentDataSource === 'google_sheets' ? (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={() => setIsCreateOpen(!isCreateOpen)}>
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          ) : (
            <Link href="/students/new" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Student
            </Link>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {studentDataSource === 'google_sheets' && isCreateOpen && (
        <form className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreateStudent}>
          {[
            ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'],
            ['program', 'Program'], ['year', 'Year'], ['className', 'Class'],
          ].map(([field, label]) => (
            <label key={field} className="label">
              {label}
              <input
                className="input-field mt-1"
                type={field === 'email' ? 'email' : 'text'}
                value={newStudent[field as keyof typeof newStudent]}
                onChange={(event) => setNewStudent({ ...newStudent, [field]: event.target.value })}
                required={['name', 'email', 'program', 'year'].includes(field)}
              />
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Student'}</button>
            {createError && <p className="text-sm text-danger" role="alert">{createError}</p>}
          </div>
          {createdCredentials && (
            <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
              <p className="font-semibold">Student created successfully. Demo credentials:</p>
              <p>Student ID: <strong>{createdCredentials.id}</strong></p>
              <p>Temporary Password: <strong>{createdCredentials.password}</strong></p>
              <button
                type="button"
                className="btn-secondary mt-2 text-xs"
                onClick={() => void navigator.clipboard.writeText(`${createdCredentials.id}\n${createdCredentials.password}`)}
              >
                Copy credentials
              </button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">DEMO ONLY: the temporary password is stored in the Google Sheet.</p>
            </div>
          )}
        </form>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="input-field w-40"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              <option value="Grade 9A">Grade 9A</option>
              <option value="Grade 9B">Grade 9B</option>
              <option value="Grade 10A">Grade 10A</option>
              <option value="Grade 10B">Grade 10B</option>
            </select>
            <select
              className="input-field w-40"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="transferred">Transferred</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Student</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Class</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Attendance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">GPA</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Contact</th>
                <th className="w-10 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 px-4 text-center text-sm text-[var(--text-muted)]">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={7} className="py-8 px-4 text-center text-sm text-[var(--text-muted)]">No students found.</td></tr>
              ) : filteredStudents.map((student, index) => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-border hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/students/${student.id}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                        style={{ backgroundColor: generateAvatarColor(`${student.firstName} ${student.lastName}`) }}
                      >
                        {getInitials(student.firstName, student.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{student.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{student.class}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${getStatusColor(student.status)}`}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className={`h-full rounded-full ${
                            student.attendance >= 90 ? 'bg-success' : student.attendance >= 80 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${student.attendance}%` }}
                        />
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">{student.attendance}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">{student.gpa}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-primary transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-primary transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {filteredStudents.length} of {students.length} students
          </p>
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-3 py-1.5 text-sm">Previous</button>
            <button className="btn-primary px-3 py-1.5 text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
