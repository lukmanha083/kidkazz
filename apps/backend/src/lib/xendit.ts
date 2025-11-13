// Xendit API client for Cloudflare Workers
import type { Env } from '../index';

export interface XenditQRISRequest {
  external_id: string;
  type: 'DYNAMIC' | 'STATIC';
  callback_url: string;
  amount: number;
}

export interface XenditQRISResponse {
  id: string;
  external_id: string;
  amount: number;
  qr_string: string;
  callback_url: string;
  type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  created: string;
  updated: string;
}

export interface XenditVARequest {
  external_id: string;
  bank_code: 'BCA' | 'MANDIRI' | 'BNI' | 'BRI' | 'PERMATA' | 'CIMB';
  name: string;
  is_closed: boolean;
  expected_amount: number;
  expiration_date: string;
  is_single_use: boolean;
  callback_url: string;
}

export interface XenditVAResponse {
  id: string;
  external_id: string;
  bank_code: string;
  merchant_code: string;
  name: string;
  account_number: string;
  is_closed: boolean;
  expected_amount: number;
  expiration_date: string;
  is_single_use: boolean;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  created: string;
}

export interface XenditQRISWebhook {
  id: string;
  external_id: string;
  amount: number;
  qr_string: string;
  status: 'COMPLETED' | 'ACTIVE';
  created: string;
  updated: string;
}

export interface XenditVAWebhook {
  id: string;
  external_id: string;
  bank_code: string;
  account_number: string;
  amount: number;
  transaction_timestamp: string;
  payment_id: string;
  callback_virtual_account_id: string;
}

export class XenditClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, isProduction: boolean = false) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.xendit.co';
  }

  private getAuthHeader(): string {
    // Xendit uses Basic Auth with API key as username, no password
    return 'Basic ' + btoa(this.apiKey + ':');
  }

  async createQRIS(request: XenditQRISRequest): Promise<XenditQRISResponse> {
    const response = await fetch(`${this.baseUrl}/qr_codes`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Xendit QRIS Error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async createVirtualAccount(request: XenditVARequest): Promise<XenditVAResponse> {
    const response = await fetch(`${this.baseUrl}/callback_virtual_accounts`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Xendit VA Error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async getQRISStatus(qrId: string): Promise<XenditQRISResponse> {
    const response = await fetch(`${this.baseUrl}/qr_codes/${qrId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Xendit Get QRIS Error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async getVirtualAccountStatus(vaId: string): Promise<XenditVAResponse> {
    const response = await fetch(`${this.baseUrl}/callback_virtual_accounts/${vaId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Xendit Get VA Error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  // Verify webhook signature
  static verifyWebhook(callbackToken: string, expectedToken: string): boolean {
    return callbackToken === expectedToken;
  }
}

// Helper function to create Xendit client from environment
export function createXenditClient(env: Env): XenditClient {
  const apiKey = env.XENDIT_SECRET_KEY;
  const isProduction = env.ENVIRONMENT === 'production';

  if (!apiKey) {
    throw new Error('XENDIT_SECRET_KEY is not configured');
  }

  return new XenditClient(apiKey, isProduction);
}

// Helper to format IDR currency
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Convert USD to IDR (approximate, should use real exchange rate API)
export function convertUSDtoIDR(amountUSD: number, exchangeRate: number = 15700): number {
  return Math.round(amountUSD * exchangeRate);
}
