import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';

export const userRoutes = Router();

userRoutes.use(authenticate, authorize('super_admin', 'school_admin'));

userRoutes.get('/', async (req, res, next) => {
	try {
		const isSuper = req.user!.role === 'super_admin';
		const schoolId = isSuper
			? (typeof req.query.schoolId === 'string' ? req.query.schoolId : undefined)
			: req.user!.schoolId;

		const where = schoolId ? { schoolId } : {};

		const users = await prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				phone: true,
				role: true,
				schoolId: true,
				isActive: true,
				emailVerified: true,
				lastLogin: true,
				createdAt: true,
				school: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		res.json({ success: true, data: users });
	} catch (error) {
		next(error);
	}
});

userRoutes.patch('/:id', async (req, res, next) => {
	try {
		if (typeof req.body.isActive !== 'boolean') {
			throw new ValidationError('isActive must be a boolean');
		}

		const existing = await prisma.user.findUnique({
			where: { id: req.params.id },
			select: { id: true, role: true, schoolId: true },
		});

		if (!existing) {
			throw new NotFoundError('User not found');
		}

		// Non-super admins cannot modify super admins or users from another school
		if (req.user!.role !== 'super_admin') {
			if (existing.role === 'super_admin' || existing.schoolId !== req.user!.schoolId) {
				throw new ForbiddenError('You are not authorized to update this user');
			}
		}

		const user = await prisma.user.update({
			where: { id: req.params.id },
			data: {
				isActive: req.body.isActive,
				...(req.body.isActive ? {} : { refreshToken: null }),
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				schoolId: true,
				isActive: true,
				emailVerified: true,
				lastLogin: true,
			},
		});

		res.json({ success: true, data: user });
	} catch (error) {
		next(error);
	}
});


