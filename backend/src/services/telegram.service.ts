import axios from 'axios';
import { config } from '../config/env';

interface TelegramMessage {
  type: 'SIGNUP' | 'LOGIN' | 'DEPOSIT' | 'MPESA_DEPOSIT' | 'WITHDRAWAL' | 'WITHDRAWAL_COMPLETE' | 'WITHDRAWAL_FAILED';
  data: Record<string, unknown>;
}

class TelegramService {
  private get botToken(): string {
    return config.telegram.botToken;
  }

  private get chatId(): string {
    return config.telegram.chatId;
  }

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  private isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  private formatMessage(notification: TelegramMessage): string {
    const { type, data } = notification;
    const timestamp = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

    switch (type) {
      case 'SIGNUP':
        return `
🆕 *NEW USER SIGNUP*
━━━━━━━━━━━━━━━
👤 Name: ${data.firstName || 'N/A'} ${data.lastName || ''}
📧 Email: ${data.email}
📱 Phone: ${data.phone || 'N/A'}
🌍 Country: ${data.country || 'KE'}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'LOGIN':
        return `
🔐 *USER LOGIN*
━━━━━━━━━━━━━━━
👤 Name: ${data.firstName || 'N/A'} ${data.lastName || ''}
📧 Email: ${data.email}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'DEPOSIT':
        return `
💰 *USDT DEPOSIT*
━━━━━━━━━━━━━━━
👤 User: ${data.email}
💵 Amount: $${data.usdtAmount} USDT
🔗 TX Hash: \`${data.txHash}\`
📊 New Balance: $${data.newBalance} USDT
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'MPESA_DEPOSIT':
        return `
🟢 *M-PESA PAYBILL DEPOSIT*
━━━━━━━━━━━━━━━
💵 Amount: KES ${data.amount}
👤 From: ${data.payerName || 'N/A'}
📱 Phone: ${data.phoneNumber || 'N/A'}
🧾 Receipt: ${data.mpesaReceipt}
🏷️ Account Ref: ${data.billRefNumber || '-'}
💰 Paybill Balance: KES ${data.orgBalance ?? 'N/A'}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'WITHDRAWAL':
        return `
📤 *KES WITHDRAWAL REQUEST*
━━━━━━━━━━━━━━━
👤 User: ${data.email}
💵 USDT Amount: $${data.usdtAmount}
💰 KES Amount: KES ${data.kesAmount}
📱 Phone: ${data.phoneNumber}
📈 Rate: ${data.rate}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'WITHDRAWAL_COMPLETE':
        return `
✅ *WITHDRAWAL COMPLETED*
━━━━━━━━━━━━━━━
👤 User: ${data.email}
💰 Amount: KES ${data.kesAmount}
📱 Phone: ${data.phoneNumber}
🧾 M-Pesa Receipt: ${data.mpesaReceipt || 'N/A'}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      case 'WITHDRAWAL_FAILED':
        return `
❌ *WITHDRAWAL FAILED*
━━━━━━━━━━━━━━━
👤 User: ${data.email}
💰 Amount: KES ${data.kesAmount}
📱 Phone: ${data.phoneNumber}
⚠️ Reason: ${data.reason || 'Unknown'}
💵 USDT Refunded: $${data.usdtRefunded}
🕐 Time: ${timestamp}
━━━━━━━━━━━━━━━`;

      default:
        return `📢 Coinsend Notification: ${JSON.stringify(data)}`;
    }
  }

  async sendNotification(notification: TelegramMessage): Promise<void> {
    if (!this.isConfigured()) {
      console.log('[Telegram] Bot not configured, skipping notification:', notification.type);
      return;
    }

    try {
      const message = this.formatMessage(notification);

      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });

      console.log(`[Telegram] Notification sent: ${notification.type}`);
    } catch (error) {
      console.error('[Telegram] Failed to send notification:', error);
      // Don't throw - we don't want to break the main flow if Telegram fails
    }
  }

  // Convenience methods
  async notifySignup(data: { email: string; firstName?: string; lastName?: string; phone?: string; country?: string }) {
    await this.sendNotification({ type: 'SIGNUP', data });
  }

  async notifyLogin(data: { email: string; firstName?: string; lastName?: string }) {
    await this.sendNotification({ type: 'LOGIN', data });
  }

  async notifyDeposit(data: { email: string; usdtAmount: number; txHash: string; newBalance: number }) {
    await this.sendNotification({ type: 'DEPOSIT', data });
  }

  async notifyMpesaDeposit(data: {
    amount: number;
    payerName?: string;
    phoneNumber?: string;
    mpesaReceipt: string;
    billRefNumber?: string;
    orgBalance?: number | null;
  }) {
    await this.sendNotification({ type: 'MPESA_DEPOSIT', data });
  }

  async notifyWithdrawal(data: { email: string; usdtAmount: number; kesAmount: number; phoneNumber: string; rate: number }) {
    await this.sendNotification({ type: 'WITHDRAWAL', data });
  }

  async notifyWithdrawalComplete(data: { email: string; kesAmount: number; phoneNumber: string; mpesaReceipt?: string }) {
    await this.sendNotification({ type: 'WITHDRAWAL_COMPLETE', data });
  }

  async notifyWithdrawalFailed(data: { email: string; kesAmount: number; phoneNumber: string; reason?: string; usdtRefunded: number }) {
    await this.sendNotification({ type: 'WITHDRAWAL_FAILED', data });
  }
}

export const telegramService = new TelegramService();
