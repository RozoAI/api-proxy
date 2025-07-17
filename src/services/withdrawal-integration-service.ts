/**
 * Withdrawal Integration Service
 * Handles triggering external withdrawal API for eligible payments
 */

import {
  WithdrawalApiClient,
  CreateWithdrawalRequest,
  CreateWithdrawalResponse,
} from '../clients/withdrawal-api-client';
import { PaymentRecord, PaymentsRepository } from '../database/repositories/payments-repository';

export class WithdrawalIntegrationService {
  private withdrawalApiClient: WithdrawalApiClient;
  private paymentsRepository: PaymentsRepository;
  private enabled: boolean;

  constructor() {
    this.withdrawalApiClient = new WithdrawalApiClient();
    this.paymentsRepository = new PaymentsRepository();
    this.enabled = process.env.WITHDRAWAL_INTEGRATION_ENABLED !== 'false';
  }

  /**
   * Main method to handle payment completion and trigger withdrawal if eligible
   */
  async handlePaymentCompletion(payment: PaymentRecord): Promise<void> {
    if (!this.enabled) {
      console.log('[WithdrawalIntegration] Integration disabled via environment variable');
      return;
    }

    try {
      console.log('[WithdrawalIntegration] Processing payment completion:', payment.id);

      // Check if payment is eligible for withdrawal
      if (!this.isEligibleForWithdrawal(payment)) {
        console.log('[WithdrawalIntegration] Payment not eligible for withdrawal:', {
          paymentId: payment.id,
          chainId: payment.chainId,
          currency: payment.currency,
          status: payment.status,
          provider: payment.providerName,
        });
        return;
      }

      // Create withdrawal request
      const withdrawalRequest = this.buildWithdrawalRequest(payment);
      const withdrawalResponse = await this.createWithdrawalWithRetry(withdrawalRequest);

      // Save withdraw_id to the payment record
      if (withdrawalResponse && withdrawalResponse.data.withdraw_id) {
        const updated = await this.paymentsRepository.updatePaymentWithWithdrawId(
          payment.id,
          withdrawalResponse.data.withdraw_id
        );

        if (updated) {
          console.log('[WithdrawalIntegration] Successfully saved withdraw_id to payment:', {
            paymentId: payment.id,
            withdrawId: withdrawalResponse.data.withdraw_id,
            amount: payment.amount,
            currency: payment.currency,
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
    }
  }

  /**
   * Check if payment is eligible for withdrawal
   * Currently only supports USDC on Stellar → Base conversion
   */
  private isEligibleForWithdrawal(payment: PaymentRecord): boolean {
    return (
      payment.status === 'payment_completed' &&
      payment.chainId === '10001' && // Stellar chain ID
      (payment.currency === 'USDC' || payment.currency === 'USD') &&
      payment.providerName === 'aqua' &&
      parseFloat(payment.amount) > 0
    );
  }

  /**
   * Build withdrawal request for external API
   */
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

  /**
   * Create withdrawal with retry logic
   */
  private async createWithdrawalWithRetry(
    request: CreateWithdrawalRequest,
    maxRetries: number = 3
  ): Promise<CreateWithdrawalResponse | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.withdrawalApiClient.createWithdrawal(request);

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

  /**
   * Get supported withdrawal conversions
   */
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
