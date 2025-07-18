// Withdrawal Integration for Edge Functions
// Sophisticated withdrawal integration with automatic payment conversion
import type { PaymentRecord, CreateWithdrawalRequest, CreateWithdrawalResponse } from './types.ts';

export interface WithdrawalRequest {
  customerEmail: string;
  fromCurrency: string;
  amount: number;
  withdrawCurrency?: string;
  externalPaymentId?: string;
  provider?: string;
  paymentMetadata?: Record<string, any>;
}

export interface WithdrawalResponse {
  success: boolean;
  withdrawalId?: string;
  message?: string;
  error?: string;
}

export class WithdrawalIntegration {
  private enabled: boolean;
  private baseUrl: string;
  private jwtToken: string;
  private timeout: number;

  constructor() {
    this.enabled = Deno.env.get('WITHDRAWAL_INTEGRATION_ENABLED') !== 'false';
    this.baseUrl = Deno.env.get('WITHDRAWAL_API_BASE_URL') || '';
    this.jwtToken = Deno.env.get('WITHDRAWAL_API_JWT_TOKEN') || '';
    this.timeout = parseInt(Deno.env.get('WITHDRAWAL_API_TIMEOUT') || '10000');
  }

  async handlePaymentCompletion(payment: PaymentRecord): Promise<void> {
    if (!this.enabled) {
      console.log('[WithdrawalIntegration] Integration disabled');
      return;
    }

    try {
      console.log('[WithdrawalIntegration] Processing payment completion:', payment.id);

      // Check if payment is eligible for withdrawal
      if (!this.isEligibleForWithdrawal(payment)) {
        console.log('[WithdrawalIntegration] Payment not eligible for withdrawal:', {
          paymentId: payment.id,
          chainId: payment.chain_id,
          currency: payment.currency,
          status: payment.status,
          provider: payment.provider_name,
        });
        return;
      }

      // Create withdrawal request
      const withdrawalRequest = this.buildWithdrawalRequest(payment);
      const withdrawalResponse = await this.createWithdrawalWithRetry(withdrawalRequest);

      // Save withdraw_id to the payment record
      if (withdrawalResponse && withdrawalResponse.data.withdraw_id) {
        const updated = await this.db.updatePaymentWithWithdrawId(
          payment.id,
          withdrawalResponse.data.withdraw_id
        );

        if (updated) {
          console.log('[WithdrawalIntegration] Successfully saved withdraw_id to payment:', {
            paymentId: payment.id,
            withdrawId: withdrawalResponse.data.withdraw_id,
            amount: payment.amount,
            currency: payment.currency,
            availableBalance: withdrawalResponse.data.available_balance,
          });
        } else {
          console.warn(
            '[WithdrawalIntegration] Failed to save withdraw_id to payment:',
            payment.id
          );
        }
      }

      console.log('[WithdrawalIntegration] Successfully triggered withdrawal for payment:', {
        paymentId: payment.id,
        withdrawId: withdrawalResponse?.data.withdraw_id,
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error) {
      console.error('[WithdrawalIntegration] Failed to trigger withdrawal:', {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we don't want to fail the webhook
      // Log the error and continue
    }
  }

  private isEligibleForWithdrawal(payment: PaymentRecord): boolean {
    return (
      payment.status === 'payment_completed' &&
      payment.chain_id === '10001' && // Stellar chain ID
      payment.currency === 'USDC' &&
      payment.provider_name === 'aqua' &&
      parseFloat(payment.amount) > 0
    );
  }

  private buildWithdrawalRequest(payment: PaymentRecord): CreateWithdrawalRequest {
    // Convert amount from string to number
    // For USDC, typically stored with 6 decimal places
    const amountUnits = parseFloat(payment.amount);

    // Convert from base units to human-readable amount
    // Assuming amount is stored in base units (e.g., 1000000 = 1 USDC)
    const humanAmount = amountUnits / Math.pow(10, 6);

    return {
      chain: 'base', // Target chain for withdrawal (USDC Stellar → USDC Base)
      token: 'USDC',
      amount: humanAmount,
    };
  }

  private async createWithdrawalWithRetry(
    request: CreateWithdrawalRequest,
    maxRetries: number = 3
  ): Promise<CreateWithdrawalResponse | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.createWithdrawal(request);

        console.log('[WithdrawalIntegration] Withdrawal created successfully:', {
          withdrawId: response.data.withdraw_id,
          status: response.data.status,
          attempt,
        });

        return response; // Success - return the response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.warn('[WithdrawalIntegration] Withdrawal attempt failed:', {
          attempt,
          maxRetries,
          error: errorMessage,
        });

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to create withdrawal after ${maxRetries} attempts: ${errorMessage}`
          );
        }

        // Exponential backoff delay
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log('[WithdrawalIntegration] Retrying in', delay, 'ms');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript requires it
    return null;
  }

  private async createWithdrawal(
    request: CreateWithdrawalRequest
  ): Promise<CreateWithdrawalResponse> {
    console.log('[WithdrawalIntegration] Creating withdrawal:', request);

    const response = await fetch(`${this.baseUrl}/functions/v1/withdrawals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WithdrawalIntegration] API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Withdrawal API Error [${response.status}]: ${errorText}`);
    }

    const responseText = await response.text();
    if (!responseText) {
      throw new Error('Empty response from Withdrawal API');
    }

    const result = JSON.parse(responseText);
    console.log('[WithdrawalIntegration] Withdrawal created:', result.data?.withdraw_id);

    return result;
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    if (!this.enabled) {
      return {
        status: 'disabled',
        details: { reason: 'Integration disabled via environment variable' },
      };
    }

    try {
      // Try to make a simple request to check if API is available
      const response = await fetch(`${this.baseUrl}/functions/v1/withdrawals`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const isHealthy = response.ok;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          withdrawalApi: isHealthy ? 'connected' : 'connection_failed',
          enabled: this.enabled,
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          enabled: this.enabled,
        },
      };
    }
  }

  getSupportedConversions(): Array<{
    source: { chain: string; token: string };
    target: { chain: string; token: string };
    enabled: boolean;
  }> {
    return [
      {
        source: { chain: 'stellar', token: 'USDC' },
        target: { chain: 'base', token: 'USDC' },
        enabled: this.enabled,
      },
    ];
  }
}
