import { Router } from 'express';
export const reportRoutes = Router();
reportRoutes.get('/report-cards', (_, res) => res.json({ success: true, data: [] }));
reportRoutes.post('/report-cards/generate', (_, res) => res.json({ success: true, data: {} }));
reportRoutes.get('/analytics', (_, res) => res.json({ success: true, data: {} }));

