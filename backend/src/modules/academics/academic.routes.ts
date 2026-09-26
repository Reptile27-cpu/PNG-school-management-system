import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, parseDate, schoolScope } from '../../utils/route-helpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const academicRoutes = Router();
academicRoutes.use(authenticate);

const assessmentInput = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(50).optional(),
  maxScore: z.number().positive(),
  weight: z.number().min(0).max(100).optional(),
  date: z.string().optional(),
  classId: z.string().uuid().optional().or(z.literal('')),
  subjectId: z.string().uuid().optional().or(z.literal('')),
  termId: z.string().uuid().optional().or(z.literal('')),
  academicYearId: z.string().uuid().optional().or(z.literal('')),
});

const examInput = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(50).optional(),
  termId: z.string().uuid().optional().or(z.literal('')),
  academicYearId: z.string().uuid().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const markInput = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid().optional().or(z.literal('')),
  assessmentId: z.string().uuid().optional().or(z.literal('')),
  examSubjectId: z.string().uuid().optional().or(z.literal('')),
  score: z.number().min(0),
  maxScore: z.number().positive().optional(),
  remarks: z.string().max(2000).optional(),
});

const batchMarksInput = z.object({
  assessmentId: z.string().uuid().optional(),
  examSubjectId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      score: z.number().min(0),
      remarks: z.string().max(2000).optional(),
    })
  ).min(1).max(200),
});

const gradeBoundaryInput = z.object({
  grade: z.string().min(1).max(5),
  gradePoint: z.number().min(0).max(5),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().max(100).optional(),
});

academicRoutes.get('/assessments', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const classId = typeof req.query.classId === 'string' && req.query.classId !== 'all' ? req.query.classId : undefined;
    const subjectId = typeof req.query.subjectId === 'string' && req.query.subjectId !== 'all' ? req.query.subjectId : undefined;

    const where: Record<string, unknown> = { schoolId };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const [data, total] = await prisma.$transaction([
      prisma.assessment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, grade: true } },
          _count: { select: { marks: true } },
        },
      }),
      prisma.assessment.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

academicRoutes.post('/assessments', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const input = assessmentInput.parse(req.body);
    const schoolId = schoolScope(req);
    if (input.classId && !(await prisma.class.findFirst({ where: { id: input.classId, schoolId } }))) {
      throw new ValidationError('Class is outside your school');
    }
    if (input.subjectId && !(await prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }))) {
      throw new ValidationError('Subject is outside your school');
    }
    const data = await prisma.assessment.create({
      data: {
        id: uuidv4(),
        schoolId,
        name: input.name.trim(),
        type: input.type?.trim() || undefined,
        maxScore: input.maxScore,
        weight: input.weight || 0,
        date: parseDate(input.date, 'date'),
        classId: input.classId || undefined,
        subjectId: input.subjectId || undefined,
        termId: input.termId || undefined,
        academicYearId: input.academicYearId || undefined,
        createdBy: req.user!.userId,
      },
      include: {
        subject: true,
        class: true,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

academicRoutes.get('/exams', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const where = { schoolId };
    const [data, total] = await prisma.$transaction([
      prisma.exam.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { examSubjects: { include: { subject: true, class: true } } },
      }),
      prisma.exam.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

academicRoutes.post('/exams', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const input = examInput.parse(req.body);
    const schoolId = schoolScope(req);
    const data = await prisma.exam.create({
      data: {
        id: uuidv4(),
        schoolId,
        name: input.name.trim(),
        type: input.type?.trim() || undefined,
        termId: input.termId || undefined,
        academicYearId: input.academicYearId || undefined,
        startDate: parseDate(input.startDate, 'startDate'),
        endDate: parseDate(input.endDate, 'endDate'),
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

academicRoutes.get('/marks', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const schoolId = schoolScope(req);
    const { page, pageSize, skip, take } = pagination(req);
    const assessmentId = typeof req.query.assessmentId === 'string' ? req.query.assessmentId : undefined;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;

    const where: Record<string, unknown> = {
      schoolId,
      ...(req.user!.role === 'student' ? { student: { userId: req.user!.userId } } : {}),
    };
    if (assessmentId) where.assessmentId = assessmentId;
    if (studentId && req.user!.role !== 'student') where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;

    const [data, total] = await prisma.$transaction([
      prisma.mark.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true, code: true } },
          assessment: { select: { id: true, name: true, type: true, maxScore: true } },
        },
      }),
      prisma.mark.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, pageSize, total } });
  } catch (error) { next(error); }
});

