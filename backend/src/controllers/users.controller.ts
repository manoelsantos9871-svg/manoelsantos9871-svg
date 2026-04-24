import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { usersService } from '../services/users.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

const createUserSchema = z.object({
  name: z.string().min(2),
  matricula: z.string().min(3),
  role: z.nativeEnum(UserRole),
  sector: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateUserSchema = createUserSchema.omit({ password: true }).partial();

export const usersController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.findAll(req.query as Record<string, string>);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await usersService.findById(req.params.id);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await usersService.create(data);
      sendCreated(res, user, 'Usuário criado com sucesso');
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await usersService.update(req.params.id, data);
      sendSuccess(res, user, 200, 'Usuário atualizado');
    } catch (err) { next(err); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = z.object({ status: z.nativeEnum(UserStatus) }).parse(req.body);
      const user = await usersService.updateStatus(req.params.id, status);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
      await usersService.resetPassword(req.params.id, password);
      sendNoContent(res);
    } catch (err) { next(err); }
  },

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await usersService.getStats();
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  },
};
