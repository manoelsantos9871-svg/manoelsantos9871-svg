import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated } from '../utils/response';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Units
router.get('/units', async (req, res, next) => {
  try {
    const units = await prisma.unit.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, units);
  } catch (err) { next(err); }
});

router.post('/units', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const data = z.object({ name: z.string(), code: z.string(), type: z.string().optional(), address: z.string().optional() }).parse(req.body);
    const unit = await prisma.unit.create({ data });
    sendCreated(res, unit);
  } catch (err) { next(err); }
});

router.put('/units/:id', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const data = z.object({ name: z.string().optional(), type: z.string().optional(), address: z.string().optional(), active: z.boolean().optional() }).parse(req.body);
    const unit = await prisma.unit.update({ where: { id: req.params.id }, data });
    sendSuccess(res, unit);
  } catch (err) { next(err); }
});

// Categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, categories);
  } catch (err) { next(err); }
});

router.post('/categories', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const data = z.object({ name: z.string(), type: z.string(), color: z.string().optional() }).parse(req.body);
    const category = await prisma.category.create({ data });
    sendCreated(res, category);
  } catch (err) { next(err); }
});

export default router;
