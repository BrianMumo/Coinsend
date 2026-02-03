import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';

export interface UserPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please login.', 401);
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token. Please login again.', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired. Please login again.', 401));
    } else {
      next(error);
    }
  }
};
