import { Router } from 'express';
export const analyticsRoutes = Router();
analyticsRoutes.get('/dashboard', (_, res) => res.json({ success: true, data: {} }));
analyticsRoutes.get('/attendance-trends', (_, res) => res.json({ success: true, data: [] }));
analyticsRoutes.get('/grade-distribution', (_, res) => res.json({ success: true, data: {} }));
analyticsRoutes.get('/at-risk-students', (_, res) => res.json({ success: true, data: [] }));

