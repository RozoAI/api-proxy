// Payment Database for Edge Functions
// Handles all database operations with Supabase integration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { PaymentRequest, PaymentResponse, PaymentRecord } from './types.ts';

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
    const amount = parseFloat(paymentRequest.destination.amountUnits);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const paymentData = {
      amount: amount, // Use parsed amount to ensure it's a number
      currency: paymentRequest.display.currency,
      status: paymentResponse.status,
      external_id: paymentResponse.id,
      provider_name: providerName,
      chain_id: paymentRequest.destination.chainId,
      provider_response: paymentResponse,
      metadata: paymentRequest.metadata || null,
      original_request: paymentRequest,
      app_id: paymentRequest.appId || null, // Add appId to database
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

    return data;
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabase.from('payments').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Record not found
      }
      console.error('[Database] Error getting payment by ID:', error);
      throw new Error(`Failed to get payment: ${error.message}`);
    }

    return data;
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

  async getPaymentsByAppId(appId: string): Promise<PaymentRecord[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Database] Error getting payments by app ID:', error);
      throw new Error(`Failed to get payments: ${error.message}`);
    }

    return data || [];
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
    return {
      id: record.external_id || record.id,
      status: record.status as any,
      createdAt: Math.floor(new Date(record.created_at).getTime() / 1000).toString(),
      display: record.original_request.display,
      source: null,
      destination: record.original_request.destination,
      externalId: record.external_id,
      metadata: record.metadata || null,
      appId: record.app_id || undefined, // Include appId in response
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
