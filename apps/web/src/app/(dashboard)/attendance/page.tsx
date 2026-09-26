'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  RefreshCw,
  Save,
  AlertCircle,
  Users
} from 'lucide-react';
import { api } from '@/lib/api';
import { getInitials, generateAvatarColor } from '@/lib/utils';

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
}

interface StudentItem {
  id: string;
  studentId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Load classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await api.get('/classes');
        const list: ClassItem[] = res.data.data || [];
        setClasses(list);
        if (!selectedClassId && list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch {
        setError('Unable to load classes.');
      } finally {
        setIsLoadingClasses(false);
      }
    }
    void loadClasses();
  }, [selectedClassId]);

  // 2. Load students & attendance for selected class and date
  const loadClassAttendance = useCallback(async () => {
    if (!selectedClassId) return;

    setIsLoadingStudents(true);
    setError('');
    setSuccessMessage('');

    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get('/students', { params: { classId: selectedClassId, limit: 100 } }),
        api.get('/attendance', { params: { classId: selectedClassId, date: selectedDate } }),
      ]);

      const studentList: StudentItem[] = studentsRes.data.data || [];
      setStudents(studentList);

      const existingRecords = attendanceRes.data.data || [];
      const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};

      studentList.forEach((s) => {
        const found = existingRecords.find((r: { studentId: string }) => r.studentId === s.id);
        newMap[s.id] = {
          status: (found?.status as AttendanceStatus) || 'present',
          remarks: found?.remarks || '',
        };
      });

      setAttendanceMap(newMap);
    } catch {
      setError('Unable to load attendance register for the selected class.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => {
    void loadClassAttendance();
  }, [loadClassAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { ...next[s.id], status };
      });
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || students.length === 0) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const records: AttendanceRecord[] = students.map((s) => ({
        studentId: s.id,
        status: attendanceMap[s.id]?.status || 'present',
        remarks: attendanceMap[s.id]?.remarks || undefined,
      }));

      await api.post('/attendance/batch', {
        classId: selectedClassId,
        date: new Date(selectedDate).toISOString(),
        records,
      });

      setSuccessMessage('Attendance register successfully saved!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to save attendance register.');
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics
  const total = students.length;
  const present = students.filter((s) => attendanceMap[s.id]?.status === 'present').length;
  const absent = students.filter((s) => attendanceMap[s.id]?.status === 'absent').length;
  const late = students.filter((s) => attendanceMap[s.id]?.status === 'late').length;
  const excused = students.filter((s) => attendanceMap[s.id]?.status === 'excused').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance Register</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Record and verify daily classroom attendance by grade and section.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={() => void loadClassAttendance()}
            disabled={isLoadingStudents}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStudents ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleSaveAttendance}
            disabled={isSaving || students.length === 0}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Register'}
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

      {/* Selector and Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 border border-border space-y-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" /> Session Selection
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label text-xs">Select Class / Section</label>
              <select
                className="input-field w-full text-sm"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={isLoadingClasses}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Grade {cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Register Date</label>
              <input
                type="date"
                className="input-field w-full text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 card p-5 border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">Session Attendance Summary</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              {total} Enrolled Students
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="bg-success/10 p-3 rounded-lg border border-success/20">
              <p className="text-xs text-success font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Present
              </p>
              <p className="text-2xl font-bold mt-1 text-success">{present}</p>
            </div>

            <div className="bg-danger/10 p-3 rounded-lg border border-danger/20">
              <p className="text-xs text-danger font-semibold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Absent
              </p>
              <p className="text-2xl font-bold mt-1 text-danger">{absent}</p>
            </div>

            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Late
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{late}</p>
            </div>

            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-500 font-semibold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Excused
              </p>
              <p className="text-2xl font-bold mt-1 text-blue-500">{excused}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-border pt-3">
            <span>Overall Rate: <strong className="text-success">{rate}%</strong></span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll('present')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark All Present
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => handleMarkAll('absent')}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="card p-0 overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm">Class Roster</h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Click status button to update
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-5 py-3 font-semibold">Student ID</th>
                <th className="px-5 py-3 font-semibold">Status Selection</th>
                <th className="px-5 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingStudents ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[var(--text-muted)]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading class register...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[var(--text-muted)]">
                    No students currently enrolled in this class.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const record = attendanceMap[student.id] || { status: 'present', remarks: '' };
                  const name = `${student.user.firstName} ${student.user.lastName}`;

                  return (
                    <tr key={student.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: generateAvatarColor(name) }}
                          >
                            {getInitials(student.user.firstName, student.user.lastName)}
                          </div>
                          <div>
                            <p className="font-semibold">{name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{student.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[var(--text-secondary)]">
                        {student.studentId}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((st) => {
                            const isSelected = record.status === st;
                            let activeClass = '';
                            if (st === 'present') activeClass = 'bg-success text-white border-success';
                            if (st === 'absent') activeClass = 'bg-danger text-white border-danger';
                            if (st === 'late') activeClass = 'bg-amber-500 text-white border-amber-500';
                            if (st === 'excused') activeClass = 'bg-blue-500 text-white border-blue-500';

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(student.id, st)}
                                className={`px-2.5 py-1 rounded text-xs font-medium border capitalize transition-all ${
                                  isSelected
                                    ? activeClass
                                    : 'border-border text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <input
                          type="text"
                          placeholder="Optional note..."
                          className="input-field text-xs py-1 px-2 w-full max-w-xs"
                          value={record.remarks}
                          onChange={(e) =>
                            setAttendanceMap((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                remarks: e.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading attendance module...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
