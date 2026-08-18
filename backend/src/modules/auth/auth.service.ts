import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors';
import { LoginInput, RegisterInput } from './auth.validation';
import logger from '../../utils/logger';

// ==================== Token Generation ====================

const generateAccessToken = (payload: {
  userId: string;
  schoolId: string | null;
  role: string;
  email: string;
}): string => {
  const secret: jwt.Secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
};

const generateRefreshToken = (payload: {
  userId: string;
  schoolId: string | null;
  role: string;
  email: string;
}): string => {
  const secret: jwt.Secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
};

const generateTokens = (user: {
  id: string;
  schoolId: string | null;
  role: string;
  email: string;
}) => {
  const payload = {
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// ==================== Auth Service ====================

export class AuthService {
  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        isActive: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Update last login and refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        refreshToken: tokens.refreshToken,
      },
    });

    // Log the login
    logger.info(`User ${user.email} logged in successfully`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async register(input: RegisterInput) {
    const { email, password, firstName, lastName, phone, role, schoolId } =
      input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        schoolId: schoolId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // If role is parent, create parent record
    if (role === 'parent') {
      await prisma.parent.create({
        data: {
          id: uuidv4(),
          userId: user.id,
        },
      });
    }

    // If role is student, we expect a schoolId and additional setup
    if (role === 'student' && schoolId) {
      // Student registration typically handled by admin
      logger.info(`Student account created for ${email}`);
    }

    logger.info(`User ${email} registered successfully as ${role}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
      const decoded = jwt.verify(refreshToken, secret) as { userId: string };

      // Verify refresh token exists in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          schoolId: true,
          refreshToken: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Generate new tokens (rotation)
      const tokens = generateTokens(user);

      // Update refresh token in database
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    logger.info(`User ${userId} logged out`);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
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
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();

