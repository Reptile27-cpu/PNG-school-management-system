import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const subjectRoutes = Router();
subjectRoutes.use(authenticate);

const subjectInput = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  creditHours: z.number().int().positive().max(100).optional(),
  description: z.string().max(5000).optional(),
  isActive: z.boolean().optional(),
});

subjectRoutes.get('/', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where: Record<string, unknown> = {
      schoolId,
      ...(req.query.active === 'false' ? { isActive: false } : {}),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await prisma.$transaction([
      prisma.subject.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          teacherSubjects: {
            include: {
              teacher: { select: { id: true, firstName: true, lastName: true } },
              class: { select: { id: true, name: true, grade: true } },
            },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

subjectRoutes.post('/', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = subjectInput.parse(req.body);
    const schoolId = schoolScope(req);
    const code = input.code?.trim().toUpperCase() || undefined;

    if (code) {
      const existing = await prisma.subject.findUnique({
        where: { schoolId_code: { schoolId, code } },
      });
      if (existing) throw new ValidationError('A subject with this code already exists in your school');
    }

    const data = await prisma.subject.create({
      data: {
        id: uuidv4(),
        schoolId,
        name: input.name.trim(),
        code,
        category: input.category?.trim() || undefined,
        creditHours: input.creditHours || 1,
        description: input.description?.trim() || undefined,
        isActive: input.isActive !== false,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

subjectRoutes.get('/:id', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const data = await prisma.subject.findFirst({
      where: { id: req.params.id, schoolId: schoolScope(req) },
      include: {
        teacherSubjects: {
          include: {
            teacher: true,
            class: true,
          },
        },
        assessments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!data) throw new NotFoundError('Subject not found');
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

subjectRoutes.patch('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = subjectInput.partial().parse(req.body);
    const schoolId = schoolScope(req);
    const existing = await prisma.subject.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) throw new NotFoundError('Subject not found');

    const updateData: Record<string, unknown> = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code ? input.code.trim().toUpperCase() : null } : {}),
      ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
      ...(input.creditHours !== undefined ? { creditHours: input.creditHours } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };

    const data = await prisma.subject.update({ where: { id: existing.id }, data: updateData });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

subjectRoutes.post('/:id/teachers', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const subject = await prisma.subject.findFirst({ where: { id: req.params.id, schoolId } });
    if (!subject) throw new NotFoundError('Subject not found');

    const { teacherId, classId } = z.object({ teacherId: z.string().uuid(), classId: z.string().uuid() }).parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundError('Teacher not found');
    const targetClass = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!targetClass) throw new NotFoundError('Class not found');

    const existing = await prisma.teacherSubject.findFirst({
      where: { teacherId: teacher.id, subjectId: subject.id, classId: targetClass.id },
    });
    if (existing) throw new ValidationError('This teacher is already assigned to this subject for this class');

    const assignment = await prisma.teacherSubject.create({
      data: {
        id: uuidv4(),
        teacherId: teacher.id,
        subjectId: subject.id,
        classId: targetClass.id,
        academicYearId: targetClass.academicYearId,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true, grade: true } },
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) { next(error); }
});

subjectRoutes.delete('/:id/teachers/:teacherSubjectId', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const subject = await prisma.subject.findFirst({ where: { id: req.params.id, schoolId } });
    if (!subject) throw new NotFoundError('Subject not found');

    await prisma.teacherSubject.deleteMany({
      where: { id: req.params.teacherSubjectId, subjectId: subject.id },
    });

    res.json({ success: true, data: { message: 'Teacher unassigned from subject' } });
  } catch (error) { next(error); }
});

subjectRoutes.delete('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const existing = await prisma.subject.findFirst({ where: { id: req.params.id, schoolId: schoolScope(req) } });
    if (!existing) throw new NotFoundError('Subject not found');

    await prisma.subject.update({ where: { id: existing.id }, data: { isActive: false } });
    res.json({ success: true, data: { id: existing.id, message: 'Subject deactivated successfully' } });
  } catch (error) { next(error); }
});

