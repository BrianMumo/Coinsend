import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CalculateRateRequest, CalculateRateResponse } from '../types';

const prisma = new PrismaClient();

export class RateService {
  async getAllRates() {
    const rates = await prisma.exchangeRate.findMany({
      where: { isActive: true },
      orderBy: { pair: 'asc' },
    });

    return rates;
  }

  // For admin panel - returns ALL rates including inactive
  async getAllRatesForAdmin() {
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { pair: 'asc' },
    });

    return rates;
  }

  async getRateByPair(pair: string) {
    const rate = await prisma.exchangeRate.findUnique({
      where: { pair: pair.toUpperCase() },
    });

    if (!rate) {
      throw new AppError(`Rate not found for pair: ${pair}`, 404);
    }

    if (!rate.isActive) {
      throw new AppError(`Rate for ${pair} is currently unavailable`, 400);
    }

    return rate;
  }

  async calculateRate(data: CalculateRateRequest): Promise<CalculateRateResponse> {
    const pair = `${data.sourceCurrency}_${data.destinationCurrency}`.toUpperCase();

    let rate = await prisma.exchangeRate.findUnique({
      where: { pair },
    });

    // Try reverse pair if not found
    if (!rate) {
      const reversePair = `${data.destinationCurrency}_${data.sourceCurrency}`.toUpperCase();
      rate = await prisma.exchangeRate.findUnique({
        where: { pair: reversePair },
      });

      if (rate) {
        // Invert the rate
        const invertedRate = {
          ...rate,
          buyRate: rate.sellRate,
          sellRate: rate.buyRate,
        };
        rate = invertedRate as any;
      }
    }

    if (!rate || !rate.isActive) {
      throw new AppError(`Exchange rate not available for ${data.sourceCurrency} to ${data.destinationCurrency}`, 400);
    }

    // Validate amount limits
    if (data.amount < Number(rate.minAmount)) {
      throw new AppError(`Minimum amount is ${rate.minAmount} ${data.sourceCurrency}`, 400);
    }

    if (data.amount > Number(rate.maxAmount)) {
      throw new AppError(`Maximum amount is ${rate.maxAmount} ${data.sourceCurrency}`, 400);
    }

    // Calculate based on direction
    const exchangeRate = data.direction === 'buy' ? Number(rate.buyRate) : Number(rate.sellRate);

    // Calculate fee (1% for simplicity)
    const feePercentage = 0.01;
    const fee = data.amount * feePercentage;

    // Calculate destination amount
    const amountAfterFee = data.amount - fee;
    const destinationAmount = amountAfterFee * exchangeRate;

    return {
      sourceCurrency: data.sourceCurrency,
      destinationCurrency: data.destinationCurrency,
      sourceAmount: data.amount,
      destinationAmount: Number(destinationAmount.toFixed(8)),
      exchangeRate,
      fee,
    };
  }

  async updateRate(rateId: string, data: { buyRate?: number; sellRate?: number; isActive?: boolean }, adminId: string) {
    const rate = await prisma.exchangeRate.findUnique({
      where: { id: rateId },
    });

    if (!rate) {
      throw new AppError('Rate not found', 404);
    }

    const midRate = data.buyRate && data.sellRate
      ? (data.buyRate + data.sellRate) / 2
      : Number(rate.midRate);

    const spread = data.buyRate && data.sellRate
      ? (data.buyRate - data.sellRate) / midRate
      : Number(rate.spread);

    const updatedRate = await prisma.exchangeRate.update({
      where: { id: rateId },
      data: {
        ...(data.buyRate !== undefined && { buyRate: data.buyRate }),
        ...(data.sellRate !== undefined && { sellRate: data.sellRate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        midRate,
        spread,
        lastUpdated: new Date(),
        updatedBy: adminId,
      },
    });

    return updatedRate;
  }

  async createRate(data: {
    pair: string;
    buyRate: number;
    sellRate: number;
    minAmount?: number;
    maxAmount?: number;
  }, adminId: string) {
    const existingRate = await prisma.exchangeRate.findUnique({
      where: { pair: data.pair.toUpperCase() },
    });

    if (existingRate) {
      throw new AppError(`Rate for pair ${data.pair} already exists`, 400);
    }

    const midRate = (data.buyRate + data.sellRate) / 2;
    const spread = (data.buyRate - data.sellRate) / midRate;

    const rate = await prisma.exchangeRate.create({
      data: {
        pair: data.pair.toUpperCase(),
        buyRate: data.buyRate,
        sellRate: data.sellRate,
        midRate,
        spread,
        minAmount: data.minAmount || 10,
        maxAmount: data.maxAmount || 100000,
        isActive: true,
        updatedBy: adminId,
      },
    });

    return rate;
  }

  async deleteRate(rateId: string) {
    const rate = await prisma.exchangeRate.findUnique({
      where: { id: rateId },
    });

    if (!rate) {
      throw new AppError('Rate not found', 404);
    }

    await prisma.exchangeRate.delete({
      where: { id: rateId },
    });

    return { success: true, deletedPair: rate.pair };
  }
}

export const rateService = new RateService();
