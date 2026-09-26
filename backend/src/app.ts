import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { schoolRoutes } from './modules/schools/school.routes';
import { studentRoutes } from './modules/students/student.routes';
import { teacherRoutes } from './modules/teachers/teacher.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { academicRoutes } from './modules/academics/academic.routes';
import { classRoutes } from './modules/classes/class.routes';
import { subjectRoutes } from './modules/subjects/subject.routes';
import { reportRoutes } from './modules/reports/report.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { feeRoutes } from './modules/fees/fee.routes';
import { userRoutes } from './modules/users/user.routes';
import { healthRouter } from './routes/health';
import { systemAdminRoutes } from './modules/system-admin/system-admin.routes';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ==================== Global Middleware ====================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' },
  },
});

app.use('/api/', limiter);

// ==================== Health Check ====================

app.use('/api/v1/health', healthRouter);

// ==================== API Routes ====================

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/system-admin`, systemAdminRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/schools`, schoolRoutes);
app.use(`${API_PREFIX}/students`, studentRoutes);
app.use(`${API_PREFIX}/teachers`, teacherRoutes);
app.use(`${API_PREFIX}/classes`, classRoutes);
app.use(`${API_PREFIX}/subjects`, subjectRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/academics`, academicRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/fees`, feeRoutes);

// ==================== 404 Handler ====================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found on this server.',
    },
  });
});

// ==================== Error Handler ====================

app.use(errorHandler);

export default app;

