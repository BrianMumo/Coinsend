import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@coinsend.com' },
    update: {},
    create: {
      email: 'admin@coinsend.com',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created admin:', admin.email);

  // Create exchange rates
  const rates = [
    { pair: 'USDT_KES', buyRate: 129.50, sellRate: 128.00, midRate: 128.75, spread: 0.0117 },
    { pair: 'USDC_KES', buyRate: 129.50, sellRate: 128.00, midRate: 128.75, spread: 0.0117 },
    { pair: 'KES_USD', buyRate: 0.0078, sellRate: 0.0076, midRate: 0.0077, spread: 0.0260 },
    { pair: 'KES_ZAR', buyRate: 0.14, sellRate: 0.13, midRate: 0.135, spread: 0.0741 },
    { pair: 'KES_UGX', buyRate: 28.50, sellRate: 27.50, midRate: 28.00, spread: 0.0357 },
    { pair: 'KES_TZS', buyRate: 19.50, sellRate: 18.50, midRate: 19.00, spread: 0.0526 },
    { pair: 'KES_NGN', buyRate: 11.50, sellRate: 10.50, midRate: 11.00, spread: 0.0909 },
    { pair: 'KES_CNY', buyRate: 0.055, sellRate: 0.052, midRate: 0.0535, spread: 0.0561 },
    { pair: 'KES_AED', buyRate: 0.028, sellRate: 0.027, midRate: 0.0275, spread: 0.0364 },
  ];

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: { pair: rate.pair },
      update: {
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        midRate: rate.midRate,
        spread: rate.spread,
      },
      create: {
        pair: rate.pair,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        midRate: rate.midRate,
        spread: rate.spread,
        minAmount: 10,
        maxAmount: 100000,
        isActive: true,
      },
    });
  }
  console.log('Created exchange rates');

  // Create liquidity balances
  const currencies = ['KES', 'USDT', 'USDC', 'USD', 'ZAR', 'UGX', 'TZS', 'NGN', 'CNY', 'AED'];
  for (const currency of currencies) {
    await prisma.liquidityBalance.upsert({
      where: { currency },
      update: {},
      create: {
        currency,
        balance: currency === 'KES' ? 5000000 : currency === 'USDT' || currency === 'USDC' ? 50000 : 10000,
      },
    });
  }
  console.log('Created liquidity balances');

  // Create sample deposit wallets
  const wallets = [
    { currency: 'USDT', network: 'TRON', address: 'TXYZabc123def456ghi789jkl012mno345', label: 'Main USDT TRC20' },
    { currency: 'USDT', network: 'ETHEREUM', address: '0x1234567890abcdef1234567890abcdef12345678', label: 'Main USDT ERC20' },
    { currency: 'USDT', network: 'BSC', address: '0xabcdef1234567890abcdef1234567890abcdef12', label: 'Main USDT BEP20' },
    { currency: 'USDC', network: 'ETHEREUM', address: '0x9876543210fedcba9876543210fedcba98765432', label: 'Main USDC ERC20' },
    { currency: 'USDC', network: 'POLYGON', address: '0xfedcba9876543210fedcba9876543210fedcba98', label: 'Main USDC Polygon' },
  ];

  for (const wallet of wallets) {
    await prisma.wallet.upsert({
      where: { address: wallet.address },
      update: {},
      create: {
        currency: wallet.currency as any,
        network: wallet.network as any,
        address: wallet.address,
        label: wallet.label,
        isActive: true,
      },
    });
  }
  console.log('Created deposit wallets');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
