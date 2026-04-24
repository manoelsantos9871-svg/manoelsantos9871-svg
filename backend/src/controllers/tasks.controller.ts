import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TaskStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { tasksService } from '../services/tasks.service';
import { sendSuccess, sendCreated } from '../utils/response';

const createTaskSchema = z.object({
  demandId: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
});

const logTimeSchema = z.object({
  minutes: z.number().positive(),
  description: z.string().optional(),
  startedAt: z.string().transform(v => new Date(v)),
});

export const tasksController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await tasksService.findAll(req.query as Record<string, string>);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await tasksService.findById(req.params.id);
      sendSuccess(res, task);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createTaskSchema.parse(req.body);
      const task = await tasksService.create(data);
      sendCreated(res, task);
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createTaskSchema.omit({ demandId: true }).partial().parse(req.body);
      const task = await tasksService.update(req.params.id, data);
      sendSuccess(res, task);
    } catch (err) { next(err); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, reason } = z.object({
        status: z.nativeEnum(TaskStatus),
        reason: z.string().optional(),
      }).parse(req.body);
      const task = await tasksService.updateStatus(req.params.id, status, req.user!.userId, reason);
      sendSuccess(res, task);
    } catch (err) { next(err); }
  },

  async logTime(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { minutes, description, startedAt } = logTimeSchema.parse(req.body);
      await tasksService.logTime(req.params.id, req.user!.userId, minutes, description || '', startedAt);
      sendSuccess(res, null, 200, 'Tempo registrado');
    } catch (err) { next(err); }
  },

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const comment = await tasksService.addComment(req.params.id, content, req.user!.userId);
      sendCreated(res, comment);
    } catch (err) { next(err); }
  },
};
