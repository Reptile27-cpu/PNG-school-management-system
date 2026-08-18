import { Router } from 'express';
export const notificationRoutes = Router();
notificationRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
notificationRoutes.patch('/:id/read', (_, res) => res.json({ success: true, data: {} }));
notificationRoutes.post('/send', (_, res) => res.json({ success: true, data: {} }));

