import { Router } from 'express';

export const studentRoutes = Router();

studentRoutes.get('/', (_req, res) => {
  res.json({ success: true, data: { message: 'Students list' } });
});

studentRoutes.post('/', (_req, res) => {
  res.json({ success: true, data: { message: 'Student created' } });
});

studentRoutes.get('/:id', (_req, res) => {
  res.json({ success: true, data: { message: 'Student details' } });
});

studentRoutes.patch('/:id', (_req, res) => {
  res.json({ success: true, data: { message: 'Student updated' } });
});

studentRoutes.delete('/:id', (_req, res) => {
  res.json({ success: true, data: { message: 'Student deleted' } });
});

