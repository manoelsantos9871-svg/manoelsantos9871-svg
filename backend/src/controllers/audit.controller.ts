import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { auditService } from '../services/audit.service';

export const auditController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await auditService.findAll(req.query as Record<string, string>);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },
};