academicRoutes.post('/marks', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const input = markInput.parse(req.body);
    const schoolId = schoolScope(req);
    const student = await prisma.student.findFirst({ where: { id: input.studentId, schoolId } });
    if (!student) throw new ValidationError('Student is outside your school');
    if (!input.assessmentId && !input.examSubjectId) throw new ValidationError('assessmentId or examSubjectId is required');

    let maxScore = input.maxScore;
    let subjectId = input.subjectId || undefined;

    if (input.assessmentId) {
      const assessment = await prisma.assessment.findFirst({ where: { id: input.assessmentId, schoolId } });
      if (!assessment) throw new NotFoundError('Assessment not found');
      maxScore = maxScore || Number(assessment.maxScore);
      subjectId = subjectId || assessment.subjectId || undefined;
    }

    if (input.examSubjectId) {
      const examSubject = await prisma.examSubject.findFirst({ where: { id: input.examSubjectId, exam: { schoolId } } });
      if (!examSubject) throw new NotFoundError('Exam subject not found');
      maxScore = maxScore || Number(examSubject.maxScore || 100);
      subjectId = subjectId || examSubject.subjectId;
    }

    if (!maxScore || input.score > maxScore) throw new ValidationError('Score must not exceed maxScore');
    const percentage = (input.score / maxScore) * 100;
    const boundary = await prisma.gradeBoundary.findFirst({
      where: { schoolId, minPercentage: { lte: percentage }, maxPercentage: { gte: percentage } },
    });

    const data = await prisma.mark.create({
      data: {
        id: uuidv4(),
        schoolId,
        studentId: input.studentId,
        subjectId,
        assessmentId: input.assessmentId || undefined,
        examSubjectId: input.examSubjectId || undefined,
        score: input.score,
        maxScore,
        grade: boundary?.grade || (percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F'),
        gradePoint: boundary?.gradePoint || (percentage >= 80 ? 4.0 : percentage >= 70 ? 3.0 : percentage >= 60 ? 2.0 : percentage >= 50 ? 1.0 : 0.0),
        remarks: input.remarks,
        gradedBy: req.user!.userId,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

academicRoutes.post('/marks/batch', authorize('super_admin', 'school_admin', 'teacher'), async (req, res, next) => {
  try {
    const input = batchMarksInput.parse(req.body);
    const schoolId = schoolScope(req);

    let maxScore = 100;
    let subjectId = input.subjectId;

    if (input.assessmentId) {
      const assessment = await prisma.assessment.findFirst({ where: { id: input.assessmentId, schoolId } });
      if (!assessment) throw new NotFoundError('Assessment not found');
      maxScore = Number(assessment.maxScore);
      subjectId = subjectId || assessment.subjectId || undefined;
    }

    const boundaries = await prisma.gradeBoundary.findMany({ where: { schoolId } });

    const results = await prisma.$transaction(
      input.records.map((rec) => {
        const percentage = (rec.score / maxScore) * 100;
        const boundary = boundaries.find(
          (b) => percentage >= Number(b.minPercentage) && percentage <= Number(b.maxPercentage)
        );
        const grade = boundary?.grade || (percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F');
        const gradePoint = boundary?.gradePoint || (percentage >= 80 ? 4.0 : percentage >= 70 ? 3.0 : percentage >= 60 ? 2.0 : percentage >= 50 ? 1.0 : 0.0);

        return prisma.mark.create({
          data: {
            id: uuidv4(),
            schoolId,
            studentId: rec.studentId,
            assessmentId: input.assessmentId || undefined,
            examSubjectId: input.examSubjectId || undefined,
            subjectId,
            score: rec.score,
            maxScore,
            grade,
            gradePoint,
            remarks: rec.remarks,
            gradedBy: req.user!.userId,
          },
        });
      })
    );

    res.status(201).json({ success: true, data: results });
  } catch (error) { next(error); }
});

academicRoutes.get('/grade-boundaries', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const data = await prisma.gradeBoundary.findMany({
      where: { schoolId: schoolScope(req) },
      orderBy: { minPercentage: 'desc' },
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

academicRoutes.post('/grade-boundaries', authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const input = gradeBoundaryInput.parse(req.body);
    const schoolId = schoolScope(req);
    const data = await prisma.gradeBoundary.upsert({
      where: { schoolId_grade: { schoolId, grade: input.grade.toUpperCase() } },
      create: {
        id: uuidv4(),
        schoolId,
        grade: input.grade.toUpperCase(),
        gradePoint: input.gradePoint,
        minPercentage: input.minPercentage,
        maxPercentage: input.maxPercentage,
        description: input.description,
      },
      update: {
        gradePoint: input.gradePoint,
        minPercentage: input.minPercentage,
        maxPercentage: input.maxPercentage,
        description: input.description,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
});

