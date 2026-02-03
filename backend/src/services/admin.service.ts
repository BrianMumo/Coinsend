import { PrismaClient, OrderStatus, AdminRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { AdminLoginRequest, AdminAuthResponse, UpdateOrderStatusRequest, PaginationParams } from '../types';

const prisma = new PrismaClient();

export class AdminService {
  // Authentication
  async login(data: AdminLoginRequest): Promise<AdminAuthResponse> {
    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!admin.isActive) {
      throw new AppError('Admin account is deactivated', 403);
    }

    const isValidPassword = await bcrypt.compare(data.password, admin.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateAdminToken(admin.id, admin.email, admin.role);

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
      token,
    };
  }

  async getCurrentAdmin(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    return admin;
  }

  // Dashboard
  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      completedOrders,
      todayOrders,
      todayVolume,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          status: 'COMPLETED',
        },
        _sum: {
          sourceAmount: true,
        },
      }),
    ]);

    return {
      users: { total: totalUsers },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        paid: paidOrders,
        processing: processingOrders,
        completed: completedOrders,
        today: todayOrders,
      },
      volume: {
        today: todayVolume._sum.sourceAmount || 0,
      },
    };
  }

  // Orders
  async getAllOrders(params: PaginationParams & { status?: OrderStatus; orderType?: string; search?: string }) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, orderType, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(orderId: string, data: UpdateOrderStatusRequest, adminId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Validate status transition
    this.validateStatusTransition(order.status, data.status);

    const updateData: any = {
      status: data.status,
      processedById: adminId,
      processingNotes: data.processingNotes,
    };

    if (data.payoutReference) {
      updateData.payoutReference = data.payoutReference;
    }

    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'Order',
        entityId: orderId,
        details: {
          previousStatus: order.status,
          newStatus: data.status,
          notes: data.processingNotes,
        },
      },
    });

    return updatedOrder;
  }

  // Users
  async getAllUsers(params: PaginationParams & { kycStatus?: string; search?: string }) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', kycStatus, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          country: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
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
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  // Liquidity
  async getLiquidityBalances() {
    const balances = await prisma.liquidityBalance.findMany({
      orderBy: { currency: 'asc' },
    });
    return balances;
  }

  async updateLiquidityBalance(currency: string, balance: number, adminId: string, notes?: string) {
    const liquidityBalance = await prisma.liquidityBalance.upsert({
      where: { currency: currency.toUpperCase() },
      update: {
        balance,
        lastUpdated: new Date(),
        updatedBy: adminId,
        notes,
      },
      create: {
        currency: currency.toUpperCase(),
        balance,
        updatedBy: adminId,
        notes,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_LIQUIDITY',
        entityType: 'LiquidityBalance',
        entityId: liquidityBalance.id,
        details: { currency, balance, notes },
      },
    });

    return liquidityBalance;
  }

  // Wallets
  async getWallets() {
    const wallets = await prisma.wallet.findMany({
      orderBy: [{ currency: 'asc' }, { network: 'asc' }],
    });
    return wallets;
  }

  async createWallet(data: { currency: string; network: string; address: string; label?: string }) {
    const existingWallet = await prisma.wallet.findUnique({
      where: { address: data.address },
    });

    if (existingWallet) {
      throw new AppError('Wallet address already exists', 400);
    }

    const wallet = await prisma.wallet.create({
      data: {
        currency: data.currency as any,
        network: data.network as any,
        address: data.address,
        label: data.label,
        isActive: true,
      },
    });

    return wallet;
  }

  async updateWallet(walletId: string, data: { isActive?: boolean; label?: string }) {
    const wallet = await prisma.wallet.update({
      where: { id: walletId },
      data,
    });
    return wallet;
  }

  private generateAdminToken(adminId: string, email: string, role: AdminRole): string {
    return jwt.sign(
      { adminId, email, role },
      config.jwt.adminSecret,
      { expiresIn: config.jwt.adminExpiresIn } as jwt.SignOptions
    );
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['PAID', 'CANCELLED', 'EXPIRED'],
      PAID: ['PROCESSING', 'CANCELLED', 'FAILED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      COMPLETED: [],
      FAILED: [],
      CANCELLED: [],
      EXPIRED: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }
  }
}

export const adminService = new AdminService();
