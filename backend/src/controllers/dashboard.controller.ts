import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const dashboardController = {
  async getOverview(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getOverview();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getDemandsByStatus(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getDemandsByStatus();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getDemandsByType(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getDemandsByType();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getDemandsByPriority(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getDemandsByPriority();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getVolumeByPeriod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(String(req.query.days || 30), 10);
      const data = await dashboardService.getVolumeByPeriod(days);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getTopTechnicians(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getTopTechnicians();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getAvgResolutionTime(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getAvgResolutionTime();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
