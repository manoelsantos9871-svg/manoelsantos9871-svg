import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { DemandType, Priority } from '@prisma/client';
import { AuthRequest } from '../types';
import { slaService } from '../services/sla.service';
import { sendSuccess } from '../utils/response';

const slaSchema = z.object({
  demandType: z.nativeEnum(DemandType),
  priority: z.nativeEnum(Priority),
  responseTime: z.number().positive(),
  resolutionTime: z.number().positive(),
});

export const slaController = {
  async findAll(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const configs = await slaService.findAll();
      sendSuccess(res, configs);
    } catch (err) { next(err); }
  },

  async upsert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { demandType, priority, responseTime, resolutionTime } = slaSchema.parse(req.body);
      const config = await slaService.upsert(demandType, priority, responseTime, resolutionTime);
      sendSuccess(res, config);
    } catch (err) { next(err); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await slaService.delete(req.params.id);
      sendSuccess(res, null, 200, 'Configuração removida');
    } catch (err) { next(err); }
  },

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await slaService.getSlaStats();
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  },
};
