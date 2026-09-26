'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Award,
  Plus,
  Save,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface AssessmentItem {
  id: string;
  name: string;
  type: string;
  maxMarks: number;
  weightage: number;
  term: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class: {
    id: string;
    name: string;
  };
  _count?: {
    marks: number;
  };
}

interface StudentScore {
  studentId: string;
  name: string;
  studentIdCode: string;
  marksObtained: number | '';
  percentage: number;
  grade: string;
}

interface GradeBoundary {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  gpaPoint: number;
  description?: string;
}

export default function AcademicsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [gradeBoundaries, setGradeBoundaries] = useState<GradeBoundary[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [activeTab, setActiveTab] = useState<'assessments' | 'boundaries'>('assessments');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Create Assessment Modal
  const [isNewAssessmentOpen, setIsNewAssessmentOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '',
    type: 'assignment',
    maxMarks: 100,
    weightage: 20,
    term: 'Term 1',
    classId: '',
    subjectId: '',
  });

  // Enter Marks Modal / Drawer
  const [activeAssessment, setActiveAssessment] = useState<AssessmentItem | null>(null);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);

  // 1. Initial Load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [classRes, subjectRes, boundaryRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/academics/grade-boundaries'),
      ]);

      const classList: ClassItem[] = classRes.data.data || [];
      const subjectList: SubjectItem[] = subjectRes.data.data || [];
      setClasses(classList);
      setSubjects(subjectList);
      setGradeBoundaries(boundaryRes.data.data || []);

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
        setNewAssessment((prev) => ({
          ...prev,
          classId: classList[0].id,
          subjectId: subjectList[0]?.id || '',
        }));
      }
    } catch {
      setError('Unable to load academic metadata.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // 2. Load Assessments
  const loadAssessments = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const res = await api.get('/academics/assessments', {
        params: {
          classId: selectedClassId,
          subjectId: selectedSubjectId || undefined,
        },
      });
      setAssessments(res.data.data || []);
    } catch {
      // Failed to load assessments
    }
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  // Create Assessment Submit
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      await api.post('/academics/assessments', {
        ...newAssessment,
        maxMarks: Number(newAssessment.maxMarks),
        weightage: Number(newAssessment.weightage),
      });
      setIsNewAssessmentOpen(false);
      setSuccessMessage('Assessment successfully created!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadAssessments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to create assessment.');
    }
  };

  // Open Enter Marks
  const handleOpenEnterMarks = async (assessment: AssessmentItem) => {
    setActiveAssessment(assessment);
    setIsLoadingScores(true);
    try {
      const [studentsRes, marksRes] = await Promise.all([
        api.get('/students', { params: { classId: assessment.class.id, limit: 100 } }),
        api.get('/academics/marks', { params: { assessmentId: assessment.id } }),
      ]);

      const studentList = studentsRes.data.data || [];
      const marksList = marksRes.data.data || [];

      const mapped: StudentScore[] = studentList.map((s: {
        id: string;
        studentId: string;
        user: { firstName: string; lastName: string };
      }) => {
        const foundMark = marksList.find((m: { studentId: string }) => m.studentId === s.id);
        const marksObtained = foundMark ? foundMark.marksObtained : '';
        const pct = marksObtained !== '' ? Math.round((Number(marksObtained) / assessment.maxMarks) * 100) : 0;
        return {
          studentId: s.id,
          name: `${s.user.firstName} ${s.user.lastName}`,
          studentIdCode: s.studentId,
          marksObtained,
          percentage: pct,
          grade: foundMark?.grade || (pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D'),
        };
      });

      setScores(mapped);
    } catch {
      alert('Failed to load students for this assessment.');
    } finally {
      setIsLoadingScores(false);
    }
  };

  const handleScoreChange = (index: number, val: string) => {
    if (!activeAssessment) return;
    const num = val === '' ? '' : Math.min(activeAssessment.maxMarks, Math.max(0, Number(val)));
    setScores((prev) => {
      const next = [...prev];
      const pct = num !== '' ? Math.round((Number(num) / activeAssessment.maxMarks) * 100) : 0;
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B';
      else if (pct >= 60) grade = 'C';
      else if (pct >= 50) grade = 'D';

      next[index] = {
        ...next[index],
        marksObtained: num,
        percentage: pct,
        grade,
      };
      return next;
    });
  };

  const handleSaveMarks = async () => {
    if (!activeAssessment) return;
    setIsSavingScores(true);
    try {
      const payload = scores
        .filter((s) => s.marksObtained !== '')
        .map((s) => ({
          studentId: s.studentId,
          marksObtained: Number(s.marksObtained),
        }));

      await api.post('/academics/marks/batch', {
        assessmentId: activeAssessment.id,
        marks: payload,
      });

      setSuccessMessage('Student marks successfully recorded!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setActiveAssessment(null);
      await loadAssessments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosErr.response?.data?.error?.message || 'Failed to save marks.');
    } finally {
      setIsSavingScores(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Academics & Grading</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage assessments, record exam marks, and configure official grade boundaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => setIsNewAssessmentOpen(true)}
          >
            <Plus className="w-4 h-4" />
            New Assessment
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

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'assessments'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Award className="w-4 h-4" />
          Assessments & Grade Entry
        </button>
        <button
          onClick={() => setActiveTab('boundaries')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'boundaries'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Grade Boundaries & Scales
        </button>
      </div>

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-4 border border-border flex flex-wrap gap-4 items-center">
            <div>
              <label className="label text-xs">Class / Section</label>
              <select
                className="input-field text-sm min-w-[160px]"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Filter by Subject</label>
              <select
                className="input-field text-sm min-w-[160px]"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void loadAssessments()}
              className="btn-secondary text-xs self-end mb-1"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reload
            </button>
          </div>

          {/* Assessment List */}
          <div className="card p-0 overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Assessment</th>
                    <th className="px-5 py-3.5 font-semibold">Subject</th>
                    <th className="px-5 py-3.5 font-semibold">Type</th>
                    <th className="px-5 py-3.5 font-semibold">Max Score</th>
                    <th className="px-5 py-3.5 font-semibold">Weight</th>
                    <th className="px-5 py-3.5 font-semibold">Term</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-[var(--text-muted)]">
                        Loading assessments...
                      </td>
                    </tr>
                  ) : assessments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-[var(--text-muted)]">
                        No assessments created for this class yet. Click &quot;New Assessment&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-5 py-3.5 font-semibold">{a.name}</td>
                        <td className="px-5 py-3.5">
                          <span className="badge bg-primary/10 text-primary text-xs font-medium">
                            {a.subject.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-xs text-[var(--text-secondary)]">{a.type}</td>
                        <td className="px-5 py-3.5 font-mono text-xs">{a.maxMarks} pts</td>
                        <td className="px-5 py-3.5 text-xs">{a.weightage}%</td>
                        <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">{a.term}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => void handleOpenEnterMarks(a)}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 ml-auto"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Enter Marks
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grade Boundaries Tab */}
      {activeTab === 'boundaries' && (
        <div className="card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base">PNG Standard Grading Scale</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Standard percentage-to-grade conversions applied to report cards.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Grade</th>
                  <th className="px-5 py-3 font-semibold">Min Percentage</th>
                  <th className="px-5 py-3 font-semibold">Max Percentage</th>
                  <th className="px-5 py-3 font-semibold">GPA Points</th>
                  <th className="px-5 py-3 font-semibold">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradeBoundaries.length === 0 ? (
                  <>
                    <tr><td className="px-5 py-3 font-bold text-success">A+</td><td className="px-5 py-3">90%</td><td className="px-5 py-3">100%</td><td className="px-5 py-3">4.00</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">High Distinction</td></tr>
                    <tr><td className="px-5 py-3 font-bold text-success">A</td><td className="px-5 py-3">80%</td><td className="px-5 py-3">89%</td><td className="px-5 py-3">3.75</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">Distinction</td></tr>
                    <tr><td className="px-5 py-3 font-bold text-primary">B</td><td className="px-5 py-3">70%</td><td className="px-5 py-3">79%</td><td className="px-5 py-3">3.00</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">Credit</td></tr>
                    <tr><td className="px-5 py-3 font-bold text-amber-500">C</td><td className="px-5 py-3">60%</td><td className="px-5 py-3">69%</td><td className="px-5 py-3">2.00</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">Upper Pass</td></tr>
                    <tr><td className="px-5 py-3 font-bold text-orange-500">D</td><td className="px-5 py-3">50%</td><td className="px-5 py-3">59%</td><td className="px-5 py-3">1.00</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">Pass</td></tr>
                    <tr><td className="px-5 py-3 font-bold text-danger">F</td><td className="px-5 py-3">0%</td><td className="px-5 py-3">49%</td><td className="px-5 py-3">0.00</td><td className="px-5 py-3 text-xs text-[var(--text-secondary)]">Fail</td></tr>
                  </>
                ) : (
                  gradeBoundaries.map((gb) => (
                    <tr key={gb.id}>
                      <td className="px-5 py-3 font-bold text-primary">{gb.grade}</td>
                      <td className="px-5 py-3">{gb.minScore}%</td>
                      <td className="px-5 py-3">{gb.maxScore}%</td>
                      <td className="px-5 py-3 font-mono">{gb.gpaPoint.toFixed(2)}</td>
                      <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">{gb.description || 'Standard'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Assessment Modal */}
      {isNewAssessmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-lg w-full p-6 relative border border-border shadow-2xl my-8">
            <button
              onClick={() => setIsNewAssessmentOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold">Create New Assessment</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
              Define assessment title, type, maximum marks, and weight.
            </p>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              <div>
                <label className="label text-xs">Assessment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term 1 Mid-Exam"
                  className="input-field w-full text-sm"
                  value={newAssessment.name}
                  onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Class *</label>
                  <select
                    className="input-field w-full text-sm"
                    value={newAssessment.classId}
                    onChange={(e) => setNewAssessment({ ...newAssessment, classId: e.target.value })}
                    required
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Subject *</label>
                  <select
                    className="input-field w-full text-sm"
                    value={newAssessment.subjectId}
                    onChange={(e) => setNewAssessment({ ...newAssessment, subjectId: e.target.value })}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Type</label>
                  <select
                    className="input-field w-full text-sm"
                    value={newAssessment.type}
                    onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="practical">Practical</option>
                    <option value="project">Project</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field w-full text-sm"
                    value={newAssessment.maxMarks}
                    onChange={(e) => setNewAssessment({ ...newAssessment, maxMarks: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label text-xs">Weight (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="input-field w-full text-sm"
                    value={newAssessment.weightage}
                    onChange={(e) => setNewAssessment({ ...newAssessment, weightage: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Academic Term</label>
                <select
                  className="input-field w-full text-sm"
                  value={newAssessment.term}
                  onChange={(e) => setNewAssessment({ ...newAssessment, term: e.target.value })}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Term 4">Term 4</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewAssessmentOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Marks Full Modal */}
      {activeAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-3xl w-full p-6 relative border border-border shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveAssessment(null)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-border pb-4 mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Enter Marks: {activeAssessment.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Class: <strong className="text-[var(--text-primary)]">{activeAssessment.class.name}</strong> &bull; Subject: <strong className="text-[var(--text-primary)]">{activeAssessment.subject.name}</strong> &bull; Max Score: <strong className="text-primary">{activeAssessment.maxMarks}</strong>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border pr-2">
              {isLoadingScores ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading enrolled student roster...
                </div>
              ) : scores.length === 0 ? (
                <p className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No students found in this class.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-secondary)] text-left text-[var(--text-secondary)] text-xs uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Marks Obtained (Max {activeAssessment.maxMarks})</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3 text-right">Calculated Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scores.map((s, idx) => (
                      <tr key={s.studentId}>
                        <td className="py-2.5 px-3 font-medium">{s.name}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-secondary)]">{s.studentIdCode}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={activeAssessment.maxMarks}
                            className="input-field py-1 px-2 w-24 text-sm font-semibold"
                            placeholder="0"
                            value={s.marksObtained}
                            onChange={(e) => handleScoreChange(idx, e.target.value)}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary">{s.percentage}%</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="badge badge-success font-bold">{s.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <span className="text-xs text-[var(--text-muted)]">
                {scores.filter((s) => s.marksObtained !== '').length} of {scores.length} marks filled
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAssessment(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMarks}
                  disabled={isSavingScores}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSavingScores ? 'Saving...' : 'Save Student Marks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
