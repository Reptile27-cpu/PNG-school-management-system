import { Router } from 'express';
export const teacherRoutes = Router();
teacherRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
teacherRoutes.post('/', (_, res) => res.json({ success: true, data: {} }));
teacherRoutes.get('/:id', (_, res) => res.json({ success: true, data: {} }));
teacherRoutes.patch('/:id', (_, res) => res.json({ success: true, data: {} }));

