import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const classRoutes = Router();
classRoutes.use(authenticate);

const classInput = z.object({
  name: z.string().min(1).max(100),
  grade: z.string().min(1).max(50),
  section: z.string().max(50).optional(),
  academicYearId: z.string().uuid().optional(),
  classTeacherId: z.string().uuid().optional().or(z.literal('')),
  roomNumber: z.string().max(50).optional(),
  capacity: z.number().int().positive().max(1000).optional(),
});

classRoutes.get('/', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const where = { schoolId };
    const [data, total] = await prisma.$transaction([
      prisma.class.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          classTeacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          _count: { select: { studentClasses: true } },
          teacherSubjects: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.class.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

classRoutes.post('/', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = classInput.parse(req.body);
    const schoolId = schoolScope(req);
    const data = await prisma.class.create({
      data: {
        id: uuidv4(),
        schoolId,
        name: input.name.trim(),
        grade: input.grade.trim(),
        section: input.section?.trim() || undefined,
        academicYearId: input.academicYearId || undefined,
        classTeacherId: input.classTeacherId || undefined,
        roomNumber: input.roomNumber?.trim() || undefined,
        capacity: input.capacity || 40,
      },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { studentClasses: true } },
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

classRoutes.get('/:id', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const data = await prisma.class.findFirst({
      where: { id: req.params.id, schoolId: schoolScope(req) },
      include: {
        classTeacher: true,
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                status: true,
              },
            },
          },
        },
        teacherSubjects: {
          include: {
            subject: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!data) throw new NotFoundError('Class not found');
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

classRoutes.patch('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = classInput.partial().parse(req.body);
    const schoolId = schoolScope(req);
    const existing = await prisma.class.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) throw new NotFoundError('Class not found');

    const updateData: Record<string, unknown> = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.grade ? { grade: input.grade.trim() } : {}),
      ...(input.section !== undefined ? { section: input.section?.trim() || null } : {}),
      ...(input.academicYearId !== undefined ? { academicYearId: input.academicYearId || null } : {}),
      ...(input.classTeacherId !== undefined ? { classTeacherId: input.classTeacherId || null } : {}),
      ...(input.roomNumber !== undefined ? { roomNumber: input.roomNumber?.trim() || null } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    };

    const data = await prisma.class.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { studentClasses: true } },
      },
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

classRoutes.post('/:id/students', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const targetClass = await prisma.class.findFirst({ where: { id: req.params.id, schoolId } });
    if (!targetClass) throw new NotFoundError('Class not found');

    const studentId = z.string().uuid().parse(req.body.studentId);
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundError('Student not found');

    const existing = await prisma.studentClass.findFirst({
      where: { studentId: student.id, classId: targetClass.id },
    });
    if (existing) {
      throw new ValidationError('Student is already enrolled in this class');
    }

    const enrollment = await prisma.studentClass.create({
      data: {
        id: uuidv4(),
        studentId: student.id,
        classId: targetClass.id,
        academicYearId: targetClass.academicYearId,
      },
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) { next(error); }
});

classRoutes.delete('/:id/students/:studentId', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const targetClass = await prisma.class.findFirst({ where: { id: req.params.id, schoolId } });
    if (!targetClass) throw new NotFoundError('Class not found');

    await prisma.studentClass.deleteMany({
      where: { classId: targetClass.id, studentId: req.params.studentId },
    });

    res.json({ success: true, data: { message: 'Student removed from class' } });
  } catch (error) { next(error); }
});

classRoutes.delete('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const existing = await prisma.class.findFirst({ where: { id: req.params.id, schoolId: schoolScope(req) } });
    if (!existing) throw new NotFoundError('Class not found');

    await prisma.class.delete({ where: { id: existing.id } });
    res.json({ success: true, data: { id: existing.id, message: 'Class deleted successfully' } });
  } catch (error) { next(error); }
});

