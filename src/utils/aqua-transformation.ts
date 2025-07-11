/**
 * Aqua Data Transformation Utilities
 * Transform between Daimo format and Aqua invoice format
 */

import { PaymentRequest, PaymentResponse, PaymentStatus } from '../types/payment';
import { AquaInvoiceRequest, AquaInvoiceResponse } from '../providers/aqua-api-client';
import { CHAIN_IDS } from '../config/chains';

/**
 * Transform Daimo PaymentRequest to Aqua invoice format
 */
export function transformDaimoToAquaRequest(
  paymentRequest: PaymentRequest,
  webhookToken?: string
): AquaInvoiceRequest {
  console.log('[AquaTransformation] Transforming Daimo request to Aqua format');

  // Extract Stellar-specific data
  const chainId = parseInt(paymentRequest.destination.chainId);
  const amountUnits = parseFloat(paymentRequest.destination.amountUnits);
  
  // Convert microunits to regular units (Aqua expects regular amounts)
  const amount = amountUnits / 1000000;

  // Map token symbol to Aqua token ID
  const tokenId = mapTokenSymbolToAquaTokenId(paymentRequest.destination.tokenSymbol);

  // Create callback URL with webhook token if provided
  const callbackUrl = webhookToken 
    ? `${process.env.BASE_URL || 'http://localhost:3000'}/webhooks/aqua?token=${webhookToken}`
    : undefined;

  const aquaRequest: AquaInvoiceRequest = {
    mode: 'default', // Default mode as per plan
    amount: amount,
    address: paymentRequest.destination.destinationAddress,
    token_id: tokenId,
    metadata: {
      daimo_external_id: paymentRequest.externalId,
      daimo_intent: paymentRequest.display.intent,
      daimo_currency: paymentRequest.display.currency,
      original_metadata: paymentRequest.metadata
    },
    callback_url: callbackUrl
  };

  console.log('[AquaTransformation] Transformed to Aqua format:', {
    amount: aquaRequest.amount,
    token_id: aquaRequest.token_id,
    address: aquaRequest.address
  });

  return aquaRequest;
}

/**
 * Transform Aqua invoice response to Daimo PaymentResponse format
 */
export function transformAquaResponseToDaimo(
  aquaResponse: AquaInvoiceResponse,
  originalRequest?: PaymentRequest
): PaymentResponse {
  console.log('[AquaTransformation] Transforming Aqua response to Daimo format');

  // Map Aqua status to Daimo status
  const daimoStatus = mapAquaStatusToDaimo(aquaResponse.status);

  // Convert regular amount back to microunits
  const amountUnits = (aquaResponse.amount * 1000000).toString();

  // Map Aqua token ID back to token symbol
  const tokenSymbol = mapAquaTokenIdToTokenSymbol(aquaResponse.token_id);

  // Extract original request data if available
  const originalMetadata = aquaResponse.metadata?.original_metadata;
  const daimoExternalId = aquaResponse.metadata?.daimo_external_id;
  const daimoIntent = aquaResponse.metadata?.daimo_intent || `Aqua Invoice ${aquaResponse.invoice_id}`;
  const daimoCurrency = aquaResponse.metadata?.daimo_currency || 'USD';

  const daimoResponse: PaymentResponse = {
    id: aquaResponse.invoice_id,
    status: daimoStatus,
    createdAt: new Date(aquaResponse.created_at).getTime().toString(),
    display: {
      intent: daimoIntent,
      paymentValue: aquaResponse.amount.toString(),
      currency: daimoCurrency
    },
    source: null, // Will be populated when payment is completed
    destination: {
      destinationAddress: aquaResponse.address,
      txHash: aquaResponse.transaction_hash || null,
      chainId: CHAIN_IDS.STELLAR.toString(), // Stellar chain ID
      amountUnits: amountUnits,
      tokenSymbol: tokenSymbol,
      tokenAddress: '' // Not used for Stellar/Aqua chains
    },
    externalId: daimoExternalId || null,
    metadata: {
      aqua_invoice_id: aquaResponse.invoice_id,
      aqua_mode: aquaResponse.mode,
      aqua_status: aquaResponse.status,
      aqua_status_updated_at: aquaResponse.status_updated_at_t,
      aqua_token_id: aquaResponse.token_id,
      aqua_callback_url: aquaResponse.callback_url,
      aqua_cover_percent: aquaResponse.cover_percent,
      aqua_cover_amount: aquaResponse.cover_amount,
      aqua_cover_operator: aquaResponse.cover_operator,
      original_metadata: originalMetadata
    },
    url: aquaResponse.callback_url
  };

  console.log('[AquaTransformation] Transformed to Daimo format:', {
    id: daimoResponse.id,
    status: daimoResponse.status,
    chainId: daimoResponse.destination.chainId
  });

  return daimoResponse;
}

