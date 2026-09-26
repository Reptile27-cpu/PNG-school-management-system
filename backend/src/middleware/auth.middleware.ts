import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { prisma } from '../config/database';

export interface JwtPayload {
  userId: string;
  schoolId: string | null;
  role: string;
  email: string;
}

const getJwtSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', fallback: string): string => {
  const secret = process.env[name];
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is not configured`);
  }
  return fallback;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      schoolId?: string | null;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret('JWT_SECRET', 'your-secret-key');

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        isActive: true,
        role: true,
        schoolId: true,
        email: true,
        school: { select: { isActive: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated');
    }

    if (user.role !== 'super_admin' && user.schoolId && !user.school?.isActive) {
      throw new ForbiddenError('This school is inactive');
    }

    req.user = {
      ...decoded,
      role: user.role,
      schoolId: user.schoolId,
      email: user.email,
    };
    req.schoolId = user.schoolId;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
      return;
    }

    next();
  };
};

export const requireAuth = authenticate;
export const requireRole = authorize;
export const requireSystemAdmin = authorize('super_admin');

export const requireSchoolAccess = (paramName = 'schoolId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    const requestedSchoolId = req.params[paramName] || req.body?.[paramName] || req.query[paramName];
    if (!req.user.schoolId || (requestedSchoolId && requestedSchoolId !== req.user.schoolId)) {
      next(new ForbiddenError('You are not authorized to access this school'));
      return;
    }

    req.schoolId = req.user.schoolId;
    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret('JWT_SECRET', 'your-secret-key');
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    req.schoolId = decoded.schoolId;
    next();
  } catch {
    // If token is invalid, continue without user
    next();
  }
};

