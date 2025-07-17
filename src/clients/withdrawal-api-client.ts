/**
 * Withdrawal API Client
 * HTTP client for external withdrawal API service
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface CreateWithdrawalRequest {
  chain: 'stellar' | 'base' | 'solana';
  token: 'USDC';
  amount: number;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  data: {
    id: string;
    withdraw_id: string;
    chain: string;
    token: string;
    amount: string;
    status: 'NEW' | 'PENDING' | 'PAID' | 'FAILED';
    created_at: string;
  };
}

export interface GetWithdrawalsResponse {
  success: boolean;
  data: Array<{
    id: string;
    withdraw_id: string;
    user_id: string;
    chain: string;
    token: string;
    amount: string;
    status: 'NEW' | 'PENDING' | 'PAID' | 'FAILED';
    created_at: string;
    updated_at: string;
  }>;
}

export class WithdrawalApiClient {
  private baseUrl: string;
  private jwtToken: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.WITHDRAWAL_API_BASE_URL || '';
    this.jwtToken = process.env.WITHDRAWAL_API_JWT_TOKEN || '';
    this.timeout = parseInt(process.env.WITHDRAWAL_API_TIMEOUT || '10000');

    if (!this.baseUrl) {
      throw new Error('WITHDRAWAL_API_BASE_URL environment variable is required');
    }
    if (!this.jwtToken) {
      throw new Error('WITHDRAWAL_API_JWT_TOKEN environment variable is required');
    }
  }

  /**
   * Create a withdrawal request
   */
  async createWithdrawal(request: CreateWithdrawalRequest): Promise<CreateWithdrawalResponse> {
    try {
      console.log('[WithdrawalApiClient] Creating withdrawal:', request);

      const response = await this.makeRequest<CreateWithdrawalResponse>(
        'POST',
        '/functions/v1/withdrawals',
        request
      );

      console.log('[WithdrawalApiClient] Withdrawal created:', response.data.withdraw_id);
      return response;
    } catch (error) {
      console.error('[WithdrawalApiClient] Failed to create withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get withdrawals
   */
  async getWithdrawals(withdrawId?: string): Promise<GetWithdrawalsResponse> {
    try {
      const endpoint = withdrawId
        ? `/functions/v1/withdrawals?withdraw_id=${withdrawId}`
        : '/functions/v1/withdrawals';

      const response = await this.makeRequest<GetWithdrawalsResponse>('GET', endpoint);

      return response;
    } catch (error) {
      console.error('[WithdrawalApiClient] Failed to get withdrawals:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to withdrawal API
   */
  private async makeRequest<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: this.timeout,
      headers: {
        Authorization: `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    try {
      const response: AxiosResponse<T> = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        const statusCode = error.response?.status;

        console.error('[WithdrawalApiClient] API Error:', {
          status: statusCode,
          message: errorMessage,
          endpoint,
          method,
        });

        throw new Error(`Withdrawal API Error [${statusCode}]: ${errorMessage}`);
      }

      throw error;
    }
  }
}
