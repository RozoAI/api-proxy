/**
 * Request/Response Transformation Utilities
 * Ensures all providers maintain Daimo Pay format
 */

import {
  PaymentRequest,
  PaymentResponse,
  PaymentSource,
  PaymentResponseDestination,
  isAquaChain,
  isDaimoChain,
} from '../types/payment';

interface RequestInput {
  display?: {
    intent?: string;
    paymentValue?: string;
    currency?: string;
  };
  destination?: {
    destinationAddress?: string;
    chainId?: string;
    amountUnits?: string;
    tokenSymbol?: string;
    tokenAddress?: string;
  };
  externalId?: string;
  metadata?: Record<string, unknown>;
}

interface ResponseInput {
  id?: string;
  status?: string;
  createdAt?: string;
  display?: {
    intent?: string;
    paymentValue?: string;
    currency?: string;
  };
  source?: unknown;
  destination?: unknown;
  externalId?: string;
  metadata?: unknown;
  url?: string;
}

export class RequestResponseTransformer {
  /**
   * Validate and sanitize incoming request to match Daimo Pay format
   */
  static validateAndSanitizeRequest(request: unknown): PaymentRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request: must be an object');
    }

    const req = request as RequestInput;
    const chainId = this.sanitizeString(req.destination?.chainId, '');
    const isAqua = isAquaChain(chainId);
    const isDaimo = isDaimoChain(chainId);

    // Create base destination
    const baseDestination = {
      destinationAddress: this.sanitizeString(req.destination?.destinationAddress, ''),
      chainId: chainId,
      amountUnits: this.sanitizeString(req.destination?.amountUnits, '0.00'),
    };

    // Create destination based on chain type
    let destination;
    if (isAqua) {
      destination = {
        ...baseDestination,
        tokenSymbol: this.sanitizeString(req.destination?.tokenSymbol, ''),
        tokenAddress: req.destination?.tokenAddress
          ? this.sanitizeString(req.destination?.tokenAddress, '')
          : undefined,
      };
    } else if (isDaimo) {
      destination = {
        ...baseDestination,
        tokenAddress: this.sanitizeString(req.destination?.tokenAddress, ''),
        tokenSymbol: req.destination?.tokenSymbol
          ? this.sanitizeString(req.destination?.tokenSymbol, '')
          : undefined,
      };
    } else {
      // Default to Daimo format for unknown chains
      destination = {
        ...baseDestination,
        tokenAddress: this.sanitizeString(req.destination?.tokenAddress, ''),
        tokenSymbol: req.destination?.tokenSymbol
          ? this.sanitizeString(req.destination?.tokenSymbol, '')
          : undefined,
      };
    }

    const sanitized: PaymentRequest = {
      display: {
        intent: this.sanitizeString(req.display?.intent, 'Payment'),
        paymentValue: this.sanitizeString(req.display?.paymentValue, '0.00'),
        currency: this.sanitizeString(req.display?.currency, 'USD'),
      },
      destination: destination,
    };

    // Add optional fields if present
    if (req.externalId) {
      sanitized.externalId = this.sanitizeString(req.externalId, '');
    }

    if (req.metadata && typeof req.metadata === 'object') {
      sanitized.metadata = this.sanitizeMetadata(req.metadata);
    }

    return sanitized;
  }

  /**
   * Transform provider response to match Daimo Pay format exactly
   */
  static transformToDaimoFormat(providerResponse: unknown, providerName: string): PaymentResponse {
    if (!providerResponse || typeof providerResponse !== 'object') {
      throw new Error('Invalid provider response: must be an object');
    }

    const response = providerResponse as ResponseInput;

    // Ensure all required fields are present
    const transformed: PaymentResponse = {
      id: this.sanitizeString(response.id, ''),
      status: this.sanitizePaymentStatus(response.status),
      createdAt: this.sanitizeString(response.createdAt, Math.floor(Date.now() / 1000).toString()),
      display: {
        intent: this.sanitizeString(response.display?.intent, 'Payment'),
        paymentValue: this.sanitizeString(response.display?.paymentValue, '0.00'),
        currency: this.sanitizeString(response.display?.currency, 'USD'),
      },
      source: this.transformPaymentSource(response.source),
      destination: this.transformPaymentDestination(response.destination),
      externalId: response.externalId ? this.sanitizeString(response.externalId, '') : undefined,
      metadata: response.metadata ? this.sanitizeMetadata(response.metadata) : undefined,
      url: response.url ? this.sanitizeString(response.url, '') : undefined,
    };

    // Log transformation for debugging
    console.log(`[Transformer] Transformed ${providerName} response to Daimo format`);

    return transformed;
  }

  /**
   * Transform payment source with proper type checking
   */
  static transformPaymentSource(source: unknown): PaymentSource | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const s = source as Record<string, unknown>;
    return {
      payerAddress: this.sanitizeString(s.payerAddress, ''),
      txHash: this.sanitizeString(s.txHash, ''),
      chainId: this.sanitizeString(s.chainId, ''),
      amountUnits: this.sanitizeString(s.amountUnits, '0.00'),
      tokenSymbol: this.sanitizeString(s.tokenSymbol, ''),
      tokenAddress: this.sanitizeString(s.tokenAddress, ''),
    };
  }

  /**
   * Transform payment destination with proper type checking
   */
  static transformPaymentDestination(destination: unknown): PaymentResponseDestination {
    if (!destination || typeof destination !== 'object') {
      return {
        destinationAddress: '',
        txHash: null,
        chainId: '',
        amountUnits: '0.00',
        tokenSymbol: '',
        tokenAddress: '',
      };
    }

    const d = destination as Record<string, unknown>;
    return {
      destinationAddress: this.sanitizeString(d.destinationAddress, ''),
      txHash: d.txHash ? this.sanitizeString(d.txHash, '') : null,
      chainId: this.sanitizeString(d.chainId, ''),
      amountUnits: this.sanitizeString(d.amountUnits, '0.00'),
      tokenSymbol: this.sanitizeString(d.tokenSymbol, ''),
      tokenAddress: this.sanitizeString(d.tokenAddress, ''),
    };
  }

  /**
   * Sanitize payment status
   */
  private static sanitizePaymentStatus(
    status: unknown
  ): 'payment_unpaid' | 'payment_started' | 'payment_completed' | 'payment_bounced' {
    const validStatuses = [
      'payment_unpaid',
      'payment_started',
      'payment_completed',
      'payment_bounced',
    ];
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
  private static sanitizeString(value: unknown, defaultValue: string): string {
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
  private static sanitizeMetadata(metadata: unknown): Record<string, any> {
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
  static validateRequestStructure(request: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request || typeof request !== 'object') {
      errors.push('Request must be an object');
      return { isValid: false, errors };
    }

    const req = request as RequestInput;

    // Check display object
    if (!req.display) {
      errors.push('Display object is required');
    } else {
      if (typeof req.display !== 'object') {
        errors.push('Display must be an object');
      } else {
        if (!req.display.intent) errors.push('Display intent is required');
        if (!req.display.paymentValue) errors.push('Display paymentValue is required');
        if (!req.display.currency) errors.push('Display currency is required');
      }
    }

    // Check destination object
    if (!req.destination) {
      errors.push('Destination object is required');
    } else {
      if (typeof req.destination !== 'object') {
        errors.push('Destination must be an object');
      } else {
        if (!req.destination.destinationAddress) errors.push('Destination address is required');
        if (!req.destination.chainId) errors.push('Chain ID is required');
        if (!req.destination.amountUnits) errors.push('Amount units is required');

        // Validate token fields based on chain type
        const chainId = req.destination.chainId || '';
        const isAqua = isAquaChain(chainId);
        const isDaimo = isDaimoChain(chainId);

        if (isAqua) {
          // For Aqua chains, tokenSymbol is required, tokenAddress is optional
          if (!req.destination.tokenSymbol) errors.push('Token symbol is required for Aqua chains');
        } else if (isDaimo) {
          // For Daimo chains, tokenAddress is required, tokenSymbol is optional
          if (!req.destination.tokenAddress)
            errors.push('Token address is required for Daimo chains');
        } else {
          // For unknown chains, require both for safety
          if (!req.destination.tokenSymbol) errors.push('Token symbol is required');
          if (!req.destination.tokenAddress) errors.push('Token address is required');
        }
      }
    }

    // Check externalId if present
    if (req.externalId !== undefined && typeof req.externalId !== 'string') {
      errors.push('External ID must be a string');
    }

    // Check metadata if present
    if (req.metadata !== undefined && typeof req.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: unknown, providerName?: string): unknown {
    const details: Record<string, unknown> = {
      provider: providerName || 'unknown',
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.name : 'UnknownError',
    };

    // Add provider-specific error details if available
    if (error instanceof Error && 'statusCode' in error) {
      details.statusCode = (error as any).statusCode;
    }

    if (error instanceof Error && 'responseData' in error) {
      details.responseData = (error as any).responseData;
    }

    const errorResponse = {
      error: 'Payment processing failed',
      message: 'An error occurred while processing the payment',
      details,
    };

    // Log the error for debugging
    console.error(
      `[Transformer] Error response created for ${providerName || 'unknown'} provider:`,
      error
    );

    return errorResponse;
  }
}
