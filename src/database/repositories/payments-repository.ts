/**
 * Payments Repository
 * Data access layer for payment operations
 */

import { BaseRepository } from './base-repository';
import { PaymentRequest, PaymentResponse } from '../../types/payment';

// Database payment record interface
export interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  status: string;
  externalId?: string;
  providerName: string;
  chainId: string;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
  providerResponse?: any;
  metadata?: any;
  originalRequest: any;
}

export class PaymentsRepository extends BaseRepository {
  
  /**
   * Create a new payment record
   */
  async createPayment(
    paymentRequest: PaymentRequest,
    paymentResponse: PaymentResponse,
    providerName: string
  ): Promise<PaymentRecord> {
    const id = this.generateId();
    const now = new Date();
    
    const query = `
      INSERT INTO payments (
        id, amount, currency, status, external_id, provider_name, chain_id,
        created_at, updated_at, status_updated_at, provider_response, metadata, original_request
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id,
      paymentRequest.destination.amountUnits,
      paymentRequest.display.currency,
      paymentResponse.status,
      paymentRequest.externalId || null,
      providerName,
      paymentRequest.destination.chainId,
      now,
      now,
      now,
      JSON.stringify(paymentResponse),
      paymentRequest.metadata ? JSON.stringify(paymentRequest.metadata) : null,
      JSON.stringify(paymentRequest)
    ];
    
    await this.execute(query, params);
    
    // Return the created record
    return await this.getPaymentById(id) as PaymentRecord;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const query = `
      SELECT id, amount, currency, status, external_id as externalId, provider_name as providerName,
             chain_id as chainId, created_at as createdAt, updated_at as updatedAt,
             status_updated_at as statusUpdatedAt, provider_response as providerResponse,
             metadata, original_request as originalRequest
      FROM payments 
      WHERE id = ?
    `;
    
    const result = await this.executeOne<PaymentRecord>(query, [id]);
    
    if (result) {
      // Parse JSON fields
      if (result.providerResponse) {
        result.providerResponse = JSON.parse(result.providerResponse as string);
      }
      if (result.metadata) {
        result.metadata = JSON.parse(result.metadata as string);
      }
      if (result.originalRequest) {
        result.originalRequest = JSON.parse(result.originalRequest as string);
      }
    }
    
    return result;
  }

  /**
   * Get payment by external ID
   */
  async getPaymentByExternalId(externalId: string): Promise<PaymentRecord | null> {
    const query = `
      SELECT id, amount, currency, status, external_id as externalId, provider_name as providerName,
             chain_id as chainId, created_at as createdAt, updated_at as updatedAt,
             status_updated_at as statusUpdatedAt, provider_response as providerResponse,
             metadata, original_request as originalRequest
      FROM payments 
      WHERE external_id = ?
    `;
    
    const result = await this.executeOne<PaymentRecord>(query, [externalId]);
    
    if (result) {
      // Parse JSON fields
      if (result.providerResponse) {
        result.providerResponse = JSON.parse(result.providerResponse as string);
      }
      if (result.metadata) {
        result.metadata = JSON.parse(result.metadata as string);
      }
      if (result.originalRequest) {
        result.originalRequest = JSON.parse(result.originalRequest as string);
      }
    }
    
    return result;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    status: string,
    providerResponse: PaymentResponse
  ): Promise<boolean> {
    const query = `
      UPDATE payments 
      SET status = ?, provider_response = ?, status_updated_at = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const now = new Date();
    const params = [
      status,
      JSON.stringify(providerResponse),
      now,
      now,
      id
    ];
    
    const [result] = await this.execute(query, params);
    return (result as any).affectedRows > 0;
  }

  /**
   * Get payments by status, optionally filtering by age
   */
  async getPaymentsByStatus(
    status: string,
    olderThanMinutes?: number
  ): Promise<PaymentRecord[]> {
    let query = `
      SELECT id, amount, currency, status, external_id as externalId, provider_name as providerName,
             chain_id as chainId, created_at as createdAt, updated_at as updatedAt,
             status_updated_at as statusUpdatedAt, provider_response as providerResponse,
             metadata, original_request as originalRequest
      FROM payments 
      WHERE status = ?
    `;
    
    const params: any[] = [status];
    
    if (olderThanMinutes) {
      query += ` AND status_updated_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`;
      params.push(olderThanMinutes);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const [rows] = await this.execute<PaymentRecord>(query, params);
    
    // Parse JSON fields for each row
    return rows.map(row => {
      if (row.providerResponse) {
        row.providerResponse = JSON.parse(row.providerResponse as string);
      }
      if (row.metadata) {
        row.metadata = JSON.parse(row.metadata as string);
      }
      if (row.originalRequest) {
        row.originalRequest = JSON.parse(row.originalRequest as string);
      }
      return row;
    });
  }

  /**
   * Convert database record to PaymentResponse format
   */
  convertToPaymentResponse(record: PaymentRecord): PaymentResponse {
    return record.providerResponse || {
      id: record.id,
      status: record.status,
      createdAt: Math.floor(record.createdAt.getTime() / 1000).toString(),
      display: record.originalRequest.display,
      source: null,
      destination: record.originalRequest.destination,
      externalId: record.externalId || null,
      metadata: record.metadata || null,
      url: null
    };
  }

  /**
   * Check if payment is stale (status is 'started' and older than specified minutes)
   */
  isPaymentStale(record: PaymentRecord, staleMinutes: number = 15): boolean {
    if (record.status !== 'payment_started') {
      return false;
    }
    
    const staleTime = new Date();
    staleTime.setMinutes(staleTime.getMinutes() - staleMinutes);
    
    return record.statusUpdatedAt < staleTime;
  }
} 