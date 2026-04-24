import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export function auditLog(action: string, entityType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode < 400) {
        const entityId = body?.data?.id || req.params.id;
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              action,
              entityType,
              entityId,
              newValue: body?.data || null,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          })
          .catch((err: Error) => logger.error('Audit log error', { err }));
      }
      return originalJson(body);
    };

    next();
  };
}
