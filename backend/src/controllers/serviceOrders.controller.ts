import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { SOStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { serviceOrdersService } from '../services/serviceOrders.service';
import { sendSuccess, sendCreated } from '../utils/response';

const createSOSchema = z.object({
  demandId: z.string(),
  title: z.string().min(3),
  description: z.string().min(5),
  executorId: z.string().optional(),
  checklists: z.array(z.string()).optional(),
});

export const serviceOrdersController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await serviceOrdersService.findAll(req.query as Record<string, string>);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const so = await serviceOrdersService.findById(req.params.id);
      sendSuccess(res, so);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createSOSchema.parse(req.body);
      const so = await serviceOrdersService.create(data);
      sendCreated(res, so, 'Ordem de Serviço criada');
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createSOSchema.omit({ demandId: true, checklists: true }).partial().parse(req.body);
      const so = await serviceOrdersService.update(req.params.id, data);
      sendSuccess(res, so);
    } catch (err) { next(err); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = z.object({ status: z.nativeEnum(SOStatus) }).parse(req.body);
      const so = await serviceOrdersService.updateStatus(req.params.id, status);
      sendSuccess(res, so);
    } catch (err) { next(err); }
  },

  async updateChecklist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      const item = await serviceOrdersService.updateChecklist(
        req.params.id,
        req.params.checklistId,
        completed,
      );
      sendSuccess(res, item);
    } catch (err) { next(err); }
  },
};
