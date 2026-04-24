import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { DemandType, Priority, DemandStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { demandsService } from '../services/demands.service';
import { sendSuccess, sendCreated } from '../utils/response';

const createDemandSchema = z.object({
  type: z.nativeEnum(DemandType),
  title: z.string().min(5),
  description: z.string().min(10),
  unitId: z.string(),
  categoryId: z.string().optional(),
  priority: z.nativeEnum(Priority),
  assignedToId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(DemandStatus),
  reason: z.string().optional(),
});

export const demandsController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await demandsService.findAll(req.query as Record<string, string>);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const demand = await demandsService.findById(req.params.id);
      sendSuccess(res, demand);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createDemandSchema.parse(req.body);
      const demand = await demandsService.create({ ...data, createdById: req.user!.userId });
      sendCreated(res, demand, 'Demanda criada com sucesso');
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createDemandSchema.partial().parse(req.body);
      const demand = await demandsService.update(req.params.id, data);
      sendSuccess(res, demand);
    } catch (err) { next(err); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, reason } = updateStatusSchema.parse(req.body);
      const demand = await demandsService.updateStatus(req.params.id, status, req.user!.userId, reason);
      sendSuccess(res, demand);
    } catch (err) { next(err); }
  },

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const comment = await demandsService.addComment(req.params.id, content, req.user!.userId);
      sendCreated(res, comment);
    } catch (err) { next(err); }
  },
};
