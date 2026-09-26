import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, parseDate, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const attendanceRoutes = Router();
attendanceRoutes.use(authenticate);

const record = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid().optional().or(z.literal('')),
  date: z.string(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  checkInTime: z.string().max(10).optional(),
  checkOutTime: z.string().max(10).optional(),
  lateMinutes: z.number().int().min(0).max(1440).optional(),
  reason: z.string().max(1000).optional(),
  remarks: z.string().max(2000).optional(),
});

attendanceRoutes.get('/', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
    const classIdParam = typeof req.query.classId === 'string' && req.query.classId !== 'all' ? req.query.classId : undefined;
    const studentIdParam = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const statusParam = typeof req.query.status === 'string' && req.query.status !== 'all' ? req.query.status : undefined;

    const where: Record<string, unknown> = {
      schoolId,
      ...(req.user!.role === 'student' ? { student: { userId: req.user!.userId } } : {}),
    };

    if (dateParam) {
      const parsed = parseDate(dateParam, 'date');
      if (parsed) where.date = parsed;
    }
    if (classIdParam) where.classId = classIdParam;
    if (studentIdParam && req.user!.role !== 'student') where.studentId = studentIdParam;
    if (statusParam) where.status = statusParam;

    const [data, total] = await prisma.$transaction([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              gender: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    const statusCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const summary = {
      total,
      present: statusCounts.find((s) => s.status === 'present')?._count._all || 0,
      absent: statusCounts.find((s) => s.status === 'absent')?._count._all || 0,
      late: statusCounts.find((s) => s.status === 'late')?._count._all || 0,
      excused: statusCounts.find((s) => s.status === 'excused')?._count._all || 0,
    };

    res.json({ success: true, data, meta: { page, pageSize, total, summary } });
  } catch (error) { next(error); }
});

attendanceRoutes.post('/batch', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const rawRecords = req.body.records || req.body;
    const entries = z.array(record).min(1).max(500).parse(rawRecords);
    const schoolId = schoolScope(req);

    const values = entries.map((entry) => ({
      id: uuidv4(),
      schoolId,
      studentId: entry.studentId,
      classId: entry.classId || undefined,
      date: parseDate(entry.date, 'date')!,
      status: entry.status,
      checkInTime: entry.checkInTime,
      checkOutTime: entry.checkOutTime,
      lateMinutes: entry.lateMinutes || 0,
      reason: entry.reason,
      remarks: entry.remarks,
      markedBy: req.user!.userId,
    }));

    for (const value of values) {
      const student = await prisma.student.findFirst({ where: { id: value.studentId, schoolId } });
      if (!student) throw new ValidationError('Every student must belong to your school');
      if (value.classId && !(await prisma.class.findFirst({ where: { id: value.classId, schoolId } }))) {
        throw new ValidationError('Class does not belong to your school');
      }
    }

    const data = await prisma.$transaction(
      values.map((value) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: value.studentId, date: value.date } },
          create: value,
          update: {
            status: value.status,
            classId: value.classId,
            checkInTime: value.checkInTime,
            checkOutTime: value.checkOutTime,
            lateMinutes: value.lateMinutes,
            reason: value.reason,
            remarks: value.remarks,
            markedBy: value.markedBy,
          },
        })
      )
    );

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

attendanceRoutes.get('/student/:id', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const student = await prisma.student.findFirst({
      where: {
        id: req.params.id,
        schoolId,
        ...(req.user!.role === 'student' ? { userId: req.user!.userId } : {}),
      },
    });
    if (!student) throw new NotFoundError('Student not found');
    const data = await prisma.attendance.findMany({
      where: { studentId: student.id, schoolId },
      orderBy: { date: 'desc' },
      take: 365,
    });

    const totalDays = data.length;
    const presentDays = data.filter((a) => a.status === 'present' || a.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

    res.json({ success: true, data, meta: { totalDays, presentDays, attendancePercentage } });
  } catch (error) { next(error); }
});

attendanceRoutes.get('/reports/monthly', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new ValidationError('year and month are required');
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const data = await prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: {
        schoolId,
        date: { gte: startDate, lt: endDate },
      },
      _count: { _all: true },
    });

    res.json({ success: true, data });
  } catch (error) { next(error); }
});
