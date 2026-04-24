import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const mfaSchema = z.object({
  userId: z.string(),
  token: z.string().length(6),
});

export const authController = {
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await authService.login(email, password);
      sendSuccess(res, result, 200, 'Login realizado com sucesso');
    } catch (err) { next(err); }
  },

  async verifyMfa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, token } = mfaSchema.parse(req.body);
      const result = await authService.verifyMfa(userId, token);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body);
      if (refreshToken) await authService.logout(refreshToken);
      sendSuccess(res, null, 200, 'Logout realizado');
    } catch (err) { next(err); }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('../lib/prisma');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, name: true, email: true, role: true, sector: true, matricula: true, mfaEnabled: true, status: true },
      });
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async setupMfa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.setupMfa(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async enableMfa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = z.object({ token: z.string().length(6) }).parse(req.body);
      const result = await authService.enableMfa(req.user!.userId, token);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async disableMfa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.disableMfa(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }).parse(req.body);
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      sendSuccess(res, null, 200, 'Senha alterada com sucesso');
    } catch (err) { next(err); }
  },
};
