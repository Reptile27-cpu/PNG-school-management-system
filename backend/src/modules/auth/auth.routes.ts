import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from './auth.validation';

export const authRoutes = Router();

// POST /api/v1/auth/login
authRoutes.post('/login', validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

// POST /api/v1/auth/register
authRoutes.post('/register', validate(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

// POST /api/v1/auth/refresh
authRoutes.post(
  '/refresh',
  validate(refreshTokenSchema),
  (req, res, next) => authController.refreshToken(req, res, next)
);

// POST /api/v1/auth/logout
authRoutes.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

// GET /api/v1/auth/profile
authRoutes.get('/profile', authenticate, (req, res, next) =>
  authController.getProfile(req, res, next)
);

