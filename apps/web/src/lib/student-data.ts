import { api } from './api';

export type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: string;
  status: string;
  email: string;
  phone: string;
  attendance: number;
  gpa: string;
  raw?: Record<string, unknown>;
};

type SheetStudent = Record<string, unknown>;
type StudentLookup = { email?: string; studentId?: string; search?: string; classId?: string };

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE || 'database';
const GOOGLE_SHEETS_API_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_URL;

function asString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalizeStatus(value: unknown): string {
  return asString(value).toLowerCase().replace(/\s+/g, '_') || 'active';
}

function splitName(value: unknown): [string, string] {
  const parts = asString(value).split(/\s+/).filter(Boolean);
  return [parts.shift() || 'Student', parts.join(' ')];
}

export function toStudent(record: SheetStudent): Student {
  const user = (record.user && typeof record.user === 'object' ? record.user : {}) as Record<string, unknown>;
  const rawFirstName = asString(record.firstName || record.first_name || user.firstName);
  const rawLastName = asString(record.lastName || record.last_name || user.lastName);
  const [splitFirst, splitLast] = splitName(record.name);

  const firstName = rawFirstName || splitFirst;
  const lastName = rawLastName || splitLast;

  const enrollments = Array.isArray(record.enrollments) ? record.enrollments : [];
  const primaryEnrollment = enrollments[0] as { class?: { name?: string; gradeLevel?: number } } | undefined;
  const enrollmentClassName = primaryEnrollment?.class?.name;

  const program = asString(record.program || record.grade || record.course);
  const year = asString(record.year || record.level || (record.grade ? record.class : ''));
  const fallbackClass = [program, year && `Year ${year}`].filter(Boolean).join(' - ');

  const className = enrollmentClassName || asString(record.class || record.className) || fallbackClass || 'Unassigned';

  const attendanceVal = Number(record.attendance);
  const gpaVal = asString(record.gpa) || (record.marks && Array.isArray(record.marks) && record.marks.length > 0 ? '3.50' : 'N/A');

  return {
    id: asString(record.id || record.studentId || record.student_id),
    studentId: asString(record.studentId || record.student_id || record.id),
    firstName,
    lastName,
    class: className,
    status: normalizeStatus(record.status || user.status),
    email: asString(record.email || user.email),
    phone: asString(record.phone || user.phone),
    attendance: Number.isFinite(attendanceVal) ? attendanceVal : 95,
    gpa: gpaVal,
    raw: record,
  };
}

function extractRecords(payload: unknown): SheetStudent[] {
  if (Array.isArray(payload)) return payload as SheetStudent[];

  if (payload && typeof payload === 'object') {
    const response = payload as { data?: unknown; students?: unknown };
    if (Array.isArray(response.students)) return response.students as SheetStudent[];
    if (Array.isArray(response.data)) return response.data as SheetStudent[];
  }

  return [];
}

async function fetchFromGoogleSheets(lookup?: StudentLookup): Promise<Student[]> {
  if (!GOOGLE_SHEETS_API_URL) {
    throw new Error('Google Sheets API URL is not configured.');
  }

  const url = new URL(GOOGLE_SHEETS_API_URL);
  if (lookup?.email) url.searchParams.set('email', lookup.email);
  if (lookup?.studentId) url.searchParams.set('student_id', lookup.studentId);

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed with status ${response.status}.`);
  }

  return extractRecords(await response.json()).map(toStudent);
}

async function fetchFromDatabase(lookup?: StudentLookup): Promise<Student[]> {
  const response = await api.get('/students', { params: lookup });
  return extractRecords(response.data).map(toStudent);
}

export async function fetchStudents(lookup?: StudentLookup): Promise<Student[]> {
  if (DATA_SOURCE === 'google_sheets') return fetchFromGoogleSheets(lookup);
  return fetchFromDatabase(lookup);
}

export async function fetchStudentById(id: string) {
  const response = await api.get(`/students/${id}`);
  return response.data.data;
}

export async function fetchStudentForUser(user: {
  id: string;
  email: string;
  studentId?: string;
}): Promise<Student> {
  const students = await fetchStudents({ email: user.email, studentId: user.studentId });
  const matchingStudent = students.find((student) =>
    [user.studentId, user.id, user.email].some((identifier) =>
      identifier && [student.id, student.studentId, student.email].includes(identifier)
    )
  );

  if (!matchingStudent) {
    throw new Error('No student record matches the authenticated user.');
  }

  return matchingStudent;
}

export const studentDataSource = DATA_SOURCE;

export type CreatedStudent = Student & { temporaryPassword?: string };

async function postToGoogleSheets(payload: Record<string, unknown>) {
  if (!GOOGLE_SHEETS_API_URL) throw new Error('Google Sheets API URL is not configured.');
  const response = await fetch(GOOGLE_SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || 'Google Sheets request failed.');
  return result;
}

export async function loginWithGoogleSheets(studentId: string, password: string) {
  const response = await api.post('/auth/student-login', { studentId, password });
  return response.data.data as {
    user: { id: string; email: string; firstName: string; lastName: string; role: 'student' };
    accessToken: string;
  };
}

export async function createGoogleSheetStudent(input: {
  name: string;
  email: string;
  phone: string;
  program: string;
  year: string;
  className: string;
}) {
  const result = await postToGoogleSheets({ action: 'add', ...input });
  return { ...toStudent(result.student as SheetStudent), temporaryPassword: result.temporary_password as string };
}

export async function createDatabaseStudent(input: {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  classId?: string;
  dob?: string;
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}) {
  const response = await api.post('/students', input);
  return toStudent(response.data.data);
}

export async function createStudent(input: {
  name?: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  program?: string;
  year?: string;
  className?: string;
  classId?: string;
  dob?: string;
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}) {
  if (DATA_SOURCE === 'google_sheets') {
    return createGoogleSheetStudent({
      name: input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim(),
      email: input.email,
      phone: input.phone || '',
      program: input.program || 'General',
      year: input.year || '10',
      className: input.className || '',
    });
  }

  const [splitFirst, splitLast] = splitName(input.name);
  const firstName = input.firstName || splitFirst;
  const lastName = input.lastName || splitLast;
  const studentId = input.studentId || `STU-${Date.now().toString().slice(-6)}`;

  return createDatabaseStudent({
    studentId,
    firstName,
    lastName,
    email: input.email,
    phone: input.phone,
    classId: input.classId,
    dob: input.dob,
    gender: input.gender,
    guardianName: input.guardianName,
    guardianPhone: input.guardianPhone,
    guardianEmail: input.guardianEmail,
  });
}

export async function updateStudent(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/students/${id}`, data);
  return toStudent(response.data.data);
}

export async function deleteStudent(id: string) {
  const response = await api.delete(`/students/${id}`);
  return response.data;
}