import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { schoolScope } from '../../utils/route-helpers';

export const analyticsRoutes = Router();
analyticsRoutes.use(authenticate, authorize('super_admin', 'school_admin', 'teacher'));

analyticsRoutes.get('/dashboard', async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      students,
      teachers,
      classes,
      subjects,
      activeStudents,
      attendanceSummary,
      todayAttendance,
      feeStats,
      recentStudents,
      recentActivity,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId, status: 'active' } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId, isActive: true } }),
      prisma.student.count({ where: { schoolId, status: 'active' } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { _all: true },
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { schoolId, date: today },
        _count: { _all: true },
      }),
      prisma.feeRecord.aggregate({
        where: { schoolId },
        _sum: { amount: true, amountPaid: true },
        _count: { _all: true },
      }),
      prisma.student.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          studentClasses: {
            take: 1,
            include: { class: { select: { name: true } } },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
    ]);

    const totalAttendanceMarks = attendanceSummary.reduce((acc, curr) => acc + curr._count._all, 0);
    const presentMarks = attendanceSummary.find((s) => s.status === 'present')?._count._all || 0;
    const lateMarks = attendanceSummary.find((s) => s.status === 'late')?._count._all || 0;
    const overallAttendanceRate = totalAttendanceMarks > 0
      ? Math.round(((presentMarks + lateMarks) / totalAttendanceMarks) * 1000) / 10
      : 95.0;

    const todayTotal = todayAttendance.reduce((acc, curr) => acc + curr._count._all, 0);
    const todayPresent = todayAttendance.find((s) => s.status === 'present')?._count._all || 0;
    const todayLate = todayAttendance.find((s) => s.status === 'late')?._count._all || 0;
    const todayAttendanceRate = todayTotal > 0
      ? Math.round(((todayPresent + todayLate) / todayTotal) * 1000) / 10
      : overallAttendanceRate;

    const totalFees = Number(feeStats._sum.amount || 0);
    const paidFees = Number(feeStats._sum.amountPaid || 0);
    const pendingFees = Math.max(0, totalFees - paidFees);

    res.json({
      success: true,
      data: {
        students,
        teachers,
        classes,
        subjects,
        activeStudents,
        attendanceRate: overallAttendanceRate,
        todayAttendanceRate,
        totalFees,
        paidFees,
        pendingFees,
        feeCollectionRate: totalFees > 0 ? Math.round((paidFees / totalFees) * 1000) / 10 : 100,
        recentStudents: recentStudents.map((s) => ({
          ...s,
          className: s.studentClasses[0]?.class?.name || 'Unassigned',
        })),
        recentActivity,
      },
    });
  } catch (error) { next(error); }
});

analyticsRoutes.get('/attendance-trends', async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));
    const from = new Date(Date.now() - days * 86400000);
    from.setHours(0, 0, 0, 0);

    const data = await prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { schoolId, date: { gte: from } },
      _count: { _all: true },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const dateMap = new Map<string, { date: string; present: number; absent: number; late: number; excused: number }>();
    for (const item of data) {
      const dateStr = item.date.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, present: 0, absent: 0, late: 0, excused: 0 });
      }
      const entry = dateMap.get(dateStr)!;
      if (item.status === 'present') entry.present = item._count._all;
      else if (item.status === 'absent') entry.absent = item._count._all;
      else if (item.status === 'late') entry.late = item._count._all;
      else if (item.status === 'excused') entry.excused = item._count._all;
    }

    res.json({ success: true, data: Array.from(dateMap.values()) });
  } catch (error) { next(error); }
});

analyticsRoutes.get('/grade-distribution', async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const data = await prisma.mark.groupBy({
      by: ['grade'],
      where: { schoolId },
      _count: { _all: true },
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

analyticsRoutes.get('/at-risk-students', async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const data = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'active',
        OR: [
          { attendance: { some: { status: 'absent' } } },
          { marks: { some: { grade: { in: ['F', 'E', 'D'] } } } },
        ],
      },
      take: 50,
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        status: true,
        studentClasses: {
          take: 1,
          include: { class: { select: { name: true } } },
        },
        _count: {
          select: {
            attendance: { where: { status: 'absent' } },
            marks: { where: { grade: { in: ['F', 'E'] } } },
          },
        },
      },
    });

    const formatted = data.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: `${s.firstName} ${s.lastName}`,
      className: s.studentClasses[0]?.class?.name || 'Unassigned',
      absentDays: s._count.attendance,
      failingMarks: s._count.marks,
      riskLevel: s._count.marks >= 2 || s._count.attendance >= 5 ? 'High' : 'Moderate',
    }));

    res.json({ success: true, data: formatted });
  } catch (error) { next(error); }
});
