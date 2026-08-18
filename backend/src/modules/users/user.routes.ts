import { Router } from 'express';
export const userRoutes = Router();
userRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
userRoutes.get('/:id', (_, res) => res.json({ success: true, data: {} }));
userRoutes.patch('/:id', (_, res) => res.json({ success: true, data: {} }));

