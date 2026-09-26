import { AppError, UnauthorizedError } from '../../utils/errors';

type SheetStudent = {
  student_id?: unknown;
  name?: unknown;
  email?: unknown;
  status?: unknown;
  password?: unknown;
};

export async function authenticateSheetStudent(studentId: string, password: string) {
  const apiUrl = process.env.GOOGLE_SHEETS_API_URL;
  if (!apiUrl) throw new AppError('Google Sheets is not configured.', 503, 'SHEETS_UNAVAILABLE');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', student_id: studentId, password }),
    });
    if (!response.ok) throw new Error('Google Sheets request failed.');
    const result = (await response.json()) as { student?: SheetStudent; error?: string };
    if (result.error || !result.student) {
      throw new UnauthorizedError('Invalid Student ID or Password');
    }
    const student = result.student;

    if (!student || String(student.student_id).trim() !== studentId.trim() || String(student.status || '').toLowerCase() !== 'active') {
      throw new UnauthorizedError('Invalid Student ID or Password');
    }

    return student;
  } catch (error) {
    if (error instanceof UnauthorizedError || (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401)) throw error;
    throw new AppError('Unable to reach Google Sheets.', 503, 'SHEETS_UNAVAILABLE');
  }
}