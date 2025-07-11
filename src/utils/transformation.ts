/**
 * Request/Response Transformation Utilities
 * Ensures all providers maintain Daimo Pay format
 */

import { PaymentRequest, PaymentResponse, PaymentSource, PaymentResponseDestination, isAquaChain, isDaimoChain } from '../types/payment';

export class RequestResponseTransformer {
  /**
   * Validate and sanitize incoming request to match Daimo Pay format
   */
  static validateAndSanitizeRequest(request: any): PaymentRequest {
    const chainId = this.sanitizeString(request.destination?.chainId, '');
    const isAqua = isAquaChain(chainId);
    const isDaimo = isDaimoChain(chainId);

    // Create base destination
    const baseDestination = {
      destinationAddress: this.sanitizeString(request.destination?.destinationAddress, ''),
      chainId: chainId,
      amountUnits: this.sanitizeString(request.destination?.amountUnits, '0.00')
    };

    // Create destination based on chain type
    let destination;
    if (isAqua) {
      destination = {
        ...baseDestination,
        tokenSymbol: this.sanitizeString(request.destination?.tokenSymbol, ''),
        tokenAddress: request.destination?.tokenAddress ? this.sanitizeString(request.destination?.tokenAddress, '') : undefined
      };
    } else if (isDaimo) {
      destination = {
        ...baseDestination,
        tokenAddress: this.sanitizeString(request.destination?.tokenAddress, ''),
        tokenSymbol: request.destination?.tokenSymbol ? this.sanitizeString(request.destination?.tokenSymbol, '') : undefined
      };
    } else {
      // Default to Daimo format for unknown chains
      destination = {
        ...baseDestination,
        tokenAddress: this.sanitizeString(request.destination?.tokenAddress, ''),
        tokenSymbol: request.destination?.tokenSymbol ? this.sanitizeString(request.destination?.tokenSymbol, '') : undefined
      };
    }

    const sanitized: PaymentRequest = {
      display: {
        intent: this.sanitizeString(request.display?.intent, 'Payment'),
        paymentValue: this.sanitizeString(request.display?.paymentValue, '0.00'),
        currency: this.sanitizeString(request.display?.currency, 'USD')
      },
      destination: destination
    };

    // Add optional fields if present
    if (request.externalId) {
      sanitized.externalId = this.sanitizeString(request.externalId, '');
    }

    if (request.metadata && typeof request.metadata === 'object') {
      sanitized.metadata = this.sanitizeMetadata(request.metadata);
    }

    return sanitized;
  }

  /**
   * Transform provider response to match Daimo Pay format exactly
   */
  static transformToDaimoFormat(providerResponse: any, providerName: string): PaymentResponse {
    // Ensure all required fields are present
    const transformed: PaymentResponse = {
      id: this.sanitizeString(providerResponse.id, ''),
      status: this.sanitizePaymentStatus(providerResponse.status),
      createdAt: this.sanitizeString(providerResponse.createdAt, Math.floor(Date.now() / 1000).toString()),
      display: {
        intent: this.sanitizeString(providerResponse.display?.intent, 'Payment'),
        paymentValue: this.sanitizeString(providerResponse.display?.paymentValue, '0.00'),
        currency: this.sanitizeString(providerResponse.display?.currency, 'USD')
      },
      source: this.transformPaymentSource(providerResponse.source),
      destination: this.transformPaymentDestination(providerResponse.destination),
      externalId: providerResponse.externalId ? this.sanitizeString(providerResponse.externalId, '') : undefined,
      metadata: providerResponse.metadata ? this.sanitizeMetadata(providerResponse.metadata) : undefined,
      url: providerResponse.url ? this.sanitizeString(providerResponse.url, '') : undefined
    };

    // Log transformation for debugging
    console.log(`[Transformer] Transformed ${providerName} response to Daimo format`);

    return transformed;
  }

  /**
   * Transform payment source data
   */
  private static transformPaymentSource(source: any): PaymentSource | null {
    if (!source) return null;

    return {
      payerAddress: this.sanitizeString(source.payerAddress, ''),
      txHash: this.sanitizeString(source.txHash, ''),
      chainId: this.sanitizeString(source.chainId, ''),
      amountUnits: this.sanitizeString(source.amountUnits, '0.00'),
      tokenSymbol: this.sanitizeString(source.tokenSymbol, ''),
      tokenAddress: this.sanitizeString(source.tokenAddress, '')
    };
  }

