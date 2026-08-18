import { Router } from 'express';
export const feeRoutes = Router();
feeRoutes.get('/', (_, res) => res.json({ success: true, data: [] }));
feeRoutes.post('/', (_, res) => res.json({ success: true, data: {} }));
feeRoutes.get('/student/:id', (_, res) => res.json({ success: true, data: [] }));
feeRoutes.post('/payment', (_, res) => res.json({ success: true, data: {} }));

