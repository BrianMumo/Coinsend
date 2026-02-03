import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types';

const prisma = new PrismaClient();

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new AppError('Email already registered', 400);
      }
      if (data.phone && existingUser.phone === data.phone) {
        throw new AppError('Phone number already registered', 400);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country || 'KE',
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        country: true,
        kycStatus: true,
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return { user, token };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        kycStatus: user.kycStatus,
      },
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
  }

  verifyToken(token: string) {
    return jwt.verify(token, config.jwt.secret);
  }
}

export const authService = new AuthService();
