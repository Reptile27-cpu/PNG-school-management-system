import { Router } from 'express';
export const attendanceRoutes = Router();
attendanceRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
attendanceRoutes.post('/batch', (_, res) => res.json({ success: true, data: {} }));
attendanceRoutes.get('/student/:id', (_, res) => res.json({ success: true, data: {} }));
attendanceRoutes.get('/reports/monthly', (_, res) => res.json({ success: true, data: {} }));

