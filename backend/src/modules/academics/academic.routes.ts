import { Router } from 'express';
export const academicRoutes = Router();
academicRoutes.get('/assessments', (_, res) => res.json({ success: true, data: [] }));
academicRoutes.post('/assessments', (_, res) => res.json({ success: true, data: {} }));
academicRoutes.get('/exams', (_, res) => res.json({ success: true, data: [] }));
academicRoutes.post('/exams', (_, res) => res.json({ success: true, data: {} }));
academicRoutes.get('/marks', (_, res) => res.json({ success: true, data: [] }));
academicRoutes.post('/marks', (_, res) => res.json({ success: true, data: {} }));
academicRoutes.get('/grade-boundaries', (_, res) => res.json({ success: true, data: [] }));

