import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { pagination, schoolScope } from '../../utils/route-helpers';
import { NotFoundError } from '../../utils/errors';

export const schoolRoutes = Router();
schoolRoutes.use(authenticate);
const schoolInput = z.object({ name: z.string().min(1).max(255), code: z.string().min(1).max(20), address: z.string().max(5000).optional(), province: z.string().max(100).optional(), district: z.string().max(100).optional(), phone: z.string().max(50).optional(), email: z.string().email().optional(), website: z.string().url().optional(), isActive: z.boolean().optional() });

schoolRoutes.get('/:id/branding', authorize('super_admin', 'school_admin', 'teacher', 'student', 'parent'), async (req, res, next) => { try { const school = await prisma.school.findFirst({ where: { id: req.params.id, ...(req.user!.role === 'super_admin' ? {} : { id: schoolScope(req) }) }, select: { id: true, name: true, logoUrl: true, primaryColor: true, secondaryColor: true, backgroundColor: true, motto: true } }); if (!school) throw new NotFoundError('School not found'); res.json({ success: true, data: { schoolId: school.id, schoolName: school.name, logoUrl: school.logoUrl, primaryColor: school.primaryColor, secondaryColor: school.secondaryColor, backgroundColor: school.backgroundColor, motto: school.motto } }); } catch (error) { next(error); } });

schoolRoutes.get('/', authorize('super_admin', 'school_admin'), async (req, res, next) => { try { const scope = req.user!.role === 'super_admin' ? {} : { id: schoolScope(req) }; const { page, pageSize, skip, take } = pagination(req); const [data, total] = await prisma.$transaction([prisma.school.findMany({ where: scope, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { users: true, students: true, teachers: true } } } }), prisma.school.count({ where: scope })]); res.json({ success: true, data, meta: { page, pageSize, total } }); } catch (error) { next(error); } });

schoolRoutes.post('/', authorize('super_admin'), async (req, res, next) => { try { const input = schoolInput.parse(req.body); const school = await prisma.school.create({ data: { id: uuidv4(), ...input, code: input.code.toUpperCase() } }); res.status(201).json({ success: true, data: school }); } catch (error) { next(error); } });

schoolRoutes.get('/:id', authorize('super_admin', 'school_admin'), async (req, res, next) => { try { const data = await prisma.school.findFirst({ where: { id: req.params.id, ...(req.user!.role === 'super_admin' ? {} : { id: schoolScope(req) }) }, include: { _count: { select: { users: true, students: true, teachers: true, classes: true } } } }); if (!data) throw new NotFoundError('School not found'); res.json({ success: true, data }); } catch (error) { next(error); } });

schoolRoutes.patch('/:id', authorize('super_admin'), async (req, res, next) => { try { const input = schoolInput.partial().parse(req.body); const existing = await prisma.school.findUnique({ where: { id: req.params.id } }); if (!existing) throw new NotFoundError('School not found'); const data = await prisma.school.update({ where: { id: existing.id }, data: { ...input, code: input.code?.toUpperCase() } }); res.json({ success: true, data }); } catch (error) { next(error); } });
