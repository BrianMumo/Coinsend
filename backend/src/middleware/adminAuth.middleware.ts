import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { AdminRole } from '@prisma/client';

export interface AdminPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

export interface AdminRequest extends Request {
  admin?: AdminPayload;
}

export const authenticateAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please login.', 401);
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, config.jwt.adminSecret) as AdminPayload;
    req.admin = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid admin token. Please login again.', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Admin token expired. Please login again.', 401));
    } else {
      next(error);
    }
  }
};

// Role-based access control
export const requireRole = (...roles: AdminRole[]) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.admin.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
