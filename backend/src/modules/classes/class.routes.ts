import { Router } from 'express';
export const classRoutes = Router();
classRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
classRoutes.post('/', (_, res) => res.json({ success: true, data: {} }));
classRoutes.get('/:id', (_, res) => res.json({ success: true, data: {} }));
classRoutes.patch('/:id', (_, res) => res.json({ success: true, data: {} }));