  /**
   * Transform payment destination data
   */
  private static transformPaymentDestination(destination: any): PaymentResponseDestination {
    if (!destination) {
      throw new Error('Payment destination is required');
    }

    return {
      destinationAddress: this.sanitizeString(destination.destinationAddress, ''),
      txHash: destination.txHash ? this.sanitizeString(destination.txHash, '') : null,
      chainId: this.sanitizeString(destination.chainId, ''),
      amountUnits: this.sanitizeString(destination.amountUnits, '0.00'),
      tokenSymbol: this.sanitizeString(destination.tokenSymbol, ''),
      tokenAddress: this.sanitizeString(destination.tokenAddress, '')
    };
  }

  /**
   * Sanitize payment status
   */
  private static sanitizePaymentStatus(status: any): 'payment_unpaid' | 'payment_started' | 'payment_completed' | 'payment_bounced' {
    const validStatuses = ['payment_unpaid', 'payment_started', 'payment_completed', 'payment_bounced'];
    const sanitizedStatus = this.sanitizeString(status, 'payment_unpaid');
    
    if (validStatuses.includes(sanitizedStatus)) {
      return sanitizedStatus as any;
    }
    
    console.warn(`[Transformer] Invalid payment status: ${status}, defaulting to payment_unpaid`);
    return 'payment_unpaid';
  }

  /**
   * Sanitize string values
   */
  private static sanitizeString(value: any, defaultValue: string): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return defaultValue;
  }

  /**
   * Sanitize metadata object
   */
  private static sanitizeMetadata(metadata: any): Record<string, any> {
    if (typeof metadata !== 'object' || metadata === null) {
      return {};
    }

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof key === 'string' && key.trim()) {
        // Sanitize the key
        const sanitizedKey = key.trim();
        
        // Sanitize the value based on type
        if (typeof value === 'string') {
          sanitized[sanitizedKey] = value.trim();
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[sanitizedKey] = value;
        } else if (value === null) {
          sanitized[sanitizedKey] = null;
        } else if (typeof value === 'object') {
          sanitized[sanitizedKey] = this.sanitizeMetadata(value);
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate request structure against Daimo Pay schema
   */
  static validateRequestStructure(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required top-level fields
    if (!request) {
      errors.push('Request body is required');
      return { isValid: false, errors };
    }

    if (typeof request !== 'object') {
      errors.push('Request body must be an object');
      return { isValid: false, errors };
    }

    // Check display object
    if (!request.display) {
      errors.push('Display object is required');
    } else {
      if (typeof request.display !== 'object') {
        errors.push('Display must be an object');
      } else {
        if (!request.display.intent) errors.push('Display intent is required');
        if (!request.display.paymentValue) errors.push('Display paymentValue is required');
        if (!request.display.currency) errors.push('Display currency is required');
      }
    }

    // Check destination object
    if (!request.destination) {
      errors.push('Destination object is required');
    } else {
      if (typeof request.destination !== 'object') {
        errors.push('Destination must be an object');
      } else {
        if (!request.destination.destinationAddress) errors.push('Destination address is required');
        if (!request.destination.chainId) errors.push('Chain ID is required');
        if (!request.destination.amountUnits) errors.push('Amount units is required');
        
        // Validate token fields based on chain type
        const chainId = request.destination.chainId;
        const isAqua = isAquaChain(chainId);
        const isDaimo = isDaimoChain(chainId);
        
        if (isAqua) {
          // For Aqua chains, tokenSymbol is required, tokenAddress is optional
          if (!request.destination.tokenSymbol) errors.push('Token symbol is required for Aqua chains');
        } else if (isDaimo) {
          // For Daimo chains, tokenAddress is required, tokenSymbol is optional
          if (!request.destination.tokenAddress) errors.push('Token address is required for Daimo chains');
        } else {
          // For unknown chains, require both for safety
          if (!request.destination.tokenSymbol) errors.push('Token symbol is required');
          if (!request.destination.tokenAddress) errors.push('Token address is required');
        }
      }
    }

    // Check externalId if present
    if (request.externalId !== undefined && typeof request.externalId !== 'string') {
      errors.push('External ID must be a string');
    }

    // Check metadata if present
    if (request.metadata !== undefined && typeof request.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: any, providerName?: string): any {
    const details: any = {
      provider: providerName || 'unknown',
      timestamp: new Date().toISOString(),
      errorType: error.name || 'UnknownError'
    };

    // Add provider-specific error details if available
    if (error.statusCode) {
      details.statusCode = error.statusCode;
    }

    if (error.responseData) {
      details.responseData = error.responseData;
    }

    const errorResponse = {
      error: 'Payment processing failed',
      message: 'An error occurred while processing the payment',
      details
    };

    // Log the error for debugging
    console.error(`[Transformer] Error response created for ${providerName || 'unknown'} provider:`, error);

    return errorResponse;
  }
} 