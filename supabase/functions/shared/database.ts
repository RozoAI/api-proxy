// Payment Database for Edge Functions
// Handles all database operations with Supabase integration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { PaymentRecord, PaymentRequest, PaymentResponse } from './types.ts';
import { safeMetadataSpread } from './utils.ts';

// Initialize Supabase client for Edge Functions
export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Payment database operations
export class PaymentDatabase {
  private supabase;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  async createPayment(
    paymentRequest: PaymentRequest,
    paymentResponse: PaymentResponse,
    providerName: string
  ): Promise<PaymentRecord> {
    // Validate amount is positive (matches database CHECK constraint)
    // Use payment amount (display.paymentValue) instead of withdrawal amount (destination.amountUnits)
    const amount = parseFloat(paymentRequest.display.paymentValue || paymentRequest.destination.amountUnits);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const paymentData = {
      amount: amount, // Use payment amount for database storage
      currency: paymentRequest.display.currency,
      status: paymentResponse.status,
      external_id: paymentResponse.id,
      provider_name: providerName,
      chain_id: paymentRequest.preferredChain, // Store preferred chain for routing
      provider_response: paymentResponse,
      metadata: {
        ...paymentRequest.metadata,
        preferred_chain: paymentRequest.preferredChain,
        preferred_token: paymentRequest.preferredToken,
        withdrawal_destination: {
          address: paymentRequest.destination.destinationAddress,
          chainId: paymentRequest.destination.chainId,
          tokenAddress: paymentRequest.destination.tokenAddress,
          tokenSymbol: paymentRequest.destination.tokenSymbol,
        },
      },
      original_request: paymentRequest,
      callback_url: paymentRequest.callbackUrl,
    };

    const { data, error } = await this.supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('[Database] Error creating payment:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    console.log('[Database] Payment created:', {
      id: data.id,
      external_id: data.external_id,
      preferred_chain: paymentRequest.preferredChain,
      preferred_token: paymentRequest.preferredToken,
      withdrawal_address: paymentRequest.destination.destinationAddress,
    });

    return data;
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    // First try to find by internal ID
    const { data: dataById, error: errorById } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (!errorById && dataById) {
      return dataById;
    }

    // If not found by internal ID, try to find by external_id
    const { data: dataByExternalId, error: errorByExternalId } = await this.supabase
      .from('payments')
      .select('*')
      .eq('external_id', id)
      .single();

    if (!errorByExternalId && dataByExternalId) {
      console.log('[Database] Found payment by external_id:', id);
      return dataByExternalId;
    }

    // Record not found in either field
    if (errorById?.code === 'PGRST116' || errorByExternalId?.code === 'PGRST116') {
      return null;
    }

    // Other errors
    const error = errorById || errorByExternalId;
    if (error) {
      console.error('[Database] Error getting payment by ID:', error);
      throw new Error(`Failed to get payment: ${error.message}`);
    }

