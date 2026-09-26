import { Request } from 'express';
import { ForbiddenError, UnauthorizedError, ValidationError } from './errors';

export const schoolScope = (req: Request): string => {
  if (req.user?.role === 'super_admin') {
    const requested = req.query.schoolId || req.body?.schoolId;
    if (typeof requested === 'string' && requested) return requested;
    throw new ValidationError('schoolId is required for system-wide operations');
  }
  if (!req.user?.schoolId) throw new UnauthorizedError('School context is required');
  return req.user.schoolId;
};

export const assertSchool = (req: Request, schoolId: string): void => {
  if (req.user?.role !== 'super_admin' && req.user?.schoolId !== schoolId) {
    throw new ForbiddenError('You are not authorized to access this school');
  }
};

export const pagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const parseDate = (value: unknown, field: string): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} must be a valid date`);
  return date;
};
