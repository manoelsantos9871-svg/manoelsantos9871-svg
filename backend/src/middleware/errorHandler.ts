import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const key = e.path.join('.');
      if (!errors[key]) errors[key] = [];
      errors[key].push(e.message);
    });
    res.status(400).json({ success: false, message: 'Dados inválidos', errors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Registro já existe com esses dados' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Registro não encontrado' });
      return;
    }
  }

  logger.error('Unhandled error', { err, url: req.url, method: req.method });
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
}
