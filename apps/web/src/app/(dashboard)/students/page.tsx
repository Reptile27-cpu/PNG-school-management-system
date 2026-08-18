'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { getInitials, generateAvatarColor, getStatusColor } from '@/lib/utils';

// Mock data for demonstration
const students = Array.from({ length: 25 }, (_, i) => ({
  id: `PNG-POM-001-2024-${String(i + 1).padStart(4, '0')}`,
  firstName: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'][i % 10],
  lastName: ['Kumar', 'Smith', 'Namo', 'Brown', 'Wilson', 'Davis', 'Miller', 'Garcia', 'Martinez', 'Anderson'][i % 10],
  class: i < 10 ? 'Grade 9A' : i < 15 ? 'Grade 9B' : i < 20 ? 'Grade 10A' : 'Grade 10B',
  status: i % 5 === 0 ? 'transferred' : i % 7 === 0 ? 'withdrawn' : 'active',
  email: `student${i + 1}@school.edu.pg`,
  phone: `+675 7${String(i).padStart(7, '0')}`,
  attendance: 85 + Math.floor(Math.random() * 15),
  gpa: (2.0 + Math.random() * 2.0).toFixed(2),
}));

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

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
        <Link href="/students/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

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
              {filteredStudents.map((student, index) => (
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
