import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, parseDate, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const studentRoutes = Router();
studentRoutes.use(authenticate);

const studentInput = z.object({
  studentId: z.string().max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z.string(),
  enrollmentDate: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  gender: z.string().max(10).optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  medicalInfo: z.string().optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'withdrawn']).optional(),
  academicYearId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
});

studentRoutes.get('/', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' && req.query.status !== 'all' ? req.query.status : undefined;
    const classId = typeof req.query.classId === 'string' && req.query.classId !== 'all' ? req.query.classId : undefined;

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;
    if (classId) {
      where.studentClasses = { some: { classId } };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          status: true,
          schoolId: true,
          enrollmentDate: true,
          dateOfBirth: true,
          studentClasses: {
            take: 1,
            orderBy: { enrolledDate: 'desc' },
            include: {
              class: {
                select: { id: true, name: true, grade: true },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    // Format students with flattened current class name
    const formatted = data.map((student) => {
      const currentClass = student.studentClasses[0]?.class;
      return {
        ...student,
        class: currentClass ? currentClass.name : undefined,
        className: currentClass ? currentClass.name : undefined,
        classId: currentClass ? currentClass.id : undefined,
      };
    });

    res.json({ success: true, data: formatted, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

studentRoutes.post('/', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = studentInput.parse(req.body);
    const schoolId = schoolScope(req);

    const studentCode = input.studentId?.trim() || `ST-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Verify student code uniqueness
    const existingCode = await prisma.student.findUnique({
      where: { studentId: studentCode },
    });
    if (existingCode) {
      throw new ValidationError('A student with this Student ID already exists');
    }

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          id: uuidv4(),
          schoolId,
          studentId: studentCode,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          middleName: input.middleName?.trim(),
          dateOfBirth: parseDate(input.dateOfBirth, 'dateOfBirth')!,
          enrollmentDate: parseDate(input.enrollmentDate, 'enrollmentDate') || new Date(),
          email: input.email ? input.email.trim().toLowerCase() : undefined,
          phone: input.phone?.trim() || undefined,
          gender: input.gender,
          nationality: input.nationality,
          address: input.address,
          city: input.city,
          province: input.province,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          medicalInfo: input.medicalInfo,
          bloodGroup: input.bloodGroup,
          allergies: input.allergies,
          status: input.status || 'active',
          academicYearId: input.academicYearId,
        },
      });

      if (input.classId) {
        const targetClass = await tx.class.findFirst({
          where: { id: input.classId, schoolId },
        });
        if (targetClass) {
          await tx.studentClass.create({
            data: {
              id: uuidv4(),
              studentId: student.id,
              classId: targetClass.id,
              academicYearId: targetClass.academicYearId,
            },
          });
        }
      }

      return student;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

studentRoutes.get('/:id', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const student = await prisma.student.findFirst({
      where: {
        id: req.params.id,
        schoolId,
        ...(req.user!.role === 'student' ? { userId: req.user!.userId } : {}),
      },
      include: {
        studentClasses: {
          include: {
            class: true,
            academicYear: true,
          },
        },
        attendance: {
          take: 50,
          orderBy: { date: 'desc' },
        },
        marks: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            subject: true,
            assessment: true,
          },
        },
        feeRecords: {
          include: {
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reportCards: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) throw new NotFoundError('Student not found');
    res.json({ success: true, data: student });
  } catch (error) { next(error); }
});

studentRoutes.patch('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = studentInput.partial().parse(req.body);
    const schoolId = schoolScope(req);
    const existing = await prisma.student.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) throw new NotFoundError('Student not found');

    const { classId, dateOfBirth, enrollmentDate, ...fields } = input;
    const data: Record<string, unknown> = {
      ...fields,
      ...(dateOfBirth ? { dateOfBirth: parseDate(dateOfBirth, 'dateOfBirth') } : {}),
      ...(enrollmentDate ? { enrollmentDate: parseDate(enrollmentDate, 'enrollmentDate') } : {}),
    };

    const student = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: existing.id },
        data,
      });

      if (classId) {
        const targetClass = await tx.class.findFirst({ where: { id: classId, schoolId } });
        if (targetClass) {
          // Check if already assigned
          const existingAssignment = await tx.studentClass.findFirst({
            where: { studentId: existing.id, classId: targetClass.id },
          });
          if (!existingAssignment) {
            await tx.studentClass.create({
              data: {
                id: uuidv4(),
                studentId: existing.id,
                classId: targetClass.id,
                academicYearId: targetClass.academicYearId,
              },
            });
          }
        }
      }

      return updated;
    });

    res.json({ success: true, data: student });
  } catch (error) { next(error); }
});

studentRoutes.delete('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const existing = await prisma.student.findFirst({ where: { id: req.params.id, schoolId: schoolScope(req) } });
    if (!existing) throw new NotFoundError('Student not found');
    const student = await prisma.student.update({ where: { id: existing.id }, data: { status: 'inactive' }, select: { id: true, status: true } });
    res.json({ success: true, data: student });
  } catch (error) { next(error); }
});

