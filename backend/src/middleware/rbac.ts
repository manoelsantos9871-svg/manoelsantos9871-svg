import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { AuthorizationError } from '../utils/errors';

const roleHierarchy: Record<UserRole, number> = {
  ADMIN: 4,
  MANAGER: 3,
  TECHNICIAN: 2,
  REQUESTER: 1,
};

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError());
    }

    const userLevel = roleHierarchy[req.user.role];
    const hasPermission = roles.some((role) => userLevel >= roleHierarchy[role]);

    if (!hasPermission) {
      return next(new AuthorizationError());
    }

    next();
  };
}

export function authorizeOwnerOrRole(getOwnerId: (req: AuthRequest) => Promise<string | null>, ...roles: UserRole[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new AuthorizationError());

      const userLevel = roleHierarchy[req.user.role];
      const hasRole = roles.some((role) => userLevel >= roleHierarchy[role]);

      if (hasRole) return next();

      const ownerId = await getOwnerId(req);
      if (ownerId === req.user.userId) return next();

      next(new AuthorizationError());
    } catch (err) {
      next(err);
    }
  };
}
