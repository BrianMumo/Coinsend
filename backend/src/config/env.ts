import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  mpesa: {
    paybillNumber: process.env.MPESA_PAYBILL || '123456',
    businessName: process.env.MPESA_BUSINESS_NAME || 'Coinsend',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || process.env.MPESA_PAYBILL || '123456',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    environment: process.env.MPESA_ENV || 'sandbox', // 'sandbox' or 'production'
    // B2C Configuration
    initiatorName: process.env.MPESA_INITIATOR_NAME || '',
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
    resultUrl: process.env.MPESA_RESULT_URL || '',
    timeoutUrl: process.env.MPESA_TIMEOUT_URL || '',
    // Reversal Configuration (separate API operator)
    reversalInitiatorName: process.env.MPESA_REVERSAL_INITIATOR_NAME || '',
    reversalSecurityCredential: process.env.MPESA_REVERSAL_SECURITY_CREDENTIAL || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    adminSecret: process.env.JWT_ADMIN_SECRET || 'default-admin-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