    return null;
  }

  async getPaymentByExternalId(externalId: string): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Record not found
      }
      console.error('[Database] Error getting payment by external ID:', error);
      throw new Error(`Failed to get payment: ${error.message}`);
    }

    return data;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: string,
    providerResponse?: any
  ): Promise<boolean> {
    const updateData: any = {
      status,
      status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (providerResponse) {
      updateData.provider_response = providerResponse;
    }

    const { error } = await this.supabase
      .from('payments')
      .update(updateData)
      .eq('external_id', paymentId);

    if (error) {
      console.error('[Database] Error updating payment status:', error);
      return false;
    }

    console.log('[Database] Payment status updated:', {
      external_id: paymentId,
      status: status,
    });

    return true;
  }

  async updatePaymentWithWithdrawId(paymentId: string, withdrawId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('payments')
      .update({
        withdraw_id: withdrawId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) {
      console.error('[Database] Error updating payment with withdraw ID:', error);
      return false;
    }

    console.log('[Database] Payment updated with withdraw ID:', {
      payment_id: paymentId,
      withdraw_id: withdrawId,
    });

    return true;
  }

  async updatePaymentSourceDetails(
    paymentId: string,
    sourceAddress: string,
    sourceTxHash: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('payments')
      .update({
        source_address: sourceAddress,
        source_tx_hash: sourceTxHash,
        updated_at: new Date().toISOString(),
      })
      .eq('external_id', paymentId);

    if (error) {
      console.error('[Database] Error updating payment source details:', error);
      return false;
    }

    console.log('[Database] Payment updated with source details:', {
      external_id: paymentId,
      source_address: sourceAddress,
      source_tx_hash: sourceTxHash,
    });

    return true;
  }

  async updatePaymentWithdrawalTxHash(
    paymentId: string,
    withdrawalTxHash: string,
    withdrawId?: string
  ): Promise<boolean> {
    const updateData: any = {
      withdrawal_tx_hash: withdrawalTxHash,
      updated_at: new Date().toISOString(),
    };

    if (withdrawId) {
      updateData.withdraw_id = withdrawId;
    }

    const { error } = await this.supabase
      .from('payments')
      .update(updateData)
      .eq('external_id', paymentId);

    if (error) {
      console.error('[Database] Error updating payment withdrawal transaction hash:', error);
      return false;
    }

    console.log('[Database] Payment updated with withdrawal transaction hash:', {
      external_id: paymentId,
      withdrawal_tx_hash: withdrawalTxHash,
      withdraw_id: withdrawId,
    });

    return true;
  }

  async getPaymentsByStatus(status: string, olderThanMinutes?: number): Promise<PaymentRecord[]> {
    let query = this.supabase.from('payments').select('*').eq('status', status);

    if (olderThanMinutes) {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
      query = query.lt('status_updated_at', cutoffTime.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Database] Error getting payments by status:', error);
      throw new Error(`Failed to get payments: ${error.message}`);
    }

    return data || [];
  }

  convertToPaymentResponse(record: PaymentRecord): PaymentResponse {
    const originalRequest = record.original_request;
    const withdrawalDestination = record.metadata?.withdrawal_destination;

    return {
      id: record.external_id || record.id,
      status: record.status as any,
      createdAt: Math.floor(new Date(record.created_at).getTime() / 1000).toString(),
      display: originalRequest?.display || {
        intent: 'Payment',
        currency: record.currency,
      },
      source:
        record.source_address && record.source_tx_hash
          ? {
              payerAddress: record.source_address,
              txHash: record.source_tx_hash,
              chainId: record.chain_id,
              amountUnits: originalRequest?.destination?.amountUnits || record.amount.toString(),
              tokenSymbol: record.metadata?.preferred_token || '',
              tokenAddress: originalRequest?.destination?.tokenAddress || '',
            }
          : null,
      destination: {
        destinationAddress:
          withdrawalDestination?.address || originalRequest?.destination?.destinationAddress || '',
        txHash: record.withdrawal_tx_hash || null,
        chainId:
          withdrawalDestination?.chainId ||
          originalRequest?.destination?.chainId ||
          record.chain_id,
        amountUnits: originalRequest?.destination?.amountUnits || record.amount.toString(),
        tokenSymbol:
          withdrawalDestination?.tokenSymbol ||
          originalRequest?.destination?.tokenSymbol ||
          record.metadata?.preferred_token ||
          '',
        tokenAddress:
          withdrawalDestination?.tokenAddress || originalRequest?.destination?.tokenAddress || '',
      },
      externalId: record.external_id,
      metadata: {
        ...safeMetadataSpread(record.metadata),
        provider: record.provider_name,
        preferred_chain: record.metadata?.preferred_chain || record.chain_id,
        preferred_token: record.metadata?.preferred_token,
        withdrawal_destination: withdrawalDestination,
        withdraw_id: record.withdraw_id,
        withdrawal_tx_hash: record.withdrawal_tx_hash,
        source_address: record.source_address,
        source_tx_hash: record.source_tx_hash,
        // Deposit expiration for Base chain payments
        deposit_expiration: record.metadata?.deposit_expiration,
      },
    };
  }

  isPaymentStale(record: PaymentRecord, staleMinutes: number = 15): boolean {
    const staleTime = new Date();
    staleTime.setMinutes(staleTime.getMinutes() - staleMinutes);
    const recordStatusTime = new Date(record.status_updated_at);

    // Original staleness logic: Payment is stale if:
    // 1. Status is 'payment_started' and older than threshold (active payments need fresh data)
    // 2. Status is 'payment_unpaid' and older than threshold (might have been paid)
    // 3. BUT completed/bounced/refunded payments are never stale (final states)

    if (
      record.status === 'payment_completed' ||
      record.status === 'payment_bounced' ||
      record.status === 'payment_refunded'
    ) {
      return false; // Final states are never stale
    }

    // For active or unpaid payments, check if older than threshold
    return recordStatusTime < staleTime;
  }
}
