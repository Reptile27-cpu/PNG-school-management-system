import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../utils/errors';

/**
 * Tenant resolution middleware.
 * Extracts tenant (school) information from:
 * 1. JWT claims (authenticated requests)
 * 2. Subdomain (schoolname.png-sms.com)
 * 3. Header (X-Tenant-ID)
 */
export const resolveTenant = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Priority 1: From authenticated user's JWT
    if (req.user?.schoolId) {
      req.schoolId = req.user.schoolId;
      next();
      return;
    }

    // Priority 2: From X-Tenant-ID header
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      const school = await prisma.school.findUnique({
        where: { id: tenantHeader },
        select: { id: true, isActive: true },
      });

      if (school && school.isActive) {
        req.schoolId = school.id;
        next();
        return;
      }
    }

    // Priority 3: From subdomain
    const host = req.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        const school = await prisma.school.findFirst({
          where: { code: subdomain.toUpperCase(), isActive: true },
          select: { id: true },
        });

        if (school) {
          req.schoolId = school.id;
          next();
          return;
        }
      }
    }

    // If no tenant found and user is super admin, allow without school
    if (req.user?.role === 'super_admin') {
      next();
      return;
    }

    // For non-authenticated routes (login, register), continue without tenant
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure a tenant (school) is resolved.
 * Use on routes that require a school context.
 */
export const requireTenant = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.schoolId) {
    next(new UnauthorizedError('School context is required for this operation'));
    return;
  }
  next();
};

