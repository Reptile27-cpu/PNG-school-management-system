import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth, requireSystemAdmin } from '../../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { removeSchoolLogo, uploadSchoolLogo } from '../../utils/school-branding-storage';

export const systemAdminRoutes = Router();
systemAdminRoutes.use(requireAuth, requireSystemAdmin);

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Color must be a 6-digit hexadecimal value');
const brandingInput = z.object({
  primaryColor: color.optional(),
  secondaryColor: color.optional(),
  backgroundColor: color.optional(),
  motto: z.string().max(255).optional(),
});

const writeAudit = async (userId: string, action: string, entityType: string, entityId: string, changes?: unknown) => {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, changes: changes as object | undefined },
  });
};

systemAdminRoutes.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalSchools, activeSchools, totalStudents, totalTeachers, totalSchoolAdmins, recentSchools, recentActivity] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { isActive: true } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count({ where: { role: 'school_admin' } }),
      prisma.school.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, code: true, isActive: true, createdAt: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { email: true } } } }),
    ]);
    res.json({ success: true, data: { totalSchools, activeSchools, totalStudents, totalTeachers, totalSchoolAdmins, recentSchools, recentActivity } });
  } catch (error) { next(error); }
});

systemAdminRoutes.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, email: true, firstName: true, lastName: true, role: true, schoolId: true, isActive: true, emailVerified: true, lastLogin: true, createdAt: true } });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

systemAdminRoutes.post('/school-admins', async (req, res, next) => {
  try {
    const { schoolId, email, password, firstName, lastName, phone } = req.body;
    if (![schoolId, email, password, firstName, lastName].every((value) => typeof value === 'string' && value.trim())) throw new ValidationError('schoolId, email, password, firstName, and lastName are required');
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, isActive: true } });
    if (!school || !school.isActive) throw new NotFoundError('Active school not found');
    const user = await prisma.user.create({ data: { id: uuidv4(), schoolId, email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12), firstName: firstName.trim(), lastName: lastName.trim(), phone, role: 'school_admin', emailVerified: false }, select: { id: true, email: true, firstName: true, lastName: true, schoolId: true, role: true, isActive: true, emailVerified: true } });
    await writeAudit(req.user!.userId, 'SCHOOL_ADMIN_CREATED', 'User', user.id, { schoolId: user.schoolId });
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
});

systemAdminRoutes.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') throw new ValidationError('isActive must be a boolean');
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive, ...(req.body.isActive ? {} : { refreshToken: null }) }, select: { id: true, email: true, role: true, schoolId: true, isActive: true } });
    await writeAudit(req.user!.userId, req.body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'User', user.id, { isActive: user.isActive });
    res.json({ success: true, data: user });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') { next(new NotFoundError('User not found')); return; }
    next(error);
  }
});

systemAdminRoutes.get('/schools', async (_req, res, next) => {
  try {
    const schools = await prisma.school.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { users: true, students: true, teachers: true } } } });
    res.json({ success: true, data: schools });
  } catch (error) { next(error); }
});

systemAdminRoutes.post('/schools', async (req, res, next) => {
  try {
    const { name, code, province, district, address, email, phone, isActive = true, logoData, ...branding } = req.body;
    const parsedLogoData = z.string().optional().parse(logoData);
    if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim()) throw new ValidationError('School name and code are required');
    const parsedBranding = brandingInput.parse(branding);
    const school = await prisma.school.create({ data: { name: name.trim(), code: code.trim().toUpperCase(), province, district, address, email, phone, isActive, ...parsedBranding } });
    if (parsedLogoData) {
      try {
        const logo = await uploadSchoolLogo(school.id, parsedLogoData);
        const updated = await prisma.school.update({ where: { id: school.id }, data: { logoUrl: logo.url, logoPath: logo.path } });
        await writeAudit(req.user!.userId, 'SCHOOL_LOGO_UPLOADED', 'School', school.id);
        await writeAudit(req.user!.userId, 'SCHOOL_CREATED', 'School', school.id, { name: updated.name, code: updated.code });
        res.status(201).json({ success: true, data: updated });
        return;
      } catch (error) {
        await prisma.school.delete({ where: { id: school.id } });
        throw error;
      }
    }
    await writeAudit(req.user!.userId, 'SCHOOL_CREATED', 'School', school.id, { name: school.name, code: school.code });
    res.status(201).json({ success: true, data: school });
  } catch (error) { next(error); }
});

