import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, parseDate, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const teacherRoutes = Router();
teacherRoutes.use(authenticate);

const teacherInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  employeeId: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  dateHired: z.string().optional(),
  phone: z.string().max(50).optional(),
  gender: z.string().max(10).optional(),
  qualification: z.string().max(255).optional(),
  specialization: z.string().max(255).optional(),
  address: z.string().optional(),
  isClassTeacher: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
});

teacherRoutes.get('/', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' && req.query.status !== 'all' ? req.query.status : undefined;

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.teacher.findMany({
        where,
        skip,
        take,
        orderBy: { lastName: 'asc' },
        include: {
          user: { select: { email: true, isActive: true, emailVerified: true } },
          classesAsTeacher: { select: { id: true, name: true, grade: true } },
          teacherSubjects: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              class: { select: { id: true, name: true, grade: true } },
            },
          },
        },
      }),
      prisma.teacher.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

teacherRoutes.post('/', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = teacherInput.parse(req.body);
    const schoolId = schoolScope(req);
    const password = input.password || 'Teacher123!';

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ValidationError('A user with this email address already exists');
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: uuidv4(),
          email: input.email.toLowerCase(),
          passwordHash: await bcrypt.hash(password, 12),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || undefined,
          role: 'teacher',
          schoolId,
          emailVerified: true,
        },
      });

      return tx.teacher.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          schoolId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          employeeId: input.employeeId?.trim() || undefined,
          dateOfBirth: parseDate(input.dateOfBirth, 'dateOfBirth'),
          dateHired: parseDate(input.dateHired, 'dateHired') || new Date(),
          phone: input.phone?.trim() || undefined,
          gender: input.gender,
          qualification: input.qualification,
          specialization: input.specialization,
          address: input.address,
          isClassTeacher: input.isClassTeacher || false,
          status: input.status || 'active',
        },
        include: {
          user: { select: { email: true, isActive: true, emailVerified: true } },
        },
      });
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

teacherRoutes.get('/:id', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const teacher = await prisma.teacher.findFirst({
      where: { id: req.params.id, schoolId: schoolScope(req) },
      include: {
        user: { select: { email: true, isActive: true, emailVerified: true, lastLogin: true } },
        classesAsTeacher: {
          include: {
            _count: { select: { studentClasses: true } },
          },
        },
        teacherSubjects: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
    });
    if (!teacher) throw new NotFoundError('Teacher not found');
    res.json({ success: true, data: teacher });
  } catch (error) { next(error); }
});

teacherRoutes.patch('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = teacherInput.partial().parse(req.body);
    const schoolId = schoolScope(req);
    const teacher = await prisma.teacher.findFirst({ where: { id: req.params.id, schoolId } });
    if (!teacher) throw new NotFoundError('Teacher not found');

    const { email, password, firstName, lastName, phone, ...teacherFields } = input;
    const data = {
      ...teacherFields,
      dateOfBirth: parseDate(input.dateOfBirth, 'dateOfBirth'),
      dateHired: parseDate(input.dateHired, 'dateHired'),
    };

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { id: teacher.id },
        data: {
          ...data,
          firstName: firstName?.trim(),
          lastName: lastName?.trim(),
          phone: phone?.trim(),
        },
      });

      if (email || password || firstName || lastName || phone) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            email: email?.toLowerCase(),
            passwordHash: password ? await bcrypt.hash(password, 12) : undefined,
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            phone: phone?.trim(),
          },
        });
      }
      return updated;
    });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

teacherRoutes.delete('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const teacher = await prisma.teacher.findFirst({
      where: { id: req.params.id, schoolId: schoolScope(req) },
    });
    if (!teacher) throw new NotFoundError('Teacher not found');

    await prisma.$transaction([
      prisma.teacher.update({
        where: { id: teacher.id },
        data: { status: 'inactive' },
      }),
      prisma.user.update({
        where: { id: teacher.userId },
        data: { isActive: false, refreshToken: null },
      }),
    ]);

    res.json({ success: true, data: { id: teacher.id, status: 'inactive' } });
  } catch (error) { next(error); }
});

