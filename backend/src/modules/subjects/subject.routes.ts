import { Router } from 'express';
export const subjectRoutes = Router();
subjectRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
subjectRoutes.post('/', (_, res) => res.json({ success: true, data: {} }));
subjectRoutes.get('/:id', (_, res) => res.json({ success: true, data: {} }));
subjectRoutes.patch('/:id', (_, res) => res.json({ success: true, data: {} }));