systemAdminRoutes.get('/schools/:id/branding', async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, logoUrl: true, logoPath: true, primaryColor: true, secondaryColor: true, backgroundColor: true, motto: true } });
    if (!school) { next(new NotFoundError('School not found')); return; }
    res.json({ success: true, data: { schoolId: school.id, schoolName: school.name, logoUrl: school.logoUrl, primaryColor: school.primaryColor, secondaryColor: school.secondaryColor, backgroundColor: school.backgroundColor, motto: school.motto } });
  } catch (error) { next(error); }
});

systemAdminRoutes.patch('/schools/:id/branding', async (req, res, next) => {
  try {
    const branding = brandingInput.parse(req.body);
    const school = await prisma.school.update({ where: { id: req.params.id }, data: branding, select: { id: true, name: true, logoUrl: true, primaryColor: true, secondaryColor: true, backgroundColor: true, motto: true } });
    await writeAudit(req.user!.userId, 'SCHOOL_BRANDING_UPDATED', 'School', school.id, branding);
    res.json({ success: true, data: { schoolId: school.id, schoolName: school.name, logoUrl: school.logoUrl, primaryColor: school.primaryColor, secondaryColor: school.secondaryColor, backgroundColor: school.backgroundColor, motto: school.motto } });
  } catch (error) { next(error); }
});

systemAdminRoutes.post('/schools/:id/branding/logo', async (req, res, next) => {
  try {
    const logoData = z.string().min(1).parse(req.body.logoData);
    const school = await prisma.school.findUnique({ where: { id: req.params.id }, select: { id: true, logoPath: true } });
    if (!school) { next(new NotFoundError('School not found')); return; }
    const logo = await uploadSchoolLogo(school.id, logoData);
    try {
      const updated = await prisma.school.update({ where: { id: school.id }, data: { logoUrl: logo.url, logoPath: logo.path }, select: { id: true, logoUrl: true } });
      if (school.logoPath) await removeSchoolLogo(school.logoPath);
      await writeAudit(req.user!.userId, 'SCHOOL_LOGO_UPLOADED', 'School', school.id);
      res.json({ success: true, data: updated });
    } catch (error) {
      await removeSchoolLogo(logo.path);
      throw error;
    }
  } catch (error) { next(error); }
});

systemAdminRoutes.delete('/schools/:id/branding/logo', async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.params.id }, select: { id: true, logoPath: true } });
    if (!school) { next(new NotFoundError('School not found')); return; }
    await prisma.school.update({ where: { id: school.id }, data: { logoUrl: null, logoPath: null } });
    if (school.logoPath) await removeSchoolLogo(school.logoPath);
    await writeAudit(req.user!.userId, 'SCHOOL_LOGO_REMOVED', 'School', school.id);
    res.json({ success: true, data: { schoolId: school.id, logoUrl: null } });
  } catch (error) { next(error); }
});

systemAdminRoutes.get('/schools/:id', async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        users: { where: { role: 'school_admin' }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, emailVerified: true } },
        _count: { select: { users: true, students: true, teachers: true, classes: true } },
      },
    });
    if (!school) { next(new NotFoundError('School not found')); return; }
    res.json({ success: true, data: school });
  } catch (error) { next(error); }
});

systemAdminRoutes.patch('/schools/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'code', 'province', 'district', 'address', 'email', 'phone', 'isActive'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (typeof changes.code === 'string') changes.code = changes.code.toUpperCase();
    const school = await prisma.school.update({ where: { id: req.params.id }, data: changes, include: { _count: { select: { users: true, students: true, teachers: true } } } });
    await writeAudit(req.user!.userId, changes.isActive === undefined ? 'SCHOOL_UPDATED' : (changes.isActive ? 'SCHOOL_ACTIVATED' : 'SCHOOL_DEACTIVATED'), 'School', school.id, changes);
    res.json({ success: true, data: school });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') { next(new NotFoundError('School not found')); return; }
    next(error);
  }
});

systemAdminRoutes.get('/audit-logs', async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { email: true, role: true } }, school: { select: { name: true, code: true } } } });
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
});
