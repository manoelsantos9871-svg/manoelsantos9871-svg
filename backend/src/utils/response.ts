import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): Response {
  const response: ApiResponse<T> = { success: true, data, message };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, 201, message);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(res: Response, message: string, statusCode = 500, errors?: Record<string, string[]>): Response {
  const response: ApiResponse = { success: false, message, errors };
  return res.status(statusCode).json(response);
}

export function sendPaginated<T>(res: Response, result: PaginatedResult<T>): Response {
  return res.status(200).json({ success: true, ...result });
}