/**
 * Map Daimo token symbol to Aqua token ID
 */
function mapTokenSymbolToAquaTokenId(tokenSymbol?: string): string {
  if (!tokenSymbol) {
    return 'xlm'; // Default to XLM
  }

  switch (tokenSymbol.toUpperCase()) {
    case 'XLM':
      return 'xlm';
    case 'USDC_XLM':
    case 'USDC':
      return 'usdc';
    default:
      console.warn(`[AquaTransformation] Unknown token symbol: ${tokenSymbol}, defaulting to XLM`);
      return 'xlm';
  }
}

/**
 * Map Aqua token ID to Daimo token symbol
 */
function mapAquaTokenIdToTokenSymbol(tokenId: string): string {
  switch (tokenId.toLowerCase()) {
    case 'xlm':
    case 'stellar':
      return 'XLM';
    case 'usdc':
    case 'usdc_xlm':
      return 'USDC_XLM';
    default:
      console.warn(`[AquaTransformation] Unknown Aqua token ID: ${tokenId}, defaulting to XLM`);
      return 'XLM';
  }
}

/**
 * Map Aqua status values to Daimo status values
 */
function mapAquaStatusToDaimo(aquaStatus: string): PaymentStatus {
  switch (aquaStatus) {
    case 'created':
      return 'payment_unpaid';
    case 'paid':
      return 'payment_completed';
    case 'failed':
      return 'payment_bounced';
    case 'retry':
      return 'payment_started';
    case 'deleted':
      return 'payment_bounced';
    default:
      console.warn(`[AquaTransformation] Unknown Aqua status: ${aquaStatus}, defaulting to payment_unpaid`);
      return 'payment_unpaid';
  }
}

/**
 * Map Daimo status values to Aqua status values (for reverse transformation)
 */
export function mapDaimoStatusToAqua(daimoStatus: PaymentStatus): string {
  switch (daimoStatus) {
    case 'payment_unpaid':
      return 'created';
    case 'payment_completed':
      return 'paid';
    case 'payment_bounced':
      return 'failed';
    case 'payment_started':
      return 'retry';
    default:
      console.warn(`[AquaTransformation] Unknown Daimo status: ${daimoStatus}, defaulting to created`);
      return 'created';
  }
}

/**
 * Validate Stellar address format
 */
export function validateStellarAddress(address: string): boolean {
  // Stellar addresses are 56 characters long and start with 'G'
  const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
  return stellarAddressRegex.test(address);
}

/**
 * Validate Stellar amount (must be positive and within reasonable limits)
 */
export function validateStellarAmount(amountUnits: string): boolean {
  try {
    const amount = parseFloat(amountUnits);
    
    // Must be positive
    if (amount <= 0) {
      return false;
    }

    // Convert to regular units and check reasonable limits
    const regularAmount = amount / 1000000;
    
    // Minimum: 0.0000001 (1 stroop)
    // Maximum: 922,337,203,685.4775807 (max int64 stroops)
    return regularAmount >= 0.0000001 && regularAmount <= 922337203685.4775807;
    
  } catch (error) {
    return false;
  }
}

/**
 * Validate Stellar token symbol for supported tokens
 */
export function validateStellarToken(tokenSymbol: string): boolean {
  const supportedTokens = ['XLM', 'USDC_XLM', 'USDC'];
  return supportedTokens.includes(tokenSymbol.toUpperCase());
} 